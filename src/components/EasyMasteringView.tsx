import React, { useState, useEffect } from 'react';
import {
  Upload,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  Volume2,
  CheckCircle2,
  ArrowRight,
  Disc3,
  SlidersHorizontal,
  Flame,
  Radio,
  Music,
  Headphones,
  Mic,
  Zap,
  Layers,
} from 'lucide-react';
import { WaveformDisplay } from './WaveformDisplay';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';
import { ExportModal } from './ExportModal';
import {
  masterEngine,
  MasteringDspState,
} from '../audio/dsp-engine';
import {
  MASTERING_PROFILES,
  MasteringProfileId,
  analyzeAudioBufferForMastering,
  generateAutomatedDspState,
  AudioAnalysisResult,
} from '../audio/auto-mastering';
import { encodeWAV, downloadBlob, BitDepth } from '../audio/audio-encoder';
import { generateDemoAudio } from '../audio/demo-audio';

interface EasyMasteringViewProps {
  onSwitchToPro: () => void;
  onSwitchToMultitrack?: () => void;
}

export const EasyMasteringView: React.FC<EasyMasteringViewProps> = ({
  onSwitchToPro,
  onSwitchToMultitrack,
}) => {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('No track loaded');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Profile & Analysis
  const [selectedProfile, setSelectedProfile] = useState<MasteringProfileId>('streaming');
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [isMasterApplied, setIsMasterApplied] = useState<boolean>(false);
  const [isBypassed, setIsBypassed] = useState<boolean>(false); // A/B Audition (true = Original, false = Mastered)

  // Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Load initial demo buffer so the user has immediate audio to test with
  useEffect(() => {
    const existing = masterEngine.getAudioBuffer();
    if (existing) {
      setBuffer(existing);
      setDuration(existing.duration);
      setFileName('Loaded Song');
      const analysis = analyzeAudioBufferForMastering(existing, selectedProfile);
      setAnalysisResult(analysis);
    } else {
      masterEngine.initAudioContext().then((ctx) => {
        const demo = generateDemoAudio(ctx);
        setBuffer(demo.fullMaster);
        setFileName('AudioForge_Demo_Song_Am_Groove.wav');
        setDuration(demo.fullMaster.duration);
        masterEngine.loadAudioBuffer(demo.fullMaster);

        const analysis = analyzeAudioBufferForMastering(demo.fullMaster, selectedProfile);
        setAnalysisResult(analysis);

        const dsp = generateAutomatedDspState(analysis, selectedProfile);
        masterEngine.updateState(dsp);
        setIsMasterApplied(true);
      });
    }
  }, []);

  // Update playback time ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPlaying(masterEngine.getIsPlaying());
      setCurrentTime(masterEngine.getCurrentTime());
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleSelectProfile = (id: MasteringProfileId) => {
    setSelectedProfile(id);
    if (buffer) {
      const analysis = analyzeAudioBufferForMastering(buffer, id);
      setAnalysisResult(analysis);
      if (isMasterApplied) {
        const dsp = generateAutomatedDspState(analysis, id);
        masterEngine.updateState(dsp);
      }
    }
  };

  const handleApplyMaster = () => {
    if (!buffer) return;
    const analysis = analyzeAudioBufferForMastering(buffer, selectedProfile);
    setAnalysisResult(analysis);
    const dsp = generateAutomatedDspState(analysis, selectedProfile);
    masterEngine.updateState({ ...dsp, bypass: false });
    setIsMasterApplied(true);
    setIsBypassed(false);
  };

  const handleToggleBypass = () => {
    const nextBypass = !isBypassed;
    setIsBypassed(nextBypass);
    masterEngine.updateState({ bypass: nextBypass });
  };

  // File Upload Handler (WAV, MP3, FLAC, etc.)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ctx = await masterEngine.initAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      setBuffer(decodedBuffer);
      setFileName(file.name);
      setDuration(decodedBuffer.duration);
      masterEngine.loadAudioBuffer(decodedBuffer);

      // Auto analyze and auto master
      const analysis = analyzeAudioBufferForMastering(decodedBuffer, selectedProfile);
      setAnalysisResult(analysis);
      const dsp = generateAutomatedDspState(analysis, selectedProfile);
      masterEngine.updateState(dsp);
      setIsMasterApplied(true);
      setIsBypassed(false);
    } catch (err) {
      console.error('Audio decode error:', err);
    }
  };

  // Load Demo Song
  const handleLoadDemo = async () => {
    const ctx = await masterEngine.initAudioContext();
    const demo = generateDemoAudio(ctx);
    setBuffer(demo.fullMaster);
    setFileName('AudioForge_Demo_Song_Am_Groove.wav');
    setDuration(demo.fullMaster.duration);
    masterEngine.loadAudioBuffer(demo.fullMaster);

    const analysis = analyzeAudioBufferForMastering(demo.fullMaster, selectedProfile);
    setAnalysisResult(analysis);
    const dsp = generateAutomatedDspState(analysis, selectedProfile);
    masterEngine.updateState(dsp);
    setIsMasterApplied(true);
    setIsBypassed(false);
  };

  // Render callback for ExportModal
  const handleRenderCallback = async (options: {
    filename: string;
    bitDepth: BitDepth;
    sampleRate: number;
    normalize: boolean;
  }) => {
    if (!buffer) throw new Error('No audio loaded to export');
    const dspState = masterEngine.getState();
    const renderedBuffer = await masterEngine.renderMasterOffline(buffer, {
      ...dspState,
      bypass: false,
    });

    const wavBlob = encodeWAV(renderedBuffer, {
      bitDepth: options.bitDepth,
      normalize: options.normalize,
      sampleRate: options.sampleRate,
    });

    return { blob: wavBlob, renderedBuffer };
  };

  const getProfileIcon = (id: MasteringProfileId) => {
    switch (id) {
      case 'edm':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'streaming':
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case 'pop':
        return <Sparkles className="w-4 h-4 text-pink-400" />;
      case 'rock':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'acoustic':
        return <Music className="w-4 h-4 text-sky-400" />;
      case 'voice':
        return <Mic className="w-4 h-4 text-violet-400" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Banner / File Loader */}
      <div className="bg-[#121622] rounded-2xl border border-white/10 p-4 md:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Disc3
                className="w-6 h-6 text-amber-400 animate-spin"
                style={{ animationDuration: isPlaying ? '3s' : '0s' }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  LOADED SONG
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-zinc-300 font-mono">
                  {buffer ? `${buffer.sampleRate / 1000}kHz / ${buffer.numberOfChannels}ch` : 'No file'}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                {fileName}
              </h2>
            </div>
          </div>

          {/* Import / Demo Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-zinc-200 cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Import Audio File</span>
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {onSwitchToMultitrack && (
              <button
                onClick={onSwitchToMultitrack}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-semibold text-sky-300 transition-all cursor-pointer"
                title="Work with multiple stems or instrument tracks"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-Track Stems</span>
              </button>
            )}

            <button
              onClick={handleLoadDemo}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 transition-all cursor-pointer"
            >
              <Music className="w-4 h-4" />
              <span>Reload Demo</span>
            </button>
          </div>
        </div>

        {/* Waveform Player Section */}
        <div className="mt-5 space-y-2">
          <WaveformDisplay
            buffer={buffer}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onSeek={(t) => masterEngine.seek(t)}
            height={85}
            color="#f59e0b"
          />

          {/* Player Controls & A/B Comparison Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => (isPlaying ? masterEngine.pause() : masterEngine.play())}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                onClick={() => masterEngine.stop()}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-all"
                title="Stop & Return to 0:00"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* A / B Audition Switch */}
            <div className="flex items-center bg-[#090c12] p-1 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono font-bold text-zinc-500 px-2 uppercase">
                AUDITION:
              </span>
              <button
                onClick={handleToggleBypass}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isBypassed
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>MASTERED</span>
              </button>
              <button
                onClick={handleToggleBypass}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isBypassed
                    ? 'bg-slate-300 text-black shadow-md shadow-white/20'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>ORIGINAL (A/B)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Target Mastering Profile Selector */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Step 1: Choose Target Commercial Profile
          </h3>
          <p className="text-xs text-zinc-400">
            AudioForge AI analyzes your mix and tailors EQ curves, dynamic glue, and loudness to standard delivery targets.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {MASTERING_PROFILES.map((p) => {
            const isSelected = selectedProfile === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectProfile(p.id)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-[#121622] border-white/10 hover:border-white/20 hover:bg-[#161c2c]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-black/40 border border-white/10">
                    {getProfileIcon(p.id)}
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-amber-500 text-black' : 'bg-white/10 text-zinc-300'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight mb-1">
                    {p.name}
                  </h4>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time Spectrum Analyzer & Autonomous DSP Analysis Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Spectrum Display */}
        <div className="lg:col-span-7 space-y-3">
          <SpectrumAnalyzer isPlaying={isPlaying} height={200} showComparison={true} />
        </div>

        {/* Right: Autonomous DSP Insights & One-Click Master */}
        <div className="lg:col-span-5 bg-[#121622] rounded-2xl border border-white/10 p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AUTONOMOUS DSP RECOMMENDATION
              </span>
              {isMasterApplied && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> APPLIED
                </span>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-zinc-400 font-mono block">INPUT LUFS</span>
                <span className="text-sm font-bold font-mono text-zinc-200">
                  {analysisResult?.currentLufs || -18.5} <span className="text-[9px]">LUFS</span>
                </span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-zinc-400 font-mono block">TARGET</span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {MASTERING_PROFILES.find((p) => p.id === selectedProfile)?.targetLufs}{' '}
                  <span className="text-[9px]">LUFS</span>
                </span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-zinc-400 font-mono block">PEAK CEILING</span>
                <span className="text-sm font-bold font-mono text-sky-400">
                  {MASTERING_PROFILES.find((p) => p.id === selectedProfile)?.ceilingDb}{' '}
                  <span className="text-[9px]">dBTP</span>
                </span>
              </div>
            </div>

            {/* Recommended Treatments */}
            <div className="space-y-2 text-xs bg-black/40 p-3 rounded-xl border border-white/5 mb-4">
              <div className="text-[11px] font-bold text-zinc-300 mb-1">Computed DSP Adjustments:</div>
              {analysisResult?.recommendations.eqHighlights.map((note, i) => (
                <div key={i} className="flex items-center gap-2 text-zinc-400 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{note}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-sky-300 text-[11px] pt-1 border-t border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>{analysisResult?.recommendations.dynamicTreatment}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleApplyMaster}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-black" />
              <span>APPLY AUTONOMOUS MASTERING</span>
            </button>

            <button
              onClick={onSwitchToPro}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-all border border-white/10 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Fine-Tune in Pro Mode (5-Band EQ & Limiter)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Step 3: Export Master Card */}
      <div className="bg-[#121622] rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            Step 3: Export Mastered Audio (Real 32-bit Float WAV)
          </h3>
          <p className="text-xs text-zinc-400">
            Choose custom filenames, bit depth, and sample rate. Audio is rendered with exact EQ, dynamic compression, and ceiling limits baked in.
          </p>
        </div>

        <button
          onClick={() => setIsExportModalOpen(true)}
          disabled={!buffer}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>CONFIGURE & EXPORT MASTER WAV</span>
        </button>
      </div>

      {/* Custom Filename Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultFilename={`${fileName.replace(/\.[^/.]+$/, '')}_Mastered_${selectedProfile.toUpperCase()}`}
        modalTitle="Export Mastered Track (WAV)"
        onRender={handleRenderCallback}
        onLoadExportedAudio={(newBuf, newName) => {
          setBuffer(newBuf);
          setFileName(newName);
          setDuration(newBuf.duration);
          masterEngine.loadAudioBuffer(newBuf);
          const analysis = analyzeAudioBufferForMastering(newBuf, selectedProfile);
          setAnalysisResult(analysis);
        }}
      />
    </div>
  );
};
