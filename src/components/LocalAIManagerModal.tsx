import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Download,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  HardDrive,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  VERIFIED_LOCAL_MODELS,
  AiModelInfo,
  detectSystemHardware,
  SystemHardwareReport,
} from '../audio/local-ai-models';

export const LocalAIManagerModal: React.FC = () => {
  const [models, setModels] = useState<AiModelInfo[]>(VERIFIED_LOCAL_MODELS);
  const [hardware, setHardware] = useState<SystemHardwareReport | null>(null);

  useEffect(() => {
    detectSystemHardware().then(setHardware);
  }, []);

  const handleDownloadModel = (modelId: string) => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        return { ...m, status: 'downloading', downloadProgress: 10 };
      })
    );

    // Simulate progress and SHA-256 verification
    let prog = 10;
    const interval = setInterval(() => {
      prog += 18;
      if (prog >= 100) {
        clearInterval(interval);
        setModels((prev) =>
          prev.map((m) => {
            if (m.id !== modelId) return m;
            return {
              ...m,
              status: 'installed',
              downloadProgress: 100,
            };
          })
        );
      } else {
        setModels((prev) =>
          prev.map((m) => {
            if (m.id !== modelId) return m;
            return { ...m, downloadProgress: prog };
          })
        );
      }
    }, 250);
  };

  const handleToggleActive = (modelId: string) => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        const newStatus = m.status === 'active' ? 'installed' : 'active';
        return { ...m, status: newStatus };
      })
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header & Zero-Cost Offline Policy */}
      <div className="bg-[#121622] rounded-2xl border border-white/10 p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  LOCAL AI MODEL MANAGER
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  100% OFFLINE & ZERO PAID APIS
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                On-Device Neural Audio Models
              </h2>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed bg-black/40 p-3.5 rounded-xl border border-white/5">
          <span className="text-amber-400 font-bold">Offline Guarantee:</span> AUDIOFORGE never calls paid cloud AI services, requires no subscription tokens, and sends 0 audio data to the cloud. All models run locally on your device hardware (using WASM SIMD, WebGPU, or Android NPU). Baseline DSP mastering functions without any models downloaded.
        </p>

        {/* Hardware Capability Report */}
        {hardware && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-black/30 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-zinc-400 block">GPU ACCELERATION</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {hardware.webGpuSupported ? 'WebGPU / Vulkan' : 'OpenGL Core'}
              </span>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-zinc-400 block">CPU THREADS</span>
              <span className="text-xs font-bold text-zinc-200 mt-0.5">
                {hardware.logicalCores} Logical Cores (SIMD)
              </span>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-zinc-400 block">SYSTEM RAM</span>
              <span className="text-xs font-bold text-zinc-200 mt-0.5">
                ~{hardware.estimatedMemoryGb} GB Available
              </span>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-zinc-400 block">MODEL COMPATIBILITY</span>
              <span className="text-xs font-bold text-sky-400 mt-0.5">
                ONNX INT8 & GGUF Ready
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Verified Local Models Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Verified Local Models Repository
          </h3>
          <span className="text-xs text-zinc-400 font-mono">
            Hugging Face & GitHub Open Source
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((model) => {
            const isInstalled = model.status === 'installed' || model.status === 'active';
            const isActive = model.status === 'active';

            return (
              <div
                key={model.id}
                className="bg-[#121622] rounded-2xl border border-white/10 p-5 flex flex-col justify-between shadow-xl space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-200 uppercase">
                          {model.category}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400">
                          {model.format} • {model.sizeFormatted}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">
                        {model.name}
                      </h4>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isActive && (
                        <span className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-emerald-500 text-black">
                          ACTIVE
                        </span>
                      )}
                      {model.status === 'installed' && (
                        <span className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          INSTALLED
                        </span>
                      )}
                      {model.status === 'downloading' && (
                        <span className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {model.downloadProgress}%
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                    {model.description}
                  </p>

                  {/* Verification & License Details */}
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5 text-[10px] font-mono text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>LICENSE:</span>
                      <span className="text-zinc-200 font-semibold">{model.license}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>INFERENCE SPEED:</span>
                      <span className="text-sky-300">{model.inferenceSpeed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>REQUIREMENT:</span>
                      <span className="text-zinc-300">{model.hardwareRequirement}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/5 truncate">
                      <span>SHA256:</span>
                      <span className="text-zinc-500 truncate max-w-[200px]" title={model.checksumSha256}>
                        {model.checksumSha256}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Download Progress Bar if downloading */}
                {model.status === 'downloading' && (
                  <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/10">
                    <div
                      className="bg-amber-400 h-full transition-all duration-200"
                      style={{ width: `${model.downloadProgress}%` }}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {!isInstalled && model.status !== 'downloading' && (
                    <button
                      onClick={() => handleDownloadModel(model.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Model ({model.sizeFormatted})</span>
                    </button>
                  )}

                  {isInstalled && (
                    <button
                      onClick={() => handleToggleActive(model.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-white/5 text-zinc-300 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{isActive ? 'Engaged in DSP Pipeline' : 'Engage Model'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
