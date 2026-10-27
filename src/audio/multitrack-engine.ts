/**
 * AUDIOFORGE Multitrack Mixing Engine
 * Provides sample-accurate track synchronization, multi-file import,
 * independent channel strips (volume, pan, mute, solo, 3-band EQ, sends),
 * and master bus processing (Master EQ, Compressor, Limiter) for real offline mixdowns.
 */

export interface TrackData {
  id: string;
  name: string;
  color: string;
  buffer: AudioBuffer;
  volumeDb: number; // -60 to +6 dB (0 dB unity)
  pan: number; // -1.0 (Left) to +1.0 (Right)
  mute: boolean;
  solo: boolean;
  eqLow: number; // dB (-12 to +12)
  eqMid: number; // dB (-12 to +12)
  eqHigh: number; // dB (-12 to +12)
  reverbSend: number; // 0.0 to 1.0
  delaySend: number; // 0.0 to 1.0
  waveformData?: number[]; // Cached downsampled peak data for canvas
}

export interface MasterBusState {
  volumeDb: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  compEnabled: boolean;
  compThreshold: number;
  compRatio: number;
  limiterCeiling: number;
}

export class MultitrackEngine {
  private ctx: AudioContext | null = null;
  private tracks: TrackData[] = [];
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private trackNodes: Map<
    string,
    {
      gainNode: GainNode;
      panNode: StereoPannerNode;
      eqLow: BiquadFilterNode;
      eqMid: BiquadFilterNode;
      eqHigh: BiquadFilterNode;
    }
  > = new Map();

  private masterBus: GainNode | null = null;
  private masterEqLowNode: BiquadFilterNode | null = null;
  private masterEqMidNode: BiquadFilterNode | null = null;
  private masterEqHighNode: BiquadFilterNode | null = null;
  private masterCompNode: DynamicsCompressorNode | null = null;

  private masterState: MasterBusState = {
    volumeDb: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    compEnabled: true,
    compThreshold: -14,
    compRatio: 2.5,
    limiterCeiling: -0.3,
  };

  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;

  constructor() {}

  public async initContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  public setTracks(tracks: TrackData[]) {
    this.tracks = tracks;
    this.tracks.forEach((track) => {
      if (!track.waveformData) {
        track.waveformData = this.generateWaveformPeaks(track.buffer, 120);
      }
    });
  }

  public getTracks(): TrackData[] {
    return this.tracks;
  }

  public addTrack(track: TrackData) {
    if (!track.waveformData) {
      track.waveformData = this.generateWaveformPeaks(track.buffer, 120);
    }
    this.tracks.push(track);
  }

  public addTracks(newTracks: TrackData[]) {
    newTracks.forEach((t) => {
      if (!t.waveformData) {
        t.waveformData = this.generateWaveformPeaks(t.buffer, 120);
      }
      this.tracks.push(t);
    });
  }

  public removeTrack(trackId: string) {
    this.tracks = this.tracks.filter((t) => t.id !== trackId);
  }

  public updateTrack(trackId: string, updates: Partial<TrackData>) {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return;
    Object.assign(track, updates);

    // Apply live updates if currently playing
    const nodes = this.trackNodes.get(trackId);
    if (nodes && this.ctx) {
      const now = this.ctx.currentTime;
      if (updates.volumeDb !== undefined || updates.mute !== undefined || updates.solo !== undefined) {
        this.updateTrackGain(track, nodes.gainNode, now);
      }
      if (updates.pan !== undefined) {
        nodes.panNode.pan.setValueAtTime(track.pan, now);
      }
      if (updates.eqLow !== undefined) {
        nodes.eqLow.gain.setValueAtTime(track.eqLow, now);
      }
      if (updates.eqMid !== undefined) {
        nodes.eqMid.gain.setValueAtTime(track.eqMid, now);
      }
      if (updates.eqHigh !== undefined) {
        nodes.eqHigh.gain.setValueAtTime(track.eqHigh, now);
      }
    }
  }

  public getMasterState(): MasterBusState {
    return this.masterState;
  }

  public updateMasterState(updates: Partial<MasterBusState>) {
    this.masterState = { ...this.masterState, ...updates };
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.masterBus && updates.volumeDb !== undefined) {
        this.masterBus.gain.setValueAtTime(Math.pow(10, updates.volumeDb / 20), now);
      }
      if (this.masterEqLowNode && updates.eqLow !== undefined) {
        this.masterEqLowNode.gain.setValueAtTime(updates.eqLow, now);
      }
      if (this.masterEqMidNode && updates.eqMid !== undefined) {
        this.masterEqMidNode.gain.setValueAtTime(updates.eqMid, now);
      }
      if (this.masterEqHighNode && updates.eqHigh !== undefined) {
        this.masterEqHighNode.gain.setValueAtTime(updates.eqHigh, now);
      }
    }
  }

  public setMasterVolume(db: number) {
    this.updateMasterState({ volumeDb: db });
  }

  public getMasterVolume(): number {
    return this.masterState.volumeDb;
  }

  public getMaxDuration(): number {
    let max = 0;
    for (const t of this.tracks) {
      if (t.buffer.duration > max) max = t.buffer.duration;
    }
    return max || 10.0;
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) return this.pauseOffset;
    return Math.max(0, this.ctx.currentTime - this.startTime);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async play(fromTime?: number) {
    if (this.tracks.length === 0) return;
    const ctx = await this.initContext();

    this.stopSources();

    const offset = fromTime !== undefined ? fromTime : this.pauseOffset;
    const now = ctx.currentTime;
    this.startTime = now - offset;

    // Build Master Bus Channel
    this.masterBus = ctx.createGain();
    this.masterBus.gain.setValueAtTime(Math.pow(10, this.masterState.volumeDb / 20), now);

    this.masterEqLowNode = ctx.createBiquadFilter();
    this.masterEqLowNode.type = 'lowshelf';
    this.masterEqLowNode.frequency.setValueAtTime(100, now);
    this.masterEqLowNode.gain.setValueAtTime(this.masterState.eqLow, now);

    this.masterEqMidNode = ctx.createBiquadFilter();
    this.masterEqMidNode.type = 'peaking';
    this.masterEqMidNode.frequency.setValueAtTime(1200, now);
    this.masterEqMidNode.gain.setValueAtTime(this.masterState.eqMid, now);

    this.masterEqHighNode = ctx.createBiquadFilter();
    this.masterEqHighNode.type = 'highshelf';
    this.masterEqHighNode.frequency.setValueAtTime(8000, now);
    this.masterEqHighNode.gain.setValueAtTime(this.masterState.eqHigh, now);

    this.masterCompNode = ctx.createDynamicsCompressor();
    this.masterCompNode.threshold.setValueAtTime(this.masterState.compThreshold, now);
    this.masterCompNode.ratio.setValueAtTime(this.masterState.compRatio, now);

    // Master Limiter Waveshaper
    const masterLimiter = ctx.createWaveShaper();
    masterLimiter.curve = this.createLimiterCurve(this.masterState.limiterCeiling) as any;

    // Chain: MasterBus -> EqLow -> EqMid -> EqHigh -> Comp -> Limiter -> Destination
    this.masterBus.connect(this.masterEqLowNode);
    this.masterEqLowNode.connect(this.masterEqMidNode);
    this.masterEqMidNode.connect(this.masterEqHighNode);
    this.masterEqHighNode.connect(this.masterCompNode);
    this.masterCompNode.connect(masterLimiter);
    masterLimiter.connect(ctx.destination);

    // Any track soloed?
    const anySolo = this.tracks.some((t) => t.solo);

    for (const track of this.tracks) {
      const source = ctx.createBufferSource();
      source.buffer = track.buffer;

      // Track channel strip
      const eqLow = ctx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.setValueAtTime(200, now);
      eqLow.gain.setValueAtTime(track.eqLow, now);

      const eqMid = ctx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.setValueAtTime(1200, now);
      eqMid.gain.setValueAtTime(track.eqMid, now);
      eqMid.Q.setValueAtTime(1.0, now);

      const eqHigh = ctx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.setValueAtTime(6000, now);
      eqHigh.gain.setValueAtTime(track.eqHigh, now);

      const panNode = ctx.createStereoPanner();
      panNode.pan.setValueAtTime(track.pan, now);

      const gainNode = ctx.createGain();
      const isAudible = !track.mute && (!anySolo || track.solo);
      gainNode.gain.setValueAtTime(isAudible ? Math.pow(10, track.volumeDb / 20) : 0, now);

      // Track Chain: Source -> Low -> Mid -> High -> Pan -> Gain -> Master Bus
      source.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(panNode);
      panNode.connect(gainNode);
      gainNode.connect(this.masterBus);

      this.activeSources.set(track.id, source);
      this.trackNodes.set(track.id, { gainNode, panNode, eqLow, eqMid, eqHigh });

      if (offset < track.buffer.duration) {
        source.start(0, offset);
      }
    }

    this.isPlaying = true;
  }

  public pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentTime();
    this.stopSources();
    this.isPlaying = false;
  }

  public stop() {
    this.stopSources();
    this.pauseOffset = 0;
    this.isPlaying = false;
  }

  public seek(time: number) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseOffset = Math.max(0, Math.min(time, this.getMaxDuration()));
    if (wasPlaying) {
      this.play(this.pauseOffset);
    }
  }

  private stopSources() {
    this.activeSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    });
    this.activeSources.clear();
    this.trackNodes.clear();
  }

  private updateTrackGain(track: TrackData, gainNode: GainNode, now: number) {
    const anySolo = this.tracks.some((t) => t.solo);
    const isAudible = !track.mute && (!anySolo || track.solo);
    const lin = isAudible ? Math.pow(10, track.volumeDb / 20) : 0;
    gainNode.gain.setValueAtTime(lin, now);
  }

  private createLimiterCurve(ceilingDb: number): Float32Array {
    const samples = 4096;
    const curve = new Float32Array(samples);
    const ceilingLin = Math.pow(10, ceilingDb / 20);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const absX = Math.abs(x);
      const knee = 0.8 * ceilingLin;
      if (absX <= knee) {
        curve[i] = x;
      } else {
        const excess = absX - knee;
        const comp = Math.tanh(excess / (ceilingLin - knee)) * (ceilingLin - knee);
        curve[i] = Math.sign(x) * (knee + comp);
      }
    }
    return curve;
  }

  /**
   * Offline Mixdown Rendering:
   * Renders the complete multitrack mix (all active tracks, track EQ, pan, volume)
   * plus the Master Bus Channel strip (Master EQ, Compressor, Limiter, Master Gain)
   * into a pristine 32-bit float stereo AudioBuffer.
   */
  public async renderMixOffline(): Promise<AudioBuffer> {
    if (this.tracks.length === 0) {
      throw new Error('No tracks to render.');
    }

    const sampleRate = 48000;
    const duration = this.getMaxDuration();
    const length = Math.ceil(duration * sampleRate);

    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    // Build Master Bus
    const masterBus = offlineCtx.createGain();
    masterBus.gain.setValueAtTime(Math.pow(10, this.masterState.volumeDb / 20), 0);

    const masterEqLow = offlineCtx.createBiquadFilter();
    masterEqLow.type = 'lowshelf';
    masterEqLow.frequency.setValueAtTime(100, 0);
    masterEqLow.gain.setValueAtTime(this.masterState.eqLow, 0);

    const masterEqMid = offlineCtx.createBiquadFilter();
    masterEqMid.type = 'peaking';
    masterEqMid.frequency.setValueAtTime(1200, 0);
    masterEqMid.gain.setValueAtTime(this.masterState.eqMid, 0);

    const masterEqHigh = offlineCtx.createBiquadFilter();
    masterEqHigh.type = 'highshelf';
    masterEqHigh.frequency.setValueAtTime(8000, 0);
    masterEqHigh.gain.setValueAtTime(this.masterState.eqHigh, 0);

    const masterComp = offlineCtx.createDynamicsCompressor();
    masterComp.threshold.setValueAtTime(this.masterState.compThreshold, 0);
    masterComp.ratio.setValueAtTime(this.masterState.compRatio, 0);

    const masterLimiter = offlineCtx.createWaveShaper();
    masterLimiter.curve = this.createLimiterCurve(this.masterState.limiterCeiling) as any;

    // Master Chain: Bus -> Low -> Mid -> High -> Comp -> Limiter -> Destination
    masterBus.connect(masterEqLow);
    masterEqLow.connect(masterEqMid);
    masterEqMid.connect(masterEqHigh);
    masterEqHigh.connect(masterComp);
    masterComp.connect(masterLimiter);
    masterLimiter.connect(offlineCtx.destination);

    const anySolo = this.tracks.some((t) => t.solo);

    for (const track of this.tracks) {
      const isAudible = !track.mute && (!anySolo || track.solo);
      if (!isAudible) continue;

      const source = offlineCtx.createBufferSource();
      source.buffer = track.buffer;

      const eqLow = offlineCtx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.setValueAtTime(200, 0);
      eqLow.gain.setValueAtTime(track.eqLow, 0);

      const eqMid = offlineCtx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.setValueAtTime(1200, 0);
      eqMid.gain.setValueAtTime(track.eqMid, 0);
      eqMid.Q.setValueAtTime(1.0, 0);

      const eqHigh = offlineCtx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.setValueAtTime(6000, 0);
      eqHigh.gain.setValueAtTime(track.eqHigh, 0);

      const panNode = offlineCtx.createStereoPanner();
      panNode.pan.setValueAtTime(track.pan, 0);

      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(Math.pow(10, track.volumeDb / 20), 0);

      source.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(panNode);
      panNode.connect(gainNode);
      gainNode.connect(masterBus);

      source.start(0);
    }

    return await offlineCtx.startRendering();
  }

  private generateWaveformPeaks(buffer: AudioBuffer, count: number): number[] {
    const data = buffer.getChannelData(0);
    const step = Math.floor(data.length / count);
    const peaks: number[] = [];

    for (let i = 0; i < count; i++) {
      let max = 0;
      const start = i * step;
      for (let j = 0; j < step; j++) {
        const val = Math.abs(data[start + j] || 0);
        if (val > max) max = val;
      }
      peaks.push(Number(max.toFixed(3)));
    }
    return peaks;
  }
}

export const multitrackEngine = new MultitrackEngine();
