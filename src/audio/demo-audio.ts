/**
 * AUDIOFORGE Procedural Demo Generator
 * Generates high-quality stereo AudioBuffers for immediate offline testing of mastering and multitrack mixing.
 */

export interface DemoTrackItem {
  id: string;
  name: string;
  type: 'full' | 'drums' | 'bass' | 'guitar' | 'keys' | 'vocals';
  color: string;
  buffer: AudioBuffer;
}

export function generateDemoAudio(audioCtx: AudioContext): {
  fullMaster: AudioBuffer;
  stems: DemoTrackItem[];
} {
  const sampleRate = audioCtx.sampleRate;
  const duration = 12.0; // 12 seconds loop (approx 6 bars at 120 BPM)
  const numSamples = Math.floor(sampleRate * duration);
  const bpm = 120;
  const beatDuration = 60 / bpm; // 0.5s per beat
  const totalBeats = Math.floor(duration / beatDuration);

  // Helper to create empty stereo buffer
  const createBuffer = () => audioCtx.createBuffer(2, numSamples, sampleRate);

  const drumsBuf = createBuffer();
  const bassBuf = createBuffer();
  const guitarBuf = createBuffer();
  const keysBuf = createBuffer();
  const vocalsBuf = createBuffer();
  const fullBuf = createBuffer();

  const dL = drumsBuf.getChannelData(0);
  const dR = drumsBuf.getChannelData(1);

  const bL = bassBuf.getChannelData(0);
  const bR = bassBuf.getChannelData(1);

  const gL = guitarBuf.getChannelData(0);
  const gR = guitarBuf.getChannelData(1);

  const kL = keysBuf.getChannelData(0);
  const kR = keysBuf.getChannelData(1);

  const vL = vocalsBuf.getChannelData(0);
  const vR = vocalsBuf.getChannelData(1);

  // Synthesize Drums
  for (let beat = 0; beat < totalBeats; beat++) {
    const beatTime = beat * beatDuration;
    const beatIndex = Math.floor(beatTime * sampleRate);

    // Kick on beats 0, 2 (1 & 3 in 4/4) and occasional upbeat
    if (beat % 4 === 0 || beat % 4 === 2 || (beat % 4 === 3 && beat % 8 === 7)) {
      const kickLen = Math.floor(0.25 * sampleRate);
      for (let i = 0; i < kickLen && beatIndex + i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 22);
        const pitch = 130 * Math.exp(-t * 35) + 45;
        const s = Math.sin(2 * Math.PI * pitch * t) * env * 0.75;
        dL[beatIndex + i] += s;
        dR[beatIndex + i] += s;
      }
    }

    // Snare on beats 1, 3 (2 & 4 in 4/4)
    if (beat % 4 === 1 || beat % 4 === 3) {
      const snareLen = Math.floor(0.22 * sampleRate);
      for (let i = 0; i < snareLen && beatIndex + i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 18);
        const tone = Math.sin(2 * Math.PI * 185 * t) * 0.4;
        const noise = (Math.random() * 2 - 1) * 0.6;
        const s = (tone + noise) * env * 0.65;
        dL[beatIndex + i] += s * 0.95;
        dR[beatIndex + i] += s * 1.05;
      }
    }

    // Hi-hats on every 8th note
    for (let sub = 0; sub < 2; sub++) {
      const hhTime = beatTime + sub * (beatDuration / 2);
      const hhIndex = Math.floor(hhTime * sampleRate);
      const hhLen = Math.floor(0.06 * sampleRate);
      const vol = sub === 0 ? 0.22 : 0.14;
      for (let i = 0; i < hhLen && hhIndex + i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 60);
        const s = (Math.random() * 2 - 1) * env * vol;
        dL[hhIndex + i] += s * 0.8;
        dR[hhIndex + i] += s * 1.2; // Stereo spread
      }
    }
  }

  // Chords progression in Am: Am (bars 1-2), F (bars 3-4), C (bars 5-6), G (bars 7-8)
  const chordRoots = [55, 43.65, 65.4, 49]; // A1, F1, C2, G1 in Hz
  const chordFrequencies = [
    [220.0, 261.63, 329.63], // Am (A3, C4, E4)
    [174.61, 220.0, 261.63], // F (F3, A3, C4)
    [261.63, 329.63, 392.0], // C (C4, E4, G4)
    [196.0, 246.94, 293.66], // G (G3, B3, D4)
  ];

  // Synthesize Bass & Keys & Guitar
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const bar = Math.floor(t / (beatDuration * 4));
    const chordIdx = bar % chordRoots.length;
    const rootFreq = chordRoots[chordIdx];

    // Bass: 8th note rhythmic pulse
    const bassNotePos = (t % (beatDuration / 2)) / (beatDuration / 2);
    const bassEnv = Math.pow(Math.max(0, 1 - bassNotePos), 2.2);
    const bassFreq = rootFreq * (1 + 0.005 * Math.sin(t * 8));
    const bassSample = (Math.sin(2 * Math.PI * bassFreq * t) + 0.35 * Math.sin(4 * Math.PI * bassFreq * t)) * bassEnv * 0.45;
    bL[i] = bassSample;
    bR[i] = bassSample;

    // Keys / Synth Pad (Warm detuned saw/sine)
    const chord = chordFrequencies[chordIdx];
    let padSampleL = 0;
    let padSampleR = 0;
    for (let c = 0; c < chord.length; c++) {
      const f = chord[c];
      padSampleL += Math.sin(2 * Math.PI * f * t) * 0.07;
      padSampleR += Math.sin(2 * Math.PI * (f * 1.003) * t) * 0.07;
    }
    // Tremolo modulation
    const trem = 0.8 + 0.2 * Math.sin(2 * Math.PI * 3 * t);
    kL[i] = padSampleL * trem;
    kR[i] = padSampleR * trem;

    // Guitar: 16th-note strum accents
    const strumBeat = Math.floor(t / beatDuration);
    const strumFrac = (t % beatDuration) / beatDuration;
    if (strumFrac < 0.18 || (strumFrac > 0.5 && strumFrac < 0.68)) {
      const env = Math.exp(-strumFrac * 12);
      let gSample = 0;
      for (let c = 0; c < chord.length; c++) {
        gSample += (Math.sin(2 * Math.PI * chord[c] * 2 * t) + 0.2 * (Math.random() * 2 - 1)) * 0.06;
      }
      gL[i] = gSample * env * 1.1;
      gR[i] = gSample * env * 0.8;
    }

    // Vocals / Lead Synth Melody: Smooth lead line with vibrato
    const melodyNotes = [440, 523.25, 493.88, 392, 440, 659.25, 587.33, 523.25];
    const melStep = Math.floor((t * 2) % melodyNotes.length);
    const targetFreq = melodyNotes[melStep];
    const vibrato = 1 + 0.015 * Math.sin(2 * Math.PI * 5.5 * t);
    const vFreq = targetFreq * vibrato;
    const vEnv = 0.5 + 0.5 * Math.sin(Math.PI * ((t * 2) % 1));
    const lead = Math.sin(2 * Math.PI * vFreq * t) * 0.22 * vEnv;
    vL[i] = lead * 0.9;
    vR[i] = lead * 1.1; // stereo widening
  }

  // Sum into Full Mix
  const fL = fullBuf.getChannelData(0);
  const fR = fullBuf.getChannelData(1);
  for (let i = 0; i < numSamples; i++) {
    fL[i] = dL[i] * 0.85 + bL[i] * 0.9 + gL[i] * 0.75 + kL[i] * 0.8 + vL[i] * 0.8;
    fR[i] = dR[i] * 0.85 + bR[i] * 0.9 + gR[i] * 0.75 + kR[i] * 0.8 + vR[i] * 0.8;
  }

  const stems: DemoTrackItem[] = [
    { id: 'track-1', name: 'Acoustic & Electro Drums', type: 'drums', color: '#EF4444', buffer: drumsBuf },
    { id: 'track-2', name: 'Analog Bassline', type: 'bass', color: '#F59E0B', buffer: bassBuf },
    { id: 'track-3', name: 'Rhythm Guitar Stabs', type: 'guitar', color: '#10B981', buffer: guitarBuf },
    { id: 'track-4', name: 'Atmospheric Keys Pad', type: 'keys', color: '#06B6D4', buffer: keysBuf },
    { id: 'track-5', name: 'Lead Melodic Vocal', type: 'vocals', color: '#8B5CF6', buffer: vocalsBuf },
  ];

  return { fullMaster: fullBuf, stems };
}
