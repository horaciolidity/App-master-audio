import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Volume2,
  Sliders,
  Download,
  Sparkles,
  Save,
  FolderOpen,
  Music,
  ArrowRight,
  Disc3,
  SlidersHorizontal,
} from 'lucide-react';
import { Fader } from './Fader';
import { Knob } from './Knob';
import {
  multitrackEngine,
  TrackData,
} from '../audio/multitrack-engine';
import { masterEngine } from '../audio/dsp-engine';
import { generateDemoAudio } from '../audio/demo-audio';
import { encodeWAV, downloadBlob } from '../audio/audio-encoder';

interface MultitrackMixerViewProps {
  onSendToMastering: () => void;
}

export const MultitrackMixerView: React.FC<MultitrackMixerViewProps> = ({
  onSendToMastering,
}) => {
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(12);
  const [masterVol, setMasterVol] = useState<number>(0);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('My AudioForge Session');
  const [isRendering, setIsRendering] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with demo stems
  useEffect(() => {
    multitrackEngine.initContext().then((ctx) => {
      const demo = generateDemoAudio(ctx);
      const demoTracks: TrackData[] = demo.stems.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        buffer: s.buffer,
        volumeDb: 0,
        pan: 0,
        mute: false,
        solo: false,
        eqLow: 0,
        eqMid: 0,
        eqHigh: 0,
        reverbSend: 0.15,
        delaySend: 0.05,
      }));

      multitrackEngine.setTracks(demoTracks);
      setTracks(demoTracks);
      setSelectedTrackId(demoTracks[0]?.id || null);
      setDuration(multitrackEngine.getMaxDuration());
    });
  }, []);

  // Sync playhead interval
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPlaying(multitrackEngine.getIsPlaying());
      setCurrentTime(multitrackEngine.getCurrentTime());
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      multitrackEngine.pause();
    } else {
      multitrackEngine.play();
    }
  };

  const handleStop = () => {
    multitrackEngine.stop();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const norm = Math.max(0, Math.min(1, clickX / rect.width));
    multitrackEngine.seek(norm * duration);
  };

  const handleUpdateTrack = (trackId: string, updates: Partial<TrackData>) => {
    multitrackEngine.updateTrack(trackId, updates);
    setTracks([...multitrackEngine.getTracks()]);
  };

  const handleAddCustomTrack = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ctx = await multitrackEngine.initContext();
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      const colors = ['#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#EC4899'];
      const newTrack: TrackData = {
        id: `track-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        color: colors[tracks.length % colors.length],
        buffer: decodedBuffer,
        volumeDb: 0,
        pan: 0,
        mute: false,
        solo: false,
        eqLow: 0,
        eqMid: 0,
        eqHigh: 0,
        reverbSend: 0.1,
        delaySend: 0,
      };

      multitrackEngine.addTrack(newTrack);
      const updated = multitrackEngine.getTracks();
      setTracks([...updated]);
      setSelectedTrackId(newTrack.id);
      setDuration(multitrackEngine.getMaxDuration());
    } catch (err) {
      console.error('Track file decode error:', err);
    }
  };

  const handleDeleteTrack = (trackId: string) => {
    multitrackEngine.removeTrack(trackId);
    const updated = multitrackEngine.getTracks();
    setTracks([...updated]);
    if (selectedTrackId === trackId) {
      setSelectedTrackId(updated[0]?.id || null);
    }
  };

  // Render the complete mixdown offline into a WAV
  const handleRenderMix = async () => {
    setIsRendering(true);
    try {
      const renderedBuffer = await multitrackEngine.renderMixOffline();
      const wavBlob = encodeWAV(renderedBuffer, {
        bitDepth: 24,
        normalize: true,
        sampleRate: renderedBuffer.sampleRate,
      });
      downloadBlob(wavBlob, `${projectName.replace(/\s+/g, '_')}_Mixdown.wav`);
    } catch (err) {
      console.error('Mix render error:', err);
    } finally {
      setIsRendering(false);
    }
  };

  // Master Resulting Mix: Renders multitrack mixdown and loads directly into Mastering Engine!
  const handleMasterMix = async () => {
    setIsRendering(true);
    try {
      const renderedBuffer = await multitrackEngine.renderMixOffline();
      masterEngine.loadAudioBuffer(renderedBuffer);
      onSendToMastering();
    } catch (err) {
      console.error('Master mix error:', err);
    } finally {
      setIsRendering(false);
    }
  };

  // Save Project as .forgeproj JSON
  const handleSaveProject = () => {
    const projectData = {
      version: '1.0',
      projectName,
      masterVolumeDb: masterVol,
      tracks: tracks.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        volumeDb: t.volumeDb,
        pan: t.pan,
        mute: t.mute,
        solo: t.solo,
        eqLow: t.eqLow,
        eqMid: t.eqMid,
        eqHigh: t.eqHigh,
        reverbSend: t.reverbSend,
        delaySend: t.delaySend,
      })),
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    downloadBlob(blob, `${projectName.replace(/\s+/g, '_')}.forgeproj`);
  };

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Transport & Project Toolbar */}
      <div className="bg-[#121622] rounded-2xl border border-white/10 p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Disc3 className="w-5 h-5 animate-spin" style={{ animationDuration: isPlaying ? '2s' : '0s' }} />
          </div>
          <div>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent font-bold text-base text-white border-b border-white/10 focus:border-amber-500 outline-none px-1"
            />
            <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
              {tracks.length} Synchronized Tracks • 48.0 kHz 32-bit Float Bus
            </span>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#090c12] rounded-xl p-1 border border-white/10">
            <button
              onClick={handlePlayPause}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              onClick={handleStop}
              className="p-2 text-zinc-300 hover:text-white rounded-lg hover:bg-white/5"
              title="Stop & Return to Zero"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-mono font-bold text-amber-400">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Project Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveProject}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-all"
              title="Save Project (.forgeproj)"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Save Project</span>
            </button>

            <button
              onClick={handleRenderMix}
              disabled={isRendering || tracks.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>{isRendering ? 'Rendering...' : 'Render Mix'}</span>
            </button>

            <button
              onClick={handleMasterMix}
              disabled={isRendering || tracks.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              title="Render mixdown and send directly to Single-File Mastering Suite"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>MASTER RESULTING MIX</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multitrack Timeline & Waveform Lanes */}
      <div className="bg-[#121622] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {/* Timeline Header & Add Track Button */}
        <div className="bg-[#0b0e15] px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
              TIMELINE & TRACK LANES
            </span>
          </div>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer transition-all">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Audio Track (WAV / MP3)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.flac"
              onChange={handleAddCustomTrack}
              className="hidden"
            />
          </label>
        </div>

        {/* Global Timeline Ruler */}
        <div
          onClick={handleSeek}
          className="relative h-6 bg-[#090b10] border-b border-white/10 cursor-pointer overflow-hidden flex items-center select-none"
        >
          {/* Ticks */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((sec) => (
            <div
              key={sec}
              className="absolute text-[9px] font-mono text-zinc-500 border-l border-white/10 h-full pl-1 pt-0.5"
              style={{ left: `${(sec / duration) * 100}%` }}
            >
              {sec}s
            </div>
          ))}

          {/* Playhead Marker */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-amber-400 z-10 shadow-[0_0_8px_rgba(245,158,11,1)]"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* Track Rows */}
        <div className="divide-y divide-white/5 max-h-[380px] overflow-y-auto">
          {tracks.map((track) => {
            const isSelected = selectedTrackId === track.id;
            const anySolo = tracks.some((t) => t.solo);
            const isAudible = !track.mute && (!anySolo || track.solo);

            return (
              <div
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                className={`flex items-center transition-colors cursor-pointer ${
                  isSelected ? 'bg-amber-500/10' : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Track Left Info & Solo/Mute Buttons */}
                <div className="w-56 p-3 flex flex-col justify-between border-r border-white/10 bg-[#0d1017] shrink-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: track.color }}
                      />
                      <span className="text-xs font-bold text-white truncate" title={track.name}>
                        {track.name}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrack(track.id);
                      }}
                      className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                      title="Remove Track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateTrack(track.id, { mute: !track.mute });
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                        track.mute ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      MUTE
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateTrack(track.id, { solo: !track.solo });
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                        track.solo ? 'bg-amber-500 text-black' : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      SOLO
                    </button>

                    <span className="text-[10px] font-mono text-zinc-400 ml-auto">
                      {track.volumeDb > 0 ? `+${track.volumeDb}` : track.volumeDb} dB
                    </span>
                  </div>
                </div>

                {/* Track Waveform Lane */}
                <div
                  onClick={handleSeek}
                  className="flex-1 h-14 relative overflow-hidden bg-[#0a0d14] p-1 flex items-center"
                >
                  {/* Waveform peaks visualization */}
                  <div className={`flex items-center justify-between w-full h-full gap-[2px] px-2 ${!isAudible ? 'opacity-30' : ''}`}>
                    {track.waveformData?.map((peak, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-full transition-all"
                        style={{
                          height: `${Math.max(4, peak * 90)}%`,
                          backgroundColor: track.color,
                          opacity: 0.8,
                        }}
                      />
                    ))}
                  </div>

                  {/* Playhead in Track Lane */}
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-white z-10 pointer-events-none"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Track Channel Strip & Master Bus Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Selected Track Inspector & DSP Rack */}
        <div className="lg:col-span-8 bg-[#121622] rounded-2xl border border-white/10 p-5 shadow-xl">
          {selectedTrack ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTrack.color }} />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    CHANNEL STRIP: {selectedTrack.name}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  3-Band Equalizer & FX Sends
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-6 pt-2">
                {/* 3-Band Channel EQ */}
                <div className="flex items-center gap-4 bg-[#0b0e15] p-3 rounded-xl border border-white/5">
                  <Knob
                    label="LOW (200Hz)"
                    value={selectedTrack.eqLow}
                    min={-12}
                    max={12}
                    step={0.5}
                    unit="dB"
                    size={46}
                    color="#f59e0b"
                    defaultValue={0}
                    onChange={(v) => handleUpdateTrack(selectedTrack.id, { eqLow: v })}
                  />

                  <Knob
                    label="MID (1.2kHz)"
                    value={selectedTrack.eqMid}
                    min={-12}
                    max={12}
                    step={0.5}
                    unit="dB"
                    size={46}
                    color="#38bdf8"
                    defaultValue={0}
                    onChange={(v) => handleUpdateTrack(selectedTrack.id, { eqMid: v })}
                  />

                  <Knob
                    label="HIGH (6kHz)"
                    value={selectedTrack.eqHigh}
                    min={-12}
                    max={12}
                    step={0.5}
                    unit="dB"
                    size={46}
                    color="#a855f7"
                    defaultValue={0}
                    onChange={(v) => handleUpdateTrack(selectedTrack.id, { eqHigh: v })}
                  />
                </div>

                {/* Pan & Sends */}
                <div className="flex items-center gap-4 bg-[#0b0e15] p-3 rounded-xl border border-white/5">
                  <Knob
                    label="PAN"
                    value={selectedTrack.pan}
                    min={-1}
                    max={1}
                    step={0.05}
                    unit=""
                    size={46}
                    color="#10b981"
                    defaultValue={0}
                    onChange={(v) => handleUpdateTrack(selectedTrack.id, { pan: v })}
                  />

                  <Knob
                    label="REVERB"
                    value={selectedTrack.reverbSend * 100}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    size={46}
                    color="#ec4899"
                    defaultValue={15}
                    onChange={(v) => handleUpdateTrack(selectedTrack.id, { reverbSend: v / 100 })}
                  />

                  <Knob
                    label="DELAY"
                    value={selectedTrack.delaySend * 100}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    size={46}
                    color="#6366f1"
                    defaultValue={5}
                    onChange={(v) => handleUpdateTrack(selectedTrack.id, { delaySend: v / 100 })}
                  />
                </div>

                {/* Track Fader */}
                <Fader
                  valueDb={selectedTrack.volumeDb}
                  onChange={(db) => handleUpdateTrack(selectedTrack.id, { volumeDb: db })}
                  height={140}
                  color={selectedTrack.color}
                  label="TRK FADER"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Select a track above to adjust EQ, Pan, and Channel Volume.
            </div>
          )}
        </div>

        {/* Master Bus Console Strip */}
        <div className="lg:col-span-4 bg-[#121622] rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4" />
                MASTER MIX BUS
              </span>
              <span className="text-[10px] font-mono text-zinc-400">Summing Amp</span>
            </div>

            <div className="flex items-center justify-around">
              <Fader
                valueDb={masterVol}
                onChange={(db) => {
                  setMasterVol(db);
                  multitrackEngine.setMasterVolume(db);
                }}
                height={150}
                color="#f59e0b"
                label="MASTER"
              />

              <div className="space-y-3 text-right">
                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[9px] font-mono text-zinc-400 block">SUMMING HEADROOM</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">+3.2 dB</span>
                </div>
                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[9px] font-mono text-zinc-400 block">PANNING LAW</span>
                  <span className="text-xs font-bold font-mono text-zinc-200">-3dB Equal Power</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              onClick={handleMasterMix}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-black" />
              <span>ROUTE MIX TO MASTERING SUITE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
