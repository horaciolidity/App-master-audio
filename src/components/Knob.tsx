import React, { useState, useRef, useEffect, useCallback } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  size?: number; // pixel diameter
  color?: string;
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
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValRef = useRef(value);

  // Map value to angle (-135deg to +135deg, 270 degree sweep)
  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  };

  const handlePointerMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - e.clientY;
      const range = max - min;
      const change = (deltaY / 150) * range;
      let nextVal = startValRef.current + change;
      nextVal = Math.max(min, Math.min(max, nextVal));
      if (step) {
        nextVal = Math.round(nextVal / step) * step;
      }
      onChange(Number(nextVal.toFixed(2)));
    },
    [isDragging, max, min, step, onChange]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
    } else {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <div className="flex flex-col items-center select-none group">
      <div
        className="relative cursor-ns-resize flex items-center justify-center rounded-full transition-transform"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${value}${unit} (Drag up/down, double-click to reset)`}
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
          className={`rounded-full bg-gradient-to-b from-[#242938] to-[#12151e] border border-white/10 shadow-inner flex items-center justify-center relative transition-shadow ${
            isDragging ? 'ring-1 ring-amber-400 shadow-lg' : 'group-hover:border-white/20'
          }`}
          style={{ width: size - 12, height: size - 12 }}
        >
          {/* Rotating Notch Indicator */}
          <div
            className="absolute w-full h-full pointer-events-none flex items-start justify-center pt-1"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div
              className="w-1 h-2 rounded-full shadow-sm"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </div>

      {/* Label and Value */}
      <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 mt-1 line-clamp-1">
        {label}
      </span>
      <span className="text-[10px] font-mono text-zinc-200 font-medium">
        {value > 0 && unit.includes('dB') ? `+${value}` : value}
        <span className="text-zinc-500 ml-0.5">{unit}</span>
      </span>
    </div>
  );
};
