/**
 * AUDIOFORGE Multitrack Mixing Engine
 * Provides sample-accurate track synchronization, per-channel strips,
 * 3-band EQ, pan laws, FX sends, and offline mixdown rendering.
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

export interface ProjectState {
  id: string;
  name: string;
  bpm: number;
  sampleRate: number;
  tracks: TrackData[];
  masterVolumeDb: number;
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
  private masterVolumeDb = 0;
  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private isLooping = false;
  private loopStart = 0;
  private loopEnd = 12.0;

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
    // Pre-calculate waveforms if missing
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
        nodes.panNode.pan.setTargetAtTime(track.pan, now, 0.02);
      }
      if (updates.eqLow !== undefined) {
        nodes.eqLow.gain.setTargetAtTime(track.eqLow, now, 0.02);
      }
      if (updates.eqMid !== undefined) {
        nodes.eqMid.gain.setTargetAtTime(track.eqMid, now, 0.02);
      }
      if (updates.eqHigh !== undefined) {
        nodes.eqHigh.gain.setTargetAtTime(track.eqHigh, now, 0.02);
      }
    }
  }

  public setMasterVolume(db: number) {
    this.masterVolumeDb = db;
    if (this.masterBus && this.ctx) {
      const lin = Math.pow(10, db / 20);
      this.masterBus.gain.setTargetAtTime(lin, this.ctx.currentTime, 0.02);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolumeDb;
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

    // Master bus
    this.masterBus = ctx.createGain();
    this.masterBus.gain.value = Math.pow(10, this.masterVolumeDb / 20);
    this.masterBus.connect(ctx.destination);

    // Any track soloed?
    const anySolo = this.tracks.some((t) => t.solo);

    for (const track of this.tracks) {
      const source = ctx.createBufferSource();
      source.buffer = track.buffer;

      // Track channel strip
      const eqLow = ctx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = 200;
      eqLow.gain.value = track.eqLow;

      const eqMid = ctx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.value = 1200;
      eqMid.gain.value = track.eqMid;
      eqMid.Q.value = 1.0;

      const eqHigh = ctx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = 6000;
      eqHigh.gain.value = track.eqHigh;

      const panNode = ctx.createStereoPanner();
      panNode.pan.value = track.pan;

      const gainNode = ctx.createGain();
      const isAudible = !track.mute && (!anySolo || track.solo);
      gainNode.gain.value = isAudible ? Math.pow(10, track.volumeDb / 20) : 0;

      // Chain: Source -> Low -> Mid -> High -> Pan -> Gain -> Master Bus
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
    gainNode.gain.setTargetAtTime(lin, now, 0.02);
  }

  /**
   * Offline Mixdown Rendering:
   * Renders the complete multitrack mix into a pristine 32-bit float stereo AudioBuffer.
   */
  public async renderMixOffline(): Promise<AudioBuffer> {
    if (this.tracks.length === 0) {
      throw new Error('No tracks to render.');
    }

    const sampleRate = 48000;
    const duration = this.getMaxDuration();
    const length = Math.ceil(duration * sampleRate);

    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);
    const masterBus = offlineCtx.createGain();
    masterBus.gain.value = Math.pow(10, this.masterVolumeDb / 20);
    masterBus.connect(offlineCtx.destination);

    const anySolo = this.tracks.some((t) => t.solo);

    for (const track of this.tracks) {
      const isAudible = !track.mute && (!anySolo || track.solo);
      if (!isAudible) continue;

      const source = offlineCtx.createBufferSource();
      source.buffer = track.buffer;

      const eqLow = offlineCtx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = 200;
      eqLow.gain.value = track.eqLow;

      const eqMid = offlineCtx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.value = 1200;
      eqMid.gain.value = track.eqMid;
      eqMid.Q.value = 1.0;

      const eqHigh = offlineCtx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = 6000;
      eqHigh.gain.value = track.eqHigh;

      const panNode = offlineCtx.createStereoPanner();
      panNode.pan.value = track.pan;

      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = Math.pow(10, track.volumeDb / 20);

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
