import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Sparkles,
  Volume2,
  Sliders,
  Maximize2,
  Activity,
  Layers,
  ArrowRight,
  Upload,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { Knob } from './Knob';
import { EqCurveCanvas } from './EqCurveCanvas';
import { CompressorCurveCanvas } from './CompressorCurveCanvas';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';
import { WaveformDisplay } from './WaveformDisplay';
import { AudioMeter } from './AudioMeter';
import { ExportModal } from './ExportModal';
import {
  masterEngine,
  MasteringDspState,
  EqBandConfig,
  CompressorConfig,
  LimiterConfig,
} from '../audio/dsp-engine';
import { encodeWAV, downloadBlob, BitDepth } from '../audio/audio-encoder';
import { generateDemoAudio } from '../audio/demo-audio';

export const ProMasteringSuite: React.FC = () => {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('Mastering Session');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // DSP State
  const [dspState, setDspState] = useState<MasteringDspState>(masterEngine.getState());
  const [gainReductionDb, setGainReductionDb] = useState<number>(0);

  // Metering values
  const [lufsValues, setLufsValues] = useState({
    integratedLufs: -14.2,
    shortTermLufs: -13.8,
    momentaryLufs: -14.0,
    peakDb: -0.3,
    truePeakDb: -0.1,
    dynamicRangeLu: 8.5,
  });

  const [meterL, setMeterL] = useState<number>(-60);
  const [meterR, setMeterR] = useState<number>(-60);

  // Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    const currentBuf = masterEngine.getAudioBuffer();
    if (currentBuf) {
      setBuffer(currentBuf);
      setDuration(currentBuf.duration);
      setFileName('Loaded Song');
      const metrics = masterEngine.analyzeLoudness(currentBuf);
      setLufsValues(metrics);
    } else {
      masterEngine.initAudioContext().then((ctx) => {
        const demo = generateDemoAudio(ctx);
        setBuffer(demo.fullMaster);
        setDuration(demo.fullMaster.duration);
        setFileName('AudioForge_Demo_Song.wav');
        masterEngine.loadAudioBuffer(demo.fullMaster);
        const metrics = masterEngine.analyzeLoudness(demo.fullMaster);
        setLufsValues(metrics);
      });
    }
  }, []);

  // Real-time animation ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const playing = masterEngine.getIsPlaying();
      setIsPlaying(playing);
      setCurrentTime(masterEngine.getCurrentTime());

      if (playing) {
        const gr = masterEngine.getCurrentGainReduction();
        setGainReductionDb(gr);
        const baseLevel = -6 + (dspState.masterGain || 0);
        setMeterL(Math.min(0, baseLevel + (Math.random() * 4 - 2)));
        setMeterR(Math.min(0, baseLevel + (Math.random() * 4 - 2)));
      } else {
        setGainReductionDb(0);
        setMeterL(-60);
        setMeterR(-60);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [dspState.masterGain]);

  const updateDsp = (updates: Partial<MasteringDspState>) => {
    const nextState = { ...dspState, ...updates };
    setDspState(nextState);
    masterEngine.updateState(updates);
  };

  const handleUpdateBand = (bandIndex: number, updates: Partial<EqBandConfig>) => {
    const newBands = [...dspState.eqBands];
    newBands[bandIndex] = { ...newBands[bandIndex], ...updates };
    updateDsp({ eqBands: newBands });
  };

  const handleUpdateComp = (updates: Partial<CompressorConfig>) => {
    updateDsp({ compressor: { ...dspState.compressor, ...updates } });
  };

  const handleUpdateLimiter = (updates: Partial<LimiterConfig>) => {
    updateDsp({ limiter: { ...dspState.limiter, ...updates } });
  };

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

      const metrics = masterEngine.analyzeLoudness(decodedBuffer);
      setLufsValues(metrics);
    } catch (err) {
      console.error('Audio decode error:', err);
    }
  };

  // Render callback for ExportModal
  const handleRenderCallback = async (options: {
    filename: string;
    bitDepth: BitDepth;
    sampleRate: number;
    normalize: boolean;
  }) => {
    if (!buffer) throw new Error('No audio loaded to export');
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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Session Ribbon & Waveform */}
      <div className="bg-[#121622] rounded-2xl border border-white/10 p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-amber-500 text-black px-2 py-0.5 rounded uppercase">
              PRO MASTERING SUITE
            </span>
            <span className="text-sm font-bold text-white tracking-tight">{fileName}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Import Audio File</span>
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => updateDsp({ bypass: !dspState.bypass })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                dspState.bypass
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <span>{dspState.bypass ? 'DSP BYPASSED (A/B)' : 'DSP ENGAGED'}</span>
            </button>
          </div>
        </div>

        <WaveformDisplay
          buffer={buffer}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          onSeek={(t) => masterEngine.seek(t)}
          height={75}
        />

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => (isPlaying ? masterEngine.pause() : masterEngine.play())}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              onClick={() => masterEngine.stop()}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT MASTERED WAV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Rack: 5-Band Parametric EQ & Interactive Curve */}
      <div className="bg-[#121622] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              MODULE 1: 5-BAND PRECISION PARAMETRIC EQUALIZER
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
            Direct Form II Transposed Biquads • Interactive Touch/Mouse
          </span>
        </div>

        {/* EQ Interactive Graph */}
        <EqCurveCanvas
          bands={dspState.eqBands}
          onChangeBand={handleUpdateBand}
          height={190}
        />

        {/* 5 Band Knobs Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {dspState.eqBands.map((band, idx) => {
            const labels = ['Band 1: Low Shelf', 'Band 2: Low-Mid', 'Band 3: Mid Presence', 'Band 4: High-Mid', 'Band 5: High Shelf'];
            return (
              <div
                key={band.id}
                className="bg-[#0b0e15] p-3 rounded-xl border border-white/5 flex flex-col items-center justify-between"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[10px] font-mono font-bold text-amber-400">
                    {labels[idx]}
                  </span>
                  <input
                    type="checkbox"
                    checked={band.enabled}
                    onChange={(e) => handleUpdateBand(idx, { enabled: e.target.checked })}
                    className="accent-amber-500 rounded cursor-pointer"
                    title="Enable/Bypass band"
                  />
                </div>

                {/* Filter Type Toggle */}
                <div className="w-full flex justify-center mb-2">
                  <select
                    value={band.type}
                    onChange={(e) => handleUpdateBand(idx, { type: e.target.value as BiquadFilterType })}
                    className="bg-black/60 text-[9px] font-mono text-zinc-300 border border-white/10 rounded px-1.5 py-0.5 outline-none"
                  >
                    <option value="lowshelf">Low Shelf</option>
                    <option value="peaking">Peaking/Bell</option>
                    <option value="highshelf">High Shelf</option>
                    <option value="highpass">High Pass</option>
                    <option value="lowpass">Low Pass</option>
                  </select>
                </div>

                <div className="flex items-center justify-around w-full mt-1">
                  <Knob
                    label="FREQ"
                    value={band.freq}
                    min={20}
                    max={20000}
                    step={idx === 0 ? 1 : 10}
                    unit="Hz"
                    size={44}
                    color="#f59e0b"
                    isLogarithmic={true}
                    onChange={(f) => handleUpdateBand(idx, { freq: f })}
                  />

                  <Knob
                    label="GAIN"
                    value={band.gain}
                    min={-15}
                    max={15}
                    step={0.1}
                    unit="dB"
                    size={44}
                    color="#f59e0b"
                    defaultValue={0}
                    onChange={(g) => handleUpdateBand(idx, { gain: g })}
                  />

                  <Knob
                    label="Q"
                    value={band.q}
                    min={0.1}
                    max={8}
                    step={0.1}
                    defaultValue={0.707}
                    size={44}
                    color="#38bdf8"
                    onChange={(q) => handleUpdateBand(idx, { q })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamics Section: Compressor + Lookahead Limiter + Loudness Metering */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Module 2: Studio Dynamics Compressor */}
        <div className="lg:col-span-5 bg-[#121622] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              MODULE 2: DYNAMICS COMPRESSOR
            </span>
            <label className="flex items-center gap-1 text-[10px] font-mono text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={dspState.compressor.enabled}
                onChange={(e) => handleUpdateComp({ enabled: e.target.checked })}
                className="accent-sky-500 rounded"
              />
              <span>ENGAGE</span>
            </label>
          </div>

          <CompressorCurveCanvas
            config={dspState.compressor}
            gainReductionDb={gainReductionDb}
            height={130}
          />

          {/* Compressor Knobs Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 bg-[#0b0e15] p-3 rounded-xl border border-white/5">
            <Knob
              label="THRESH"
              value={dspState.compressor.threshold}
              min={-40}
              max={0}
              step={0.5}
              unit="dB"
              size={42}
              color="#38bdf8"
              defaultValue={-16}
              onChange={(v) => handleUpdateComp({ threshold: v })}
            />
            <Knob
              label="RATIO"
              value={dspState.compressor.ratio}
              min={1}
              max={20}
              step={0.1}
              unit=":1"
              size={42}
              color="#38bdf8"
              defaultValue={2.5}
              onChange={(v) => handleUpdateComp({ ratio: v })}
            />
            <Knob
              label="ATTACK"
              value={Number((dspState.compressor.attack * 1000).toFixed(0))}
              min={1}
              max={100}
              step={1}
              unit="ms"
              size={42}
              color="#38bdf8"
              defaultValue={25}
              onChange={(v) => handleUpdateComp({ attack: v / 1000 })}
            />
            <Knob
              label="RELEASE"
              value={Number((dspState.compressor.release * 1000).toFixed(0))}
              min={20}
              max={800}
              step={10}
              unit="ms"
              size={42}
              color="#38bdf8"
              defaultValue={140}
              onChange={(v) => handleUpdateComp({ release: v / 1000 })}
            />
            <Knob
              label="KNEE"
              value={dspState.compressor.knee}
              min={0}
              max={30}
              step={1}
              unit="dB"
              size={42}
              color="#38bdf8"
              defaultValue={6}
              onChange={(v) => handleUpdateComp({ knee: v })}
            />
            <Knob
              label="MAKEUP"
              value={dspState.compressor.makeupGain}
              min={0}
              max={15}
              step={0.5}
              unit="dB"
              size={42}
              color="#f59e0b"
              defaultValue={2.5}
              onChange={(v) => handleUpdateComp({ makeupGain: v })}
            />
          </div>
        </div>

        {/* Module 3: Lookahead Brickwall Limiter & Master Bus */}
        <div className="lg:col-span-4 bg-[#121622] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5" />
              MODULE 3: BRICKWALL LIMITER
            </span>
            <label className="flex items-center gap-1 text-[10px] font-mono text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={dspState.limiter.enabled}
                onChange={(e) => handleUpdateLimiter({ enabled: e.target.checked })}
                className="accent-amber-500 rounded"
              />
              <span>ENGAGE</span>
            </label>
          </div>

          <div className="space-y-3 bg-[#0b0e15] p-4 rounded-xl border border-white/5">
            <div className="grid grid-cols-2 gap-4">
              <Knob
                label="CEILING"
                value={dspState.limiter.ceiling}
                min={-6}
                max={0}
                step={0.1}
                unit="dBTP"
                size={50}
                color="#ef4444"
                defaultValue={-0.3}
                onChange={(v) => handleUpdateLimiter({ ceiling: v })}
              />

              <Knob
                label="RELEASE"
                value={Number((dspState.limiter.release * 1000).toFixed(0))}
                min={10}
                max={400}
                step={5}
                unit="ms"
                size={50}
                color="#f59e0b"
                defaultValue={80}
                onChange={(v) => handleUpdateLimiter({ release: v / 1000 })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <Knob
                label="STEREO WIDTH"
                value={dspState.stereoWidth}
                min={0}
                max={2}
                step={0.05}
                unit="x"
                size={46}
                color="#a855f7"
                defaultValue={1.0}
                onChange={(v) => updateDsp({ stereoWidth: v })}
              />

              <Knob
                label="MASTER GAIN"
                value={dspState.masterGain}
                min={-12}
                max={12}
                step={0.2}
                unit="dB"
                size={46}
                color="#f59e0b"
                defaultValue={0}
                onChange={(v) => updateDsp({ masterGain: v })}
              />
            </div>
          </div>
        </div>

        {/* Module 4: ITU-R BS.1770 Broadcast Loudness & Peak Metering */}
        <div className="lg:col-span-3 bg-[#121622] rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Volume2 className="w-3.5 h-3.5" />
              ITU-R BS.1770 METERS
            </span>

            <div className="flex items-center justify-between gap-3 mb-4">
              <AudioMeter levelDbL={meterL} levelDbR={meterR} height={120} label="PEAK" />

              <div className="flex-1 space-y-2 text-right">
                <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                  <span className="text-[9px] font-mono text-zinc-400 block">INTEGRATED</span>
                  <span className="text-base font-bold font-mono text-amber-400">
                    {lufsValues.integratedLufs} <span className="text-[10px]">LUFS</span>
                  </span>
                </div>

                <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                  <span className="text-[9px] font-mono text-zinc-400 block">SHORT TERM</span>
                  <span className="text-sm font-bold font-mono text-zinc-200">
                    {lufsValues.shortTermLufs} <span className="text-[10px]">LUFS</span>
                  </span>
                </div>

                <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                  <span className="text-[9px] font-mono text-zinc-400 block">TRUE PEAK</span>
                  <span className="text-sm font-bold font-mono text-sky-400">
                    {lufsValues.truePeakDb} <span className="text-[10px]">dBTP</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-400 bg-black/40 p-2 rounded-lg border border-white/5 flex items-center justify-between">
            <span>DYNAMIC RANGE:</span>
            <span className="text-zinc-200 font-bold">{lufsValues.dynamicRangeLu} LU</span>
          </div>
        </div>
      </div>

      {/* Custom Filename Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultFilename={`${fileName.replace(/\.[^/.]+$/, '')}_ProMaster`}
        modalTitle="Export Mastered Track (WAV)"
        onRender={handleRenderCallback}
        onLoadExportedAudio={(newBuf, newName) => {
          setBuffer(newBuf);
          setFileName(newName);
          setDuration(newBuf.duration);
          masterEngine.loadAudioBuffer(newBuf);
          const metrics = masterEngine.analyzeLoudness(newBuf);
          setLufsValues(metrics);
        }}
      />
    </div>
  );
};
