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
  Music,
  ArrowRight,
  Disc3,
  SlidersHorizontal,
  Upload,
  Layers,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Fader } from './Fader';
import { Knob } from './Knob';
import { ExportModal } from './ExportModal';
import {
  multitrackEngine,
  TrackData,
  MasterBusState,
} from '../audio/multitrack-engine';
import { masterEngine } from '../audio/dsp-engine';
import { generateDemoAudio } from '../audio/demo-audio';
import { encodeWAV, downloadBlob } from '../audio/audio-encoder';

interface MultitrackMixerViewProps {
  onSendToMastering: (renderedBuffer: AudioBuffer, trackName: string) => void;
}

export const MultitrackMixerView: React.FC<MultitrackMixerViewProps> = ({
  onSendToMastering,
}) => {
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(12);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('AudioForge_Multitrack_Session');
  const [isDragOver, setIsDragOver] = useState(false);

  // Master Channel state
  const [masterState, setMasterState] = useState<MasterBusState>(multitrackEngine.getMasterState());

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRoutingToMaster, setIsRoutingToMaster] = useState(false);

  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Load initial demo stems if empty
  useEffect(() => {
    const existing = multitrackEngine.getTracks();
    if (existing.length > 0) {
      setTracks(existing);
      setSelectedTrackId(existing[0].id);
      setDuration(multitrackEngine.getMaxDuration());
    } else {
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
    }
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

  const handleUpdateMaster = (updates: Partial<MasterBusState>) => {
    multitrackEngine.updateMasterState(updates);
    setMasterState({ ...multitrackEngine.getMasterState() });
  };

  // MULTI-FILE IMPORT: Processes multiple audio files simultaneously
  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const ctx = await multitrackEngine.initContext();
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6'];

    const newTracks: TrackData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuf = await file.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);

        const colorIdx = (tracks.length + i) % colors.length;
        const cleanName = file.name.replace(/\.[^/.]+$/, '');

        newTracks.push({
          id: `track-${Date.now()}-${i}`,
          name: cleanName,
          color: colors[colorIdx],
          buffer: decoded,
          volumeDb: 0,
          pan: 0,
          mute: false,
          solo: false,
          eqLow: 0,
          eqMid: 0,
          eqHigh: 0,
          reverbSend: 0.1,
          delaySend: 0,
        });
      } catch (err) {
        console.error(`Failed to decode track ${file.name}:`, err);
      }
    }

    if (newTracks.length > 0) {
      multitrackEngine.addTracks(newTracks);
      const updated = multitrackEngine.getTracks();
      setTracks([...updated]);
      setSelectedTrackId(newTracks[0].id);
      setDuration(multitrackEngine.getMaxDuration());
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

  // Save Project as .forgeproj JSON
  const handleSaveProject = () => {
    const projectData = {
      version: '1.0',
      projectName,
      masterState,
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

  // Render Mixdown callback for ExportModal
  const handleRenderMixCallback = async (options: {
    filename: string;
    bitDepth: any;
    sampleRate: number;
    normalize: boolean;
  }) => {
    const renderedBuffer = await multitrackEngine.renderMixOffline();
    const wavBlob = encodeWAV(renderedBuffer, {
      bitDepth: options.bitDepth,
      normalize: options.normalize,
      sampleRate: options.sampleRate,
    });
    return { blob: wavBlob, renderedBuffer };
  };

  // Master Resulting Mix: Renders multitrack mixdown and loads directly into Mastering Engine!
  const handleRouteToMastering = async () => {
    setIsRoutingToMaster(true);
    try {
      const renderedBuffer = await multitrackEngine.renderMixOffline();
      masterEngine.loadAudioBuffer(renderedBuffer);
      onSendToMastering(renderedBuffer, `${projectName}_Mixdown.wav`);
    } catch (err) {
      console.error('Master mix error:', err);
    } finally {
      setIsRoutingToMaster(false);
    }
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
      {/* Top Toolbar */}
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
              {tracks.length} Synchronized Tracks • Master Bus Channel Active
            </span>
          </div>
        </div>

        {/* Transport Controls & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveProject}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Save Project</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              disabled={tracks.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-bold text-sky-300 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Mix (WAV)</span>
            </button>

            <button
              onClick={handleRouteToMastering}
              disabled={isRoutingToMaster || tracks.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              title="Mix down all tracks and open in Single-File Mastering Suite"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>{isRoutingToMaster ? 'Routing...' : 'MASTER RESULTING MIX'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multitrack Timeline & Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleImportFiles(e.dataTransfer.files);
        }}
        className={`bg-[#121622] rounded-2xl border transition-all overflow-hidden shadow-xl ${
          isDragOver ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5' : 'border-white/10'
        }`}
      >
        {/* Timeline Header & Multi-File Stems Picker */}
        <div className="bg-[#0b0e15] px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              TIMELINE ({tracks.length} TRACKS)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer transition-all">
              <Plus className="w-3.5 h-3.5" />
              <span>Import Multiple Tracks / Stems</span>
              <input
                ref={multiFileInputRef}
                type="file"
                multiple
                accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
                onChange={(e) => handleImportFiles(e.target.files)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Timeline Ruler */}
        <div
          onClick={handleSeek}
          className="relative h-6 bg-[#090b10] border-b border-white/10 cursor-pointer overflow-hidden flex items-center select-none"
        >
          {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((sec) => (
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
          {tracks.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 space-y-2">
              <Upload className="w-8 h-8 mx-auto text-amber-400 animate-bounce" />
              <p className="text-sm font-bold text-white">No tracks loaded</p>
              <p className="text-xs text-zinc-500">
                Drag and drop multiple audio files here or click &quot;Import Multiple Tracks / Stems&quot;.
              </p>
            </div>
          ) : (
            tracks.map((track) => {
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
                    <div
                      className={`flex items-center justify-between w-full h-full gap-[2px] px-2 ${
                        !isAudible ? 'opacity-25' : ''
                      }`}
                    >
                      {track.waveformData?.map((peak, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-full transition-all"
                          style={{
                            height: `${Math.max(4, peak * 90)}%`,
                            backgroundColor: track.color,
                            opacity: 0.85,
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
            })
          )}
        </div>
      </div>

      {/* Selected Track Strip & Master Bus Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Selected Track Inspector & DSP Rack */}
        <div className="lg:col-span-7 bg-[#121622] rounded-2xl border border-white/10 p-5 shadow-xl">
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
                  Individual EQ, Pan, and Fader
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                {/* 3-Band Channel EQ */}
                <div className="flex items-center gap-3 bg-[#0b0e15] p-3 rounded-xl border border-white/5">
                  <Knob
                    label="LOW"
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
                    label="MID"
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
                    label="HIGH"
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
                <div className="flex items-center gap-3 bg-[#0b0e15] p-3 rounded-xl border border-white/5">
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
                  height={130}
                  color={selectedTrack.color}
                  label="TRK VOL"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Select a track above to adjust EQ, Pan, and Channel Volume.
            </div>
          )}
        </div>

        {/* Master Bus Channel Strip */}
        <div className="lg:col-span-5 bg-[#121622] rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4" />
                MASTER MIX BUS CHANNEL
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Master 3-Band Bus EQ */}
              <div className="space-y-2 bg-[#0b0e15] p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-mono font-bold text-zinc-400 block uppercase">
                  BUS EQ
                </span>
                <div className="flex items-center gap-2">
                  <Knob
                    label="BASS"
                    value={masterState.eqLow}
                    min={-12}
                    max={12}
                    step={0.5}
                    unit="dB"
                    size={42}
                    color="#f59e0b"
                    defaultValue={0}
                    onChange={(v) => handleUpdateMaster({ eqLow: v })}
                  />
                  <Knob
                    label="MID"
                    value={masterState.eqMid}
                    min={-12}
                    max={12}
                    step={0.5}
                    unit="dB"
                    size={42}
                    color="#38bdf8"
                    defaultValue={0}
                    onChange={(v) => handleUpdateMaster({ eqMid: v })}
                  />
                  <Knob
                    label="AIR"
                    value={masterState.eqHigh}
                    min={-12}
                    max={12}
                    step={0.5}
                    unit="dB"
                    size={42}
                    color="#a855f7"
                    defaultValue={0}
                    onChange={(v) => handleUpdateMaster({ eqHigh: v })}
                  />
                </div>
              </div>

              {/* Master Fader */}
              <Fader
                valueDb={masterState.volumeDb}
                onChange={(db) => handleUpdateMaster({ volumeDb: db })}
                height={130}
                color="#f59e0b"
                label="MASTER"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 space-y-2">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>RENDER & EXPORT MIXDOWN (WAV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Filename Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultFilename={`${projectName.replace(/\s+/g, '_')}_Mixdown`}
        modalTitle="Export Multitrack Mixdown (WAV)"
        onRender={handleRenderMixCallback}
        onLoadExportedAudio={(buffer, fname) => {
          masterEngine.loadAudioBuffer(buffer);
          onSendToMastering(buffer, fname);
        }}
      />
    </div>
  );
};
