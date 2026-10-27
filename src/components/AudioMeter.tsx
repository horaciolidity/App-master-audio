import React from 'react';

interface AudioMeterProps {
  levelDbL: number; // e.g. -60 to 0
  levelDbR: number;
  height?: number;
  label?: string;
  showNumbers?: boolean;
}

export const AudioMeter: React.FC<AudioMeterProps> = ({
  levelDbL,
  levelDbR,
  height = 140,
  label = 'OUTPUT',
  showNumbers = true,
}) => {
  // Convert dB (-60 to 0) to 0..1 height percentage
  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 0) return 100;
    return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  };

  const pctL = dbToPercent(levelDbL);
  const pctR = dbToPercent(levelDbR);

  const isClipL = levelDbL >= -0.05;
  const isClipR = levelDbR >= -0.05;

  return (
    <div className="flex flex-col items-center select-none bg-[#0e111a] p-2 rounded-lg border border-white/5">
      {/* Clip indicator LEDs */}
      <div className="flex gap-1.5 mb-1.5">
        <div
          className={`w-2 h-1.5 rounded-xs transition-colors duration-100 ${
            isClipL ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-red-950/40'
          }`}
          title="Clip L"
        />
        <div
          className={`w-2 h-1.5 rounded-xs transition-colors duration-100 ${
            isClipR ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-red-950/40'
          }`}
          title="Clip R"
        />
      </div>

      {/* Meter Bars */}
      <div className="flex items-center gap-1">
        {/* Scale labels */}
        {showNumbers && (
          <div className="flex flex-col justify-between text-[7px] font-mono text-zinc-500 pr-1 select-none" style={{ height }}>
            <span>0</span>
            <span>-6</span>
            <span>-12</span>
            <span>-24</span>
            <span>-36</span>
            <span>-48</span>
          </div>
        )}

        {/* Left Channel */}
        <div
          className="w-2.5 bg-black/60 rounded-xs overflow-hidden relative flex flex-col justify-end border border-white/10"
          style={{ height }}
        >
          <div
            className="w-full transition-all duration-75 rounded-xs bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500"
            style={{ height: `${pctL}%` }}
          />
        </div>

        {/* Right Channel */}
        <div
          className="w-2.5 bg-black/60 rounded-xs overflow-hidden relative flex flex-col justify-end border border-white/10"
          style={{ height }}
        >
          <div
            className="w-full transition-all duration-75 rounded-xs bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500"
            style={{ height: `${pctR}%` }}
          />
        </div>
      </div>

      <span className="text-[9px] font-mono font-bold text-zinc-400 mt-1 uppercase">
        {label}
      </span>
    </div>
  );
};
