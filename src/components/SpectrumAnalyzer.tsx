import React, { useRef, useEffect } from 'react';
import { masterEngine } from '../audio/dsp-engine';

interface SpectrumAnalyzerProps {
  isPlaying: boolean;
  height?: number;
  showComparison?: boolean; // Show both Pre and Post EQ/Mastering spectrum
}

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  isPlaying,
  height = 180,
  showComparison = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fftSize = 1024;
    const inputData = new Uint8Array(fftSize);
    const outputData = new Uint8Array(fftSize);

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, width, h);

      // Background grid & logarithmic frequency marks (30, 60, 120, 250, 500, 1k, 2k, 4k, 8k, 16k)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.font = '9px JetBrains Mono';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';

      const freqMarks = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000];
      const minLog = Math.log10(20);
      const maxLog = Math.log10(22000);

      freqMarks.forEach((f) => {
        const x = ((Math.log10(f) - minLog) / (maxLog - minLog)) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 14);
        ctx.stroke();

        const label = f >= 1000 ? `${f / 1000}k` : `${f}`;
        ctx.fillText(label, x - 8, h - 4);
      });

      // dB horizontal lines (+6, 0, -12, -24, -36 dB)
      [-12, -24, -36].forEach((db) => {
        const y = ((0 - db) / 60) * (h - 20);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      });

      if (isPlaying) {
        masterEngine.getInputFrequencyData(inputData);
        masterEngine.getOutputFrequencyData(outputData);

        // 1. Pre-Mastering Input Curve (Ghosted White / Cyan)
        if (showComparison) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.lineWidth = 1.5;
          for (let i = 2; i < fftSize / 2; i++) {
            const freq = (i * 24000) / (fftSize / 2);
            if (freq < 20 || freq > 22000) continue;
            const x = ((Math.log10(freq) - minLog) / (maxLog - minLog)) * width;
            const norm = inputData[i] / 255;
            const y = h - 16 - norm * (h - 24);
            if (i === 2) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // 2. Post-Mastering Output Curve (Vibrant Amber / Gold Gradient Fill)
        ctx.beginPath();
        let startX = 0;
        let startY = h - 16;
        for (let i = 2; i < fftSize / 2; i++) {
          const freq = (i * 24000) / (fftSize / 2);
          if (freq < 20 || freq > 22000) continue;
          const x = ((Math.log10(freq) - minLog) / (maxLog - minLog)) * width;
          const norm = outputData[i] / 255;
          const y = h - 16 - norm * (h - 24);
          if (i === 2) {
            startX = x;
            startY = y;
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Gradient stroke
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, '#ef4444');
        grad.addColorStop(0.3, '#f59e0b');
        grad.addColorStop(0.7, '#38bdf8');
        grad.addColorStop(1, '#818cf8');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Area Fill
        ctx.lineTo(width, h - 16);
        ctx.lineTo(startX, h - 16);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
        fillGrad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
        fillGrad.addColorStop(1, 'rgba(245, 158, 11, 0.01)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, showComparison]);

  return (
    <div className="relative w-full bg-[#0d1017] rounded-xl border border-white/10 overflow-hidden shadow-inner">
      <div className="absolute top-2 left-3 flex items-center gap-3 z-10">
        <span className="text-[10px] font-mono tracking-wider font-bold text-zinc-400 uppercase">
          FFT SPECTRUM ANALYZER (20Hz - 20kHz)
        </span>
        {showComparison && (
          <div className="flex items-center gap-3 text-[9px] font-mono">
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-2 h-0.5 bg-slate-400 rounded-full" /> PRE-MASTER
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span className="w-2 h-0.5 bg-amber-400 rounded-full" /> MASTERED
            </span>
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={height}
        className="w-full h-full block"
      />
    </div>
  );
};
