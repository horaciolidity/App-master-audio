import React, { useRef, useEffect } from 'react';
import { CompressorConfig } from '../audio/dsp-engine';

interface CompressorCurveCanvasProps {
  config: CompressorConfig;
  gainReductionDb: number;
  height?: number;
}

export const CompressorCurveCanvas: React.FC<CompressorCurveCanvasProps> = ({
  config,
  gainReductionDb,
  height = 130,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const minDb = -48;
    const maxDb = 0;

    const dbToX = (db: number) => ((db - minDb) / (maxDb - minDb)) * w;
    const dbToY = (db: number) => h - ((db - minDb) / (maxDb - minDb)) * h;

    // Grid lines (-36, -24, -12, 0)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = '8px JetBrains Mono';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';

    [-36, -24, -12, 0].forEach((db) => {
      const x = dbToX(db);
      const y = dbToY(db);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      ctx.fillText(`${db}`, x + 2, h - 3);
    });

    // 1:1 Linear Uncompressed reference diagonal (dashed)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(dbToX(minDb), dbToY(minDb));
    ctx.lineTo(dbToX(maxDb), dbToY(maxDb));
    ctx.stroke();
    ctx.setLineDash([]);

    // Compression Transfer Curve
    const { threshold, ratio, knee } = config;
    ctx.beginPath();

    for (let xPix = 0; xPix <= w; xPix++) {
      const inDb = minDb + (xPix / w) * (maxDb - minDb);
      let outDb = inDb;

      const kneeStart = threshold - knee / 2;
      const kneeEnd = threshold + knee / 2;

      if (inDb > kneeEnd) {
        outDb = threshold + (inDb - threshold) / ratio;
      } else if (inDb > kneeStart && knee > 0.01) {
        const x = inDb - kneeStart;
        const comp = ((1 - 1 / ratio) * x * x) / (2 * knee);
        outDb = inDb - comp;
      }

      const yPix = dbToY(outDb);
      if (xPix === 0) ctx.moveTo(xPix, yPix);
      else ctx.lineTo(xPix, yPix);
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gain Reduction Active indicator ball
    if (gainReductionDb > 0.2) {
      const estimatedInputDb = threshold + gainReductionDb / (1 - 1 / ratio);
      const targetX = dbToX(Math.min(0, estimatedInputDb));
      const targetY = dbToY(Math.min(0, estimatedInputDb - gainReductionDb));

      ctx.beginPath();
      ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [config, gainReductionDb]);

  return (
    <div className="relative w-full bg-[#0d1017] rounded-xl border border-white/10 overflow-hidden shadow-inner select-none">
      <div className="absolute top-2 left-3 flex items-center justify-between right-3 z-10 pointer-events-none">
        <span className="text-[10px] font-mono tracking-wider font-bold text-sky-400 uppercase">
          COMPRESSION TRANSFER CURVE
        </span>
        <span className="text-[10px] font-mono text-zinc-400">
          GR:{' '}
          <span className={`font-bold ${gainReductionDb > 0.5 ? 'text-red-400' : 'text-zinc-500'}`}>
            -{gainReductionDb.toFixed(1)} dB
          </span>
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={360}
        height={height}
        className="w-full h-full block"
      />
    </div>
  );
};
