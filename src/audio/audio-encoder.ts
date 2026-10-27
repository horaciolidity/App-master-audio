/**
 * AUDIOFORGE Professional WAV Audio Encoder
 * Encodes AudioBuffer into standard PCM RIFF WAV format (16-bit, 24-bit, or 32-bit float).
 * Fully compatible with VLC, Windows Media Player, QuickTime, Android Player, and all DAWs.
 */

export type BitDepth = 16 | 24 | 32;

export interface WavExportOptions {
  sampleRate?: number;
  bitDepth?: BitDepth;
  normalize?: boolean;
}

export function encodeWAV(
  audioBuffer: AudioBuffer,
  options: WavExportOptions = {}
): Blob {
  const bitDepth = options.bitDepth || 24;
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = options.sampleRate || audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;

  // Extract channel data into cloned Float32Array to avoid mutating original buffer
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    const orig = audioBuffer.getChannelData(c);
    const clone = new Float32Array(numFrames);
    clone.set(orig);
    channels.push(clone);
  }

  // Find true peak across all channels
  let maxPeak = 0;
  for (let c = 0; c < numChannels; c++) {
    const data = channels[c];
    for (let i = 0; i < numFrames; i++) {
      const absVal = Math.abs(data[i]);
      if (absVal > maxPeak) maxPeak = absVal;
    }
  }

  // Normalization / Anti-clip Protection:
  // If user requested normalization OR if the audio is exceeding 1.0 (clipping), scale safely
  if (options.normalize && maxPeak > 0.0001) {
    const targetPeak = 0.988; // -0.1 dBFS ceiling
    const factor = targetPeak / maxPeak;
    for (let c = 0; c < numChannels; c++) {
      const data = channels[c];
      for (let i = 0; i < numFrames; i++) {
        data[i] *= factor;
      }
    }
  } else if (maxPeak > 1.0) {
    // Automatic clip guard so samples never wrap around in integer PCM
    const factor = 0.999 / maxPeak;
    for (let c = 0; c < numChannels; c++) {
      const data = channels[c];
      for (let i = 0; i < numFrames; i++) {
        data[i] *= factor;
      }
    }
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // 2. "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  const audioFormat = bitDepth === 32 ? 3 : 1; // 1 = PCM, 3 = IEEE Float
  view.setUint16(20, audioFormat, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // 3. "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // 4. Interleave and write samples
  let offset = 44;
  if (bitDepth === 16) {
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
  } else if (bitDepth === 24) {
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = sample < 0 ? Math.round(sample * 0x800000) : Math.round(sample * 0x7fffff);
        view.setUint8(offset, intSample & 0xff);
        view.setUint8(offset + 1, (intSample >> 8) & 0xff);
        view.setUint8(offset + 2, (intSample >> 16) & 0xff);
        offset += 3;
      }
    }
  } else if (bitDepth === 32) {
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = channels[c][i];
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export function downloadBlob(blob: Blob, filename: string) {
  // Ensure valid extension
  const cleanFilename = filename.toLowerCase().endsWith('.wav') ? filename : `${filename}.wav`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
