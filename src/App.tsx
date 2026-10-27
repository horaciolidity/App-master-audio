/**
 * AUDIOFORGE AI STUDIO
 * Professional Cross-Platform Audio Mixing and Mastering Workstation
 * Powered by Web Audio API 32-bit Float Processing & Native C++ DSP Engine
 */

import React, { useState, useEffect } from 'react';
import { Header, AppMode } from './components/Header';
import { EasyMasteringView } from './components/EasyMasteringView';
import { ProMasteringSuite } from './components/ProMasteringSuite';
import { MultitrackMixerView } from './components/MultitrackMixerView';
import { LocalAIManagerModal } from './components/LocalAIManagerModal';
import { NativeCodeModal } from './components/NativeCodeModal';
import { masterEngine } from './audio/dsp-engine';
import { multitrackEngine } from './audio/multitrack-engine';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('easy');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [isNativeModalOpen, setIsNativeModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Determine sample rate from audio context
    masterEngine.initAudioContext().then((ctx) => {
      setSampleRate(ctx.sampleRate);
    });

    const interval = setInterval(() => {
      if (currentMode === 'multitrack') {
        setIsPlaying(multitrackEngine.getIsPlaying());
      } else {
        setIsPlaying(masterEngine.getIsPlaying());
      }
    }, 60);

    return () => clearInterval(interval);
  }, [currentMode]);

  const handlePlay = () => {
    if (currentMode === 'multitrack') {
      multitrackEngine.play();
    } else {
      masterEngine.play();
    }
  };

  const handlePause = () => {
    if (currentMode === 'multitrack') {
      multitrackEngine.pause();
    } else {
      masterEngine.pause();
    }
  };

  const handleStop = () => {
    if (currentMode === 'multitrack') {
      multitrackEngine.stop();
    } else {
      masterEngine.stop();
    }
  };

  const handleModeChange = (mode: AppMode) => {
    // When changing modes, pause any current playback to prevent overlap
    if (isPlaying) {
      handlePause();
    }
    setCurrentMode(mode);
  };

  return (
    <div className="min-h-screen bg-[#0b0d13] text-zinc-100 flex flex-col studio-grid font-sans">
      {/* Top Studio Bar */}
      <Header
        currentMode={currentMode}
        onSelectMode={handleModeChange}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onOpenNativeModal={() => setIsNativeModalOpen(true)}
        sampleRate={sampleRate}
      />

      {/* Main Workstation View Area */}
      <main className="flex-1 pb-12">
        {currentMode === 'easy' && (
          <EasyMasteringView onSwitchToPro={() => setCurrentMode('pro')} />
        )}

        {currentMode === 'pro' && <ProMasteringSuite />}

        {currentMode === 'multitrack' && (
          <MultitrackMixerView
            onSendToMastering={() => {
              setCurrentMode('easy');
            }}
          />
        )}

        {currentMode === 'ai-models' && <LocalAIManagerModal />}
      </main>

      {/* Native Source Code & Android APK Modal */}
      <NativeCodeModal
        isOpen={isNativeModalOpen}
        onClose={() => setIsNativeModalOpen(false)}
      />
    </div>
  );
}
