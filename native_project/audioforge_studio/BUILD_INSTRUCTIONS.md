# AUDIOFORGE AI STUDIO - NATIVE BUILD MANUAL & ARCHITECTURE

AUDIOFORGE AI STUDIO is an installable cross-platform audio mixing and mastering workstation powered by Flutter (Dart) and a native C++ DSP audio engine (`libaudioforge_dsp`).

---

## 1. Native Architecture Overview

```
audioforge_studio/
├── CMakeLists.txt                 # Root CMake configuration for C++ DSP
├── native_dsp/
│   ├── include/
│   │   └── audioforge_dsp.h       # C-ABI export interface for Dart FFI
│   └── src/
│       └── audioforge_dsp.cpp     # Biquads, Compressor, Brickwall Limiter, ITU-R BS.1770 LUFS Analyzer
├── android/
│   ├── app/
│   │   ├── build.gradle           # Android NDK CMake integration (minSdk 24, targetSdk 34)
│   │   └── src/main/
│   │       ├── AndroidManifest.xml # Low latency audio flags & permissions
│   │       └── cpp/CMakeLists.txt  # NDK shared library build
├── lib/
│   ├── main.dart                  # Studio application entry point & theme
│   ├── engine/dsp_ffi.dart        # Dart FFI native bridge bindings
│   └── screens/                   # Easy Mode, Pro Mode, Multitrack, Local AI
└── pubspec.yaml                   # Flutter dependencies
```

---

## 2. Prerequisites

1. **Flutter SDK**: Version 3.16.0 or higher (`flutter doctor`)
2. **Dart SDK**: Included with Flutter
3. **C++ Toolchain**:
   - **For Android APK**: Android Studio, Android SDK 34, Android NDK (r25c or higher), CMake 3.22+
   - **For Linux Desktop**: `clang`, `cmake`, `libasound2-dev`, `libpulse-dev`
   - **For Windows Desktop**: Visual Studio 2022 with C++ Desktop Development workload
   - **For macOS Desktop**: Xcode 15+ and Command Line Tools

---

## 3. Building for Android (APK)

To build a standalone, offline installable Android APK:

```bash
# 1. Navigate to the native project directory
cd audioforge_studio

# 2. Fetch Flutter packages
flutter pub get

# 3. Verify Android environment and NDK path
flutter doctor -v

# 4. Build Release APK (Fat APK including all architectures)
flutter build apk --release

# OR build split APKs (smaller file size per ABI):
flutter build apk --release --split-per-abi
```

**Output APK Location:**
`build/app/outputs/flutter-apk/app-release.apk`
(or `app-arm64-v8a-release.apk` for modern 64-bit phones and tablets).

### Installing to Android Device:
Connect your phone via USB with Developer Mode & USB Debugging enabled:
```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

---

## 4. Building for Linux Desktop

```bash
# Install Linux build dependencies (Ubuntu/Debian)
sudo apt update
sudo apt install -y clang cmake ninja-build pkg-config libgtk-3-dev libasound2-dev libpulse-dev

# Enable Linux desktop in Flutter
flutter config --enable-linux-desktop

# Build release binary
flutter build linux --release
```

**Output Binary Location:**
`build/linux/x64/release/bundle/audioforge_studio`

---

## 5. Building for Windows Desktop

```cmd
:: Enable Windows desktop in Flutter
flutter config --enable-windows-desktop

:: Build release executable
flutter build windows --release
```

**Output Binary Location:**
`build\windows\x64\runner\Release\audioforge_studio.exe`

---

## 6. Building for macOS Desktop

```bash
flutter config --enable-macos-desktop
flutter build macos --release
```

**Output Bundle:**
`build/macos/Build/Products/Release/AUDIOFORGE STUDIO.app`

---

## 7. Local AI Models & Offline Processing

AUDIOFORGE AI STUDIO is strictly offline-first:
- **Baseline DSP Mastering**: Works 100% offline with zero model dependencies. It analyzes crest factor, spectral balance, and loudness via C++ BS.1770 and computes optimal parametric EQ, multi-stage compression, and true-peak limiting.
- **Local AI Extensions**: Demucs v4 (stems), Matchering 2.0 (spectral matching), and EnCodec are loaded directly onto device storage via ONNX Runtime / TFLite. No cloud subscriptions or paid tokens are ever required.
