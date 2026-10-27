import React from 'react';
import {
  Wand2,
  Sliders,
  Layers,
  Cpu,
  Package,
  Volume2,
  Play,
  Square,
  Sparkles,
} from 'lucide-react';

export type AppMode = 'easy' | 'pro' | 'multitrack' | 'ai-models';

interface HeaderProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onOpenNativeModal: () => void;
  sampleRate: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  isPlaying,
  onPlay,
  onPause,
  onStop,
  onOpenNativeModal,
  sampleRate,
}) => {
  return (
    <header className="h-16 border-b border-white/10 bg-[#0f121b] px-4 flex items-center justify-between select-none z-20">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Volume2 className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider text-white">
                AUDIOFORGE
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-black tracking-widest uppercase">
                STUDIO
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono tracking-tight block">
              Native C++ DSP & Multitrack Workstation
            </span>
          </div>
        </div>

        {/* Global Hardware & Engine Status */}
        <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-white/10 text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ENGINE: 32-bit FLOAT
          </span>
          <span className="bg-black/40 px-2 py-1 rounded border border-white/5 text-zinc-300">
            {sampleRate / 1000} kHz
          </span>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <nav className="flex items-center bg-[#090b10] p-1 rounded-xl border border-white/10 shadow-inner">
        <button
          onClick={() => onSelectMode('easy')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentMode === 'easy'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>EASY MASTER</span>
        </button>

        <button
          onClick={() => onSelectMode('pro')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentMode === 'pro'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>PRO MASTER</span>
        </button>

        <button
          onClick={() => onSelectMode('multitrack')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentMode === 'multitrack'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>MULTITRACK DAW</span>
        </button>

        <button
          onClick={() => onSelectMode('ai-models')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentMode === 'ai-models'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>LOCAL AI</span>
        </button>
      </nav>

      {/* Right Controls: Quick Transport & Native Code / APK Button */}
      <div className="flex items-center gap-3">
        {/* Quick Transport Buttons */}
        <div className="flex items-center bg-[#090b10] rounded-lg p-0.5 border border-white/10">
          <button
            onClick={isPlaying ? onPause : onPlay}
            className={`p-2 rounded-md transition-all ${
              isPlaying
                ? 'bg-amber-500 text-black font-bold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <span className="font-mono text-xs font-bold px-1">PAUSE</span>
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>
          <button
            onClick={onStop}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md"
            title="Stop & Return to Zero"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Native Flutter & APK Export Button */}
        <button
          onClick={onOpenNativeModal}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all border border-sky-400/30 cursor-pointer"
          title="Inspect Native C++ DSP Engine, Flutter code & Download complete project for Android APK & Desktop"
        >
          <Package className="w-4 h-4" />
          <span className="hidden sm:inline">NATIVE CODE & APK</span>
          <span className="px-1 py-0.2 text-[8px] bg-black/40 rounded border border-white/20">
            FLUTTER + C++
          </span>
        </button>
      </div>
    </header>
  );
};
