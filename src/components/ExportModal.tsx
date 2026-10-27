import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  FileAudio,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import { BitDepth, downloadBlob } from '../audio/audio-encoder';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFilename: string;
  modalTitle: string;
  onRender: (options: {
    filename: string;
    bitDepth: BitDepth;
    sampleRate: number;
    normalize: boolean;
  }) => Promise<{ blob: Blob; renderedBuffer: AudioBuffer }>;
  onLoadExportedAudio?: (buffer: AudioBuffer, filename: string) => void;
}

// Session-level tracker to detect duplicate export filenames
const exportedFilenamesSet = new Set<string>();

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  defaultFilename,
  modalTitle,
  onRender,
  onLoadExportedAudio,
}) => {
  const [filename, setFilename] = useState('');
  const [bitDepth, setBitDepth] = useState<BitDepth>(24);
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [normalize, setNormalize] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);

  // Post-export verification player state
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedBuffer, setExportedBuffer] = useState<AudioBuffer | null>(null);
  const [verifiedFilename, setVerifiedFilename] = useState<string | null>(null);
  const [isPlayingExported, setIsPlayingExported] = useState(false);
  const [verifyAudioElement, setVerifyAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Clean up default filename and remove extension
      const clean = defaultFilename.replace(/\.[^/.]+$/, '');
      setFilename(clean);
      setErrorMessage(null);
      setShowOverwriteWarning(false);
      setExportedBlob(null);
      setExportedBuffer(null);
      setVerifiedFilename(null);
      if (verifyAudioElement) {
        verifyAudioElement.pause();
      }
    }
  }, [isOpen, defaultFilename]);

  if (!isOpen) return null;

  // Sanitize filename to prevent invalid characters across Windows, Android, Linux, macOS
  const handleFilenameChange = (val: string) => {
    // Remove invalid file path characters: \ / : * ? " < > |
    const sanitized = val.replace(/[\\/:*?"<>|]/g, '');
    setFilename(sanitized);
    setErrorMessage(null);

    const fullTestName = `${sanitized.trim().toLowerCase()}.wav`;
    if (exportedFilenamesSet.has(fullTestName)) {
      setShowOverwriteWarning(true);
    } else {
      setShowOverwriteWarning(false);
    }
  };

  const handleStartExport = async (forceOverwrite = false) => {
    const trimmed = filename.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a valid filename.');
      return;
    }

    const finalFilename = trimmed.toLowerCase().endsWith('.wav') ? trimmed : `${trimmed}.wav`;

    if (!forceOverwrite && exportedFilenamesSet.has(finalFilename.toLowerCase())) {
      setShowOverwriteWarning(true);
      return;
    }

    setIsRendering(true);
    setErrorMessage(null);

    try {
      const result = await onRender({
        filename: finalFilename,
        bitDepth,
        sampleRate,
        normalize,
      });

      // Save file to user's device
      downloadBlob(result.blob, finalFilename);
      exportedFilenamesSet.add(finalFilename.toLowerCase());

      // Setup audio preview element for verification
      const audioUrl = URL.createObjectURL(result.blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingExported(false);

      setExportedBlob(result.blob);
      setExportedBuffer(result.renderedBuffer);
      setVerifiedFilename(finalFilename);
      setVerifyAudioElement(audio);
      setShowOverwriteWarning(false);
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMessage(err?.message || 'Audio export failed. Please try again.');
    } finally {
      setIsRendering(false);
    }
  };

  const togglePlayVerify = () => {
    if (!verifyAudioElement) return;
    if (isPlayingExported) {
      verifyAudioElement.pause();
      setIsPlayingExported(false);
    } else {
      verifyAudioElement.play();
      setIsPlayingExported(true);
    }
  };

  const handleLoadBack = () => {
    if (exportedBuffer && verifiedFilename && onLoadExportedAudio) {
      onLoadExportedAudio(exportedBuffer, verifiedFilename);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#121622] rounded-2xl border border-white/10 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="h-14 border-b border-white/10 px-5 flex items-center justify-between bg-[#0e111a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">{modalTitle}</h3>
              <span className="text-[10px] text-zinc-400 font-mono">
                Real 32-bit Float DSP Render Pipeline
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (verifyAudioElement) verifyAudioElement.pause();
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* Filename Field */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Custom Filename:
            </label>
            <div className="flex items-center rounded-xl bg-black/50 border border-white/15 focus-within:border-amber-500 px-3 py-2 transition-colors">
              <FileAudio className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
              <input
                type="text"
                value={filename}
                onChange={(e) => handleFilenameChange(e.target.value)}
                placeholder="Enter filename (e.g. My_Mastered_Track)"
                className="bg-transparent font-mono text-sm text-white w-full outline-none"
              />
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 ml-2">
                .WAV
              </span>
            </div>
            {errorMessage && (
              <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {errorMessage}
              </p>
            )}
            {showOverwriteWarning && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  A file with this name was exported earlier in this session.
                </span>
                <button
                  onClick={() => handleStartExport(true)}
                  className="px-2.5 py-1 rounded bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 cursor-pointer ml-2"
                >
                  Overwrite
                </button>
              </div>
            )}
          </div>

          {/* Export Settings Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Bit Depth */}
            <div className="bg-[#0b0e15] p-3 rounded-xl border border-white/5 space-y-2">
              <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                BIT DEPTH
              </label>
              <div className="grid grid-cols-3 gap-1">
                {([16, 24, 32] as BitDepth[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setBitDepth(d)}
                    className={`py-1 rounded text-xs font-mono font-bold transition-all ${
                      bitDepth === d
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {d}-BIT
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-zinc-500 block">
                {bitDepth === 16 && 'CD Standard PCM'}
                {bitDepth === 24 && 'Streaming Standard Studio PCM'}
                {bitDepth === 32 && '32-Bit IEEE Float Archival'}
              </span>
            </div>

            {/* Sample Rate */}
            <div className="bg-[#0b0e15] p-3 rounded-xl border border-white/5 space-y-2">
              <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                SAMPLE RATE
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[44100, 48000, 96000].map((sr) => (
                  <button
                    key={sr}
                    type="button"
                    onClick={() => setSampleRate(sr)}
                    className={`py-1 rounded text-xs font-mono font-bold transition-all ${
                      sampleRate === sr
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {sr / 1000}k
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-zinc-500 block">
                {sampleRate === 44100 && '44,100 Hz Red Book'}
                {sampleRate === 48000 && '48,000 Hz Broadcast Standard'}
                {sampleRate === 96000 && '96,000 Hz High Resolution'}
              </span>
            </div>
          </div>

          {/* Normalization & Processing Assurance */}
          <div className="bg-[#0b0e15] p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Preserve Master Dynamics & True Peak
                </span>
                <span className="text-[10px] text-zinc-400">
                  Baked-in EQ filters, dynamic compression, and ceiling limiting.
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={normalize}
                onChange={(e) => setNormalize(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span className="text-[11px]">Normalize</span>
            </label>
          </div>

          {/* Post-Export Verification & Audition Card */}
          {exportedBlob && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Successfully Exported: {verifiedFilename}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                  {(exportedBlob.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={togglePlayVerify}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 cursor-pointer shadow-md"
                >
                  {isPlayingExported ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isPlayingExported ? 'Pause Audition' : 'Listen to Exported File'}</span>
                </button>

                {onLoadExportedAudio && (
                  <button
                    type="button"
                    onClick={handleLoadBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white font-semibold text-xs hover:bg-white/15 cursor-pointer border border-white/10"
                  >
                    <span>Open in Workstation</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-16 border-t border-white/10 px-5 flex items-center justify-between bg-[#0e111a] shrink-0">
          <button
            onClick={() => {
              if (verifyAudioElement) verifyAudioElement.pause();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold"
          >
            Cancel
          </button>

          <button
            onClick={() => handleStartExport(false)}
            disabled={isRendering || !filename.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isRendering ? 'Rendering & Baking Effects...' : 'Save & Download Audio File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
