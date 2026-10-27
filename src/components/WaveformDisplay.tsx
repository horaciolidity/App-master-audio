import React, { useRef, useEffect } from 'react';

interface WaveformDisplayProps {
  buffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  height?: number;
  color?: string;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  buffer,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  height = 90,
  color = '#f59e0b',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw Waveform and Playhead
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, width, h);

    // Center baseline
    const midY = h / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    if (!buffer) {
      // Empty placeholder waveform
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = '11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Drop or import audio file (WAV, MP3, FLAC) to view waveform', width / 2, midY + 4);
      return;
    }

    const dataL = buffer.getChannelData(0);
    const dataR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : dataL;
    const totalSamples = dataL.length;
    const step = Math.ceil(totalSamples / width);

    // Current playhead progress
    const progressNorm = duration > 0 ? currentTime / duration : 0;
    const playheadX = progressNorm * width;

    // Draw stereo mirrored waveform bars
    for (let x = 0; x < width; x++) {
      let maxL = 0;
      let maxR = 0;
      const start = x * step;

      for (let s = 0; s < step; s++) {
        const idx = start + s;
        if (idx < totalSamples) {
          const absL = Math.abs(dataL[idx]);
          const absR = Math.abs(dataR[idx]);
          if (absL > maxL) maxL = absL;
          if (absR > maxR) maxR = absR;
        }
      }

      const barHeightL = Math.min(midY - 4, maxL * (midY - 4));
      const barHeightR = Math.min(midY - 4, maxR * (midY - 4));

      // Color before playhead is brighter/accent, after playhead is dimmer
      const isPast = x <= playheadX;
      ctx.fillStyle = isPast ? color : 'rgba(148, 163, 184, 0.35)';

      // Upper channel (L)
      ctx.fillRect(x, midY - barHeightL, 1, barHeightL);
      // Lower channel (R)
      ctx.fillRect(x, midY, 1, barHeightR);
    }

    // Playhead line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Playhead thumb head
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 7);
    ctx.closePath();
    ctx.fill();
  }, [buffer, currentTime, duration, color]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const norm = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(norm * duration);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  return (
    <div className="relative w-full bg-[#0a0d14] rounded-xl border border-white/10 p-2 overflow-hidden shadow-inner group">
      {/* Timecode overlay */}
      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-1 px-1">
        <span className="text-amber-400 font-bold">{formatTime(currentTime)}</span>
        <span className="text-zinc-500">TOTAL: {formatTime(duration)}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        onClick={handleClick}
        className="w-full block rounded cursor-pointer transition-opacity group-hover:opacity-95"
        title="Click to scrub / seek playhead"
      />
    </div>
  );
};
