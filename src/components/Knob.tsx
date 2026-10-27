import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  size?: number; // pixel diameter
  color?: string;
  isLogarithmic?: boolean;
  onChange: (val: number) => void;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  step = 0.1,
  defaultValue,
  unit = '',
  size = 48,
  color = '#f59e0b',
  isLogarithmic = false,
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValueText, setEditValueText] = useState('');
  const knobRef = useRef<HTMLDivElement>(null);

  const startYRef = useRef(0);
  const startValRef = useRef(value);

  // Convert linear value to normalized 0..1 (taking logarithmic into account)
  const valueToNorm = useCallback(
    (v: number): number => {
      const clamped = Math.max(min, Math.min(max, v));
      if (isLogarithmic) {
        const minL = Math.log10(Math.max(1, min));
        const maxL = Math.log10(max);
        return (Math.log10(Math.max(1, clamped)) - minL) / (maxL - minL);
      }
      return (clamped - min) / (max - min);
    },
    [min, max, isLogarithmic]
  );

  // Convert normalized 0..1 to value
  const normToValue = useCallback(
    (norm: number): number => {
      const clamped = Math.max(0, Math.min(1, norm));
      if (isLogarithmic) {
        const minL = Math.log10(Math.max(1, min));
        const maxL = Math.log10(max);
        const val = Math.pow(10, minL + clamped * (maxL - minL));
        return Math.round(val);
      }
      let val = min + clamped * (max - min);
      if (step) {
        val = Math.round(val / step) * step;
      }
      return Number(val.toFixed(2));
    },
    [min, max, step, isLogarithmic]
  );

  const norm = valueToNorm(value);
  // Map value to angle (-135deg to +135deg, 270 degree sweep)
  const angle = -135 + norm * 270;

  // Pointer Down (Supports both Touch on Android and Mouse on Desktop)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEditing) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const deltaY = startYRef.current - e.clientY;
    const normDelta = deltaY / 160;
    const startNorm = valueToNorm(startValRef.current);
    const nextNorm = Math.max(0, Math.min(1, startNorm + normDelta));
    const nextVal = normToValue(nextNorm);

    if (nextVal !== value) {
      onChange(nextVal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
    }
  };

  // Wheel support for fine desktop adjustments
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const direction = e.deltaY < 0 ? 1 : -1;
    const normDelta = direction * 0.025;
    const nextNorm = Math.max(0, Math.min(1, norm + normDelta));
    const nextVal = normToValue(nextNorm);
    onChange(nextVal);
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  };

  // Direct numeric input editing
  const handleStartEditing = () => {
    setEditValueText(String(value));
    setIsEditing(true);
  };

  const handleCommitEdit = () => {
    setIsEditing(false);
    const parsed = parseFloat(editValueText);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(Number(clamped.toFixed(2)));
    }
  };

  return (
    <div
      className="flex flex-col items-center select-none group touch-none"
      style={{ touchAction: 'none' }}
    >
      <div
        ref={knobRef}
        className={`relative cursor-ns-resize flex items-center justify-center rounded-full transition-transform ${
          isDragging ? 'scale-105' : 'hover:scale-102'
        }`}
        style={{ width: size, height: size, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${value}${unit} (Drag up/down, scroll, or double-click to reset)`}
      >
        {/* Outer Ring Arc */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size}
          height={size}
          viewBox="0 0 48 48"
        >
          {/* Background Track */}
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="#1a1e2e"
            strokeWidth="3.5"
            strokeDasharray="94.2"
            strokeDashoffset="23.5"
            transform="rotate(135 24 24)"
            strokeLinecap="round"
          />
          {/* Active Value Track */}
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeDasharray="94.2"
            strokeDashoffset={94.2 - norm * 70.6}
            transform="rotate(135 24 24)"
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>

        {/* Knob Body */}
        <div
          className={`rounded-full bg-gradient-to-b from-[#252b3b] via-[#1a1f2c] to-[#10141d] border border-white/10 shadow-inner flex items-center justify-center relative transition-shadow ${
            isDragging
              ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black shadow-lg shadow-amber-500/30'
              : 'group-hover:border-white/30'
          }`}
          style={{ width: size - 12, height: size - 12 }}
        >
          {/* Rotating Notch Indicator */}
          <div
            className="absolute w-full h-full pointer-events-none flex items-start justify-center pt-1"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div
              className="w-1.5 h-2.5 rounded-full shadow-sm"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mt-1 line-clamp-1">
        {label}
      </span>

      {/* Value Readout / Editable Field */}
      {isEditing ? (
        <input
          type="text"
          value={editValueText}
          autoFocus
          onChange={(e) => setEditValueText(e.target.value)}
          onBlur={handleCommitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommitEdit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="w-16 text-center text-[10px] font-mono bg-black text-amber-300 border border-amber-500 rounded px-1 py-0.5 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={handleStartEditing}
          className="text-[10px] font-mono text-zinc-200 font-medium hover:text-amber-400 cursor-text transition-colors mt-0.5 px-1 py-0.5 rounded hover:bg-white/5"
          title="Click to type exact numeric value"
        >
          {value > 0 && unit.includes('dB') ? `+${value}` : value}
          <span className="text-zinc-500 ml-0.5">{unit}</span>
        </button>
      )}
    </div>
  );
};
