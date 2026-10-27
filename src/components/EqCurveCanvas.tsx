import React, { useRef, useState, useEffect, useCallback } from 'react';
import { EqBandConfig } from '../audio/dsp-engine';

interface EqCurveCanvasProps {
  bands: EqBandConfig[];
  onChangeBand: (bandIndex: number, updates: Partial<EqBandConfig>) => void;
  height?: number;
}

export const EqCurveCanvas: React.FC<EqCurveCanvasProps> = ({
  bands,
  onChangeBand,
  height = 190,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeBandIndex, setActiveBandIndex] = useState<number | null>(null);

  const minFreq = 20;
  const maxFreq = 20000;
  const minGain = -15;
  const maxGain = 15;

  const freqToX = useCallback((freq: number, width: number) => {
    return ((Math.log10(freq) - Math.log10(minFreq)) / (Math.log10(maxFreq) - Math.log10(minFreq))) * width;
  }, []);

  const xToFreq = useCallback((x: number, width: number) => {
    const norm = Math.max(0, Math.min(1, x / width));
    return Math.pow(10, Math.log10(minFreq) + norm * (Math.log10(maxFreq) - Math.log10(minFreq)));
  }, []);

  const gainToY = useCallback((gain: number, h: number) => {
    const norm = (gain - minGain) / (maxGain - minGain); // 0 at -15, 1 at +15
    return (1 - norm) * (h - 24) + 12;
  }, []);

  const yToGain = useCallback((y: number, h: number) => {
    const clampedY = Math.max(12, Math.min(h - 12, y));
    const norm = 1 - (clampedY - 12) / (h - 24);
    return minGain + norm * (maxGain - minGain);
  }, []);

  // Approximate biquad filter magnitude response in dB
  const getFilterResponseDb = useCallback((band: EqBandConfig, f: number): number => {
    if (!band.enabled || Math.abs(band.gain) < 0.05) return 0;
    const g = band.gain;
    const f0 = band.freq;
    const q = band.q || 0.707;

    if (band.type === 'peaking') {
      const ratio = f / f0;
      const d = Math.abs(Math.log2(ratio));
      const bell = Math.exp(-Math.pow(d * q * 1.4, 2));
      return g * bell;
    } else if (band.type === 'lowshelf') {
      if (f <= f0 * 0.5) return g;
      if (f >= f0 * 2) return 0;
      const t = (Math.log2(f / (f0 * 0.5))) / 2;
      return g * (1 - t);
    } else if (band.type === 'highshelf') {
      if (f >= f0 * 2) return g;
      if (f <= f0 * 0.5) return 0;
      const t = (Math.log2(f / (f0 * 0.5))) / 2;
      return g * t;
    }
    return 0;
  }, []);

  // Draw EQ grid, frequency curves, and nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, width, h);

    // Background frequency lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.font = '9px JetBrains Mono';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

    const marks = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    marks.forEach((f) => {
      const x = freqToX(f, width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      const label = f >= 1000 ? `${f / 1000}k` : `${f}`;
      ctx.fillText(label, x - 8, h - 3);
    });

    // 0dB center line
    const zeroY = gainToY(0, h);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // +6, +12, -6, -12 dB lines
    [12, 6, -6, -12].forEach((g) => {
      const y = gainToY(g, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${g > 0 ? '+' : ''}${g}dB`, 4, y - 2);
    });

    // Combined Response Curve
    const points: { x: number; y: number }[] = [];
    const steps = 240;
    for (let s = 0; s <= steps; s++) {
      const x = (s / steps) * width;
      const f = xToFreq(x, width);

      let totalDb = 0;
      for (const b of bands) {
        totalDb += getFilterResponseDb(b, f);
      }

      const y = gainToY(totalDb, h);
      points.push({ x, y });
    }

    // Draw Curve
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fill under curve towards 0dB
    ctx.lineTo(width, zeroY);
    ctx.lineTo(0, zeroY);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    fillGrad.addColorStop(1, 'rgba(245, 158, 11, 0.02)');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Draw Draggable Nodes
    bands.forEach((band, idx) => {
      const x = freqToX(band.freq, width);
      const y = gainToY(band.gain, h);
      const isActive = activeBandIndex === idx;

      // Outer halo
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 14 : 9, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? 'rgba(245, 158, 11, 0.45)' : 'rgba(255, 255, 255, 0.15)';
      ctx.fill();

      // Inner Core
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = band.enabled ? '#f59e0b' : '#64748b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Node label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.fillText(`${idx + 1}`, x - 3, y - 10);
    });
  }, [bands, activeBandIndex, freqToX, xToFreq, gainToY, yToGain, getFilterResponseDb]);

  // Pointer Dragging Handlers (Works on Touch on Android and Mouse on Desktop)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Find nearest node within hit radius (35px hit area for easy touch manipulation)
    let foundIdx: number | null = null;
    let minDist = 35;

    bands.forEach((b, i) => {
      const x = freqToX(b.freq, canvas.width);
      const y = gainToY(b.gain, canvas.height);
      const dist = Math.hypot(clickX - x, clickY - y);
      if (dist < minDist) {
        minDist = dist;
        foundIdx = i;
      }
    });

    if (foundIdx !== null) {
      setActiveBandIndex(foundIdx);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeBandIndex === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const newFreq = Math.round(xToFreq(clickX, canvas.width));
    const newGain = Number(yToGain(clickY, canvas.height).toFixed(1));

    onChangeBand(activeBandIndex, {
      freq: Math.max(20, Math.min(20000, newFreq)),
      gain: Math.max(-15, Math.min(15, newGain)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeBandIndex !== null) {
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
      setActiveBandIndex(null);
    }
  };

  return (
    <div
      className="relative w-full bg-[#0d1017] rounded-xl border border-white/10 overflow-hidden shadow-inner select-none touch-none"
      style={{ touchAction: 'none' }}
    >
      <div className="absolute top-2 left-3 flex items-center gap-2 z-10 pointer-events-none">
        <span className="text-[10px] font-mono tracking-wider font-bold text-amber-400 uppercase">
          5-BAND PARAMETRIC EQ CURVE
        </span>
        <span className="text-[9px] text-zinc-400 font-mono">
          (Touch or drag nodes 1-5 to adjust Frequency & Gain in real-time)
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full block cursor-crosshair touch-none"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
