/**
 * AUDIOFORGE Professional WAV Audio Encoder
 * Encodes AudioBuffer into PCM RIFF WAV format (16-bit, 24-bit, or 32-bit float).
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

  // Extract channel data
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  // Peak normalization if requested
  if (options.normalize) {
    let maxPeak = 0;
    for (let c = 0; c < numChannels; c++) {
      for (let i = 0; i < numFrames; i++) {
        const absVal = Math.abs(channels[c][i]);
        if (absVal > maxPeak) maxPeak = absVal;
      }
    }
    if (maxPeak > 0.0001) {
      const targetPeak = 0.988; // -0.1 dBFS
      const factor = targetPeak / maxPeak;
      for (let c = 0; c < numChannels; c++) {
        const data = channels[c];
        for (let i = 0; i < numFrames; i++) {
          data[i] *= factor;
        }
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

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  const audioFormat = bitDepth === 32 ? 3 : 1; // 1 = PCM, 3 = IEEE float
  view.setUint16(20, audioFormat, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave and write audio samples
  let offset = 44;
  if (bitDepth === 16) {
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
  } else if (bitDepth === 24) {
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = Math.floor(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
