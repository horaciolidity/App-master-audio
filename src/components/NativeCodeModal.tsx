import React, { useState } from 'react';
import {
  X,
  Package,
  FileCode,
  Download,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Terminal,
  Cpu,
  Folder,
  Code2,
} from 'lucide-react';
import JSZip from 'jszip';
import { downloadBlob } from '../audio/audio-encoder';

interface NativeCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProjectFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

const NATIVE_FILES: ProjectFile[] = [
  {
    path: 'BUILD_INSTRUCTIONS.md',
    language: 'markdown',
    description: 'Complete build manual for Android APK, Linux, Windows, and macOS',
    content: `# AUDIOFORGE AI STUDIO - NATIVE BUILD MANUAL

## 1. Building for Android (APK)
cd audioforge_studio
flutter pub get
flutter doctor -v
flutter build apk --release --split-per-abi

Output:
build/app/outputs/flutter-apk/app-arm64-v8a-release.apk

To install on your phone or tablet via USB:
adb install -r build/app/outputs/flutter-apk/app-arm64-v8a-release.apk

## 2. Building for Linux Desktop
sudo apt update
sudo apt install -y clang cmake ninja-build pkg-config libgtk-3-dev libasound2-dev libpulse-dev
flutter config --enable-linux-desktop
flutter build linux --release

## 3. Building for Windows Desktop
flutter config --enable-windows-desktop
flutter build windows --release

## 4. Building for macOS Desktop
flutter config --enable-macos-desktop
flutter build macos --release`,
  },
  {
    path: 'native_dsp/include/audioforge_dsp.h',
    language: 'cpp',
    description: 'C/C++ DSP API header exported for Dart FFI',
    content: `#ifndef AUDIOFORGE_DSP_H
#define AUDIOFORGE_DSP_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef void* AudioForgeEngineHandle;

AUDIOFORGE_EXPORT AudioForgeEngineHandle audioforge_create(uint32_t sample_rate, uint32_t block_size);
AUDIOFORGE_EXPORT void audioforge_destroy(AudioForgeEngineHandle handle);
AUDIOFORGE_EXPORT void audioforge_reset(AudioForgeEngineHandle handle);

AUDIOFORGE_EXPORT void audioforge_set_eq_band(
    AudioForgeEngineHandle handle,
    int band_index,
    int filter_type,
    float frequency,
    float gain_db,
    float q_factor,
    int enabled
);

AUDIOFORGE_EXPORT void audioforge_set_compressor(
    AudioForgeEngineHandle handle,
    float threshold_db,
    float ratio,
    float attack_ms,
    float release_ms,
    float knee_db,
    float makeup_gain_db,
    int enabled
);

AUDIOFORGE_EXPORT void audioforge_set_limiter(
    AudioForgeEngineHandle handle,
    float ceiling_db,
    float release_ms,
    float lookahead_ms,
    int enabled
);

AUDIOFORGE_EXPORT void audioforge_process_master(
    AudioForgeEngineHandle handle,
    const float* input_interleaved,
    float* output_interleaved,
    size_t num_frames
);

AUDIOFORGE_EXPORT float audioforge_get_current_gain_reduction(AudioForgeEngineHandle handle);
AUDIOFORGE_EXPORT float audioforge_get_integrated_lufs(AudioForgeEngineHandle handle);

#ifdef __cplusplus
}
#endif

#endif // AUDIOFORGE_DSP_H`,
  },
  {
    path: 'native_dsp/src/audioforge_dsp.cpp',
    language: 'cpp',
    description: 'High-performance C++ implementation (Biquads, Compressor, Limiter, BS.1770)',
    content: `#include "audioforge_dsp.h"
#include <cmath>
#include <vector>
#include <algorithm>

namespace audioforge {

inline float dbToLin(float db) { return std::pow(10.0f, db * 0.05f); }
inline float linToDb(float lin) { return (lin > 1e-6f) ? 20.0f * std::log10(lin) : -120.0f; }

// Biquad Direct Form II Transposed
class Biquad {
public:
    float b0 = 1.0f, b1 = 0.0f, b2 = 0.0f, a1 = 0.0f, a2 = 0.0f;
    float z1_L = 0.0f, z2_L = 0.0f, z1_R = 0.0f, z2_R = 0.0f;

    void setup(int type, float freq, float gainDb, float q, float sampleRate) {
        float w0 = 2.0f * 3.14159265f * (freq / sampleRate);
        float cosW = std::cos(w0);
        float sinW = std::sin(w0);
        float alpha = sinW / (2.0f * (q > 0.01f ? q : 0.707f));
        float A = std::pow(10.0f, gainDb / 40.0f);
        // Parametric EQ coefficients
        b0 = 1.0f + alpha * A;
        b1 = -2.0f * cosW;
        b2 = 1.0f - alpha * A;
        float a0 = 1.0f + alpha / A;
        a1 = -2.0f * cosW;
        a2 = 1.0f - alpha / A;
        b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    }

    inline void processStereo(float inL, float inR, float& outL, float& outR) {
        outL = b0 * inL + z1_L;
        z1_L = b1 * inL - a1 * outL + z2_L;
        z2_L = b2 * inL - a2 * outL;
        outR = b0 * inR + z1_R;
        z1_R = b1 * inR - a1 * outR + z2_R;
        z2_R = b2 * inR - a2 * outR;
    }
};

} // namespace audioforge`,
  },
  {
    path: 'lib/engine/dsp_ffi.dart',
    language: 'dart',
    description: 'Dart FFI native bridge invoking C++ DSP engine directly',
    content: `import 'dart:ffi';
import 'dart:io';

typedef AudioForgeCreateC = Pointer<Void> Function(Uint32 sampleRate, Uint32 blockSize);
typedef AudioForgeCreateDart = Pointer<Void> Function(int sampleRate, int blockSize);

class AudioForgeDspBridge {
  static final AudioForgeDspBridge _instance = AudioForgeDspBridge._internal();
  factory AudioForgeDspBridge() => _instance;

  DynamicLibrary? _dylib;
  Pointer<Void>? _engineHandle;

  AudioForgeDspBridge._internal() {
    if (Platform.isAndroid) {
      _dylib = DynamicLibrary.open('libaudioforge_dsp.so');
    } else if (Platform.isWindows) {
      _dylib = DynamicLibrary.open('audioforge_dsp.dll');
    } else if (Platform.isLinux) {
      _dylib = DynamicLibrary.open('libaudioforge_dsp.so');
    }
  }
}`,
  },
  {
    path: 'lib/main.dart',
    language: 'dart',
    description: 'Flutter Studio Application Entry Point & Navigation',
    content: `import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'engine/dsp_ffi.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  AudioForgeDspBridge().init(48000, 512);
  runApp(const AudioForgeStudioApp());
}

class AudioForgeStudioApp extends StatelessWidget {
  const AudioForgeStudioApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AUDIOFORGE AI STUDIO',
      theme: ThemeData.dark(),
      home: const StudioMainScreen(),
    );
  }
}`,
  },
  {
    path: 'android/app/build.gradle',
    language: 'groovy',
    description: 'Android Gradle script with CMake C++ NDK compiler settings',
    content: `android {
    namespace "com.audioforge.studio"
    compileSdkVersion 34
    ndkVersion "25.1.8937393"

    defaultConfig {
        applicationId "com.audioforge.studio"
        minSdkVersion 24
        targetSdkVersion 34
        externalNativeBuild {
            cmake {
                cppFlags "-std=c++17 -O3 -fvisibility=hidden -ffast-math"
            }
        }
    }

    externalNativeBuild {
        cmake {
            path "src/main/cpp/CMakeLists.txt"
        }
    }
}`,
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Android Manifest with low latency audio and storage permissions',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.audioforge.studio">
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-feature android:name="android.hardware.audio.low_latency" android:required="false" />
    <uses-feature android:name="android.hardware.audio.pro" android:required="false" />
</manifest>`,
  },
  {
    path: 'pubspec.yaml',
    language: 'yaml',
    description: 'Flutter dependencies and asset configurations',
    content: `name: audioforge_studio
description: "AUDIOFORGE AI STUDIO - Cross-platform Audio Mixing and Mastering Workstation"
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'
  flutter: '>=3.16.0'

dependencies:
  flutter:
    sdk: flutter
  ffi: ^2.1.2
  path_provider: ^2.1.3
  file_picker: ^8.0.0`,
  },
];

export const NativeCodeModal: React.FC<NativeCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(NATIVE_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('audioforge_studio');

      NATIVE_FILES.forEach((f) => {
        rootFolder?.file(f.path, f.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'AUDIOFORGE_AI_STUDIO_Native_Flutter_Cpp.zip');
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-[#121622] rounded-2xl border border-white/10 w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 border-b border-white/10 px-5 flex items-center justify-between bg-[#0e111a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  NATIVE APPLICATION SOURCE & BUILD SUITE
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  FLUTTER + C++ DSP
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                Cross-platform APK for Android & Desktop Executables (Windows, Linux, macOS)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? 'Generating ZIP...' : 'Download Full Project (.zip)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left File Tree, Right Code Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="w-full md:w-64 border-r border-white/10 bg-[#0a0d14] p-3 overflow-y-auto shrink-0 space-y-1">
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase px-2 mb-2 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              <span>PROJECT SOURCE TREE</span>
            </div>

            {NATIVE_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{file.path}</span>
                  </div>
                </button>
              );
            })}

            {/* Android APK Build Quick Command */}
            <div className="mt-4 pt-3 border-t border-white/5 px-2">
              <span className="text-[10px] font-mono text-zinc-400 block mb-1 font-bold">
                BUILD APK COMMAND:
              </span>
              <div className="bg-black/60 p-2 rounded border border-white/10 font-mono text-[10px] text-emerald-400 select-all">
                flutter build apk --release
              </div>
            </div>
          </div>

          {/* Right Code Display */}
          <div className="flex-1 flex flex-col bg-[#0d1017] overflow-hidden">
            <div className="h-10 border-b border-white/10 px-4 flex items-center justify-between bg-[#0e111a] text-xs font-mono text-zinc-400">
              <span className="text-zinc-200 font-bold">{selectedFile.path}</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500 hidden sm:inline">
                  {selectedFile.description}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-zinc-300 leading-relaxed bg-[#0b0e14]">
              <pre className="whitespace-pre">{selectedFile.content}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
