import React, { useRef, useState, useEffect, useCallback } from 'react';

interface FaderProps {
  valueDb: number; // e.g. -60 to +6
  minDb?: number;
  maxDb?: number;
  onChange: (val: number) => void;
  height?: number;
  color?: string;
  label?: string;
}

export const Fader: React.FC<FaderProps> = ({
  valueDb,
  minDb = -60,
  maxDb = 6,
  onChange,
  height = 160,
  color = '#f59e0b',
  label = 'LEVEL',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Non-linear dB to visual position curve (expanded around unity 0dB)
  const dbToPosition = (db: number): number => {
    if (db <= minDb) return 0;
    // Map -60 to 0 (bottom 75%) and 0 to +6 (top 25%)
    if (db <= 0) {
      return ((db - minDb) / (0 - minDb)) * 0.75;
    } else {
      return 0.75 + (db / maxDb) * 0.25;
    }
  };

  const positionToDb = (pos: number): number => {
    const clamped = Math.max(0, Math.min(1, pos));
    if (clamped <= 0.75) {
      const frac = clamped / 0.75;
      return minDb + frac * (0 - minDb);
    } else {
      const frac = (clamped - 0.75) / 0.25;
      return frac * maxDb;
    }
  };

  const visualPos = dbToPosition(valueDb); // 0 (bottom) to 1 (top)

  const handlePointerDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateFromPointer(e.clientY);
  };

  const updateFromPointer = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      // 0 at top, height at bottom -> invert so 1 is top
      const normalized = 1 - Math.max(0, Math.min(1, relativeY / rect.height));
      const db = positionToDb(normalized);
      onChange(Number(db.toFixed(1)));
    },
    [minDb, maxDb, onChange]
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updateFromPointer(e.clientY);
    };
    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, updateFromPointer]);

  return (
    <div className="flex flex-col items-center select-none w-14">
      {/* dB Value readout */}
      <span className="text-[11px] font-mono text-zinc-200 font-semibold mb-1">
        {valueDb <= minDb ? '-inf' : valueDb > 0 ? `+${valueDb.toFixed(1)}` : `${valueDb.toFixed(1)}`}
        <span className="text-zinc-500 text-[9px] ml-0.5">dB</span>
      </span>

      {/* Fader Track & Scale */}
      <div className="flex items-center gap-1.5">
        {/* Scale Ticks */}
        <div className="flex flex-col justify-between text-[8px] font-mono text-zinc-500 h-[160px] py-1 select-none pr-0.5">
          <span>+6</span>
          <span className="text-amber-400 font-bold">0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-24</span>
          <span>-40</span>
          <span>-inf</span>
        </div>

        {/* Track Slot */}
        <div
          ref={trackRef}
          onMouseDown={handlePointerDown}
          onDoubleClick={() => onChange(0)} // Reset to 0dB unity
          className="relative w-3.5 bg-[#0f121a] rounded-full border border-white/10 cursor-pointer shadow-inner flex items-center justify-center"
          style={{ height }}
          title="Drag fader to adjust gain (double click for 0dB)"
        >
          {/* Unity 0dB mark line */}
          <div
            className="absolute w-full h-[1px] bg-amber-500/40"
            style={{ bottom: `${0.75 * 100}%` }}
          />

          {/* Center Guide Slot */}
          <div className="w-[2px] h-[92%] bg-black/60 rounded" />

          {/* Fader Cap */}
          <div
            className={`absolute w-7 h-6 -left-[7px] rounded bg-gradient-to-b from-[#333a4d] via-[#1e2330] to-[#121620] border border-white/20 shadow-md flex items-center justify-center transition-shadow cursor-grab active:cursor-grabbing ${
              isDragging ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black shadow-xl' : 'hover:border-white/40'
            }`}
            style={{
              bottom: `calc(${visualPos * 100}% - 12px)`,
            }}
          >
            {/* Center Line Notch */}
            <div
              className="w-full h-[2px] shadow-sm"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </div>

      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mt-2">
        {label}
      </span>
    </div>
  );
};
