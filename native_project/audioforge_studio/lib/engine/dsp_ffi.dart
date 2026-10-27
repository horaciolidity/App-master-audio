import 'dart:ffi';
import 'dart:io';
import 'package:ffi/ffi.dart';

// Native FFI Function Signatures
typedef AudioForgeCreateC = Pointer<Void> Function(Uint32 sampleRate, Uint32 blockSize);
typedef AudioForgeCreateDart = Pointer<Void> Function(int sampleRate, int blockSize);

typedef AudioForgeDestroyC = Void Function(Pointer<Void> handle);
typedef AudioForgeDestroyDart = void Function(Pointer<Void> handle);

typedef AudioForgeResetC = Void Function(Pointer<Void> handle);
typedef AudioForgeResetDart = void Function(Pointer<Void> handle);

typedef AudioForgeSetEqBandC = Void Function(
    Pointer<Void> handle, Int32 bandIndex, Int32 filterType, Float freq, Float gainDb, Float q, Int32 enabled);
typedef AudioForgeSetEqBandDart = void Function(
    Pointer<Void> handle, int bandIndex, int filterType, double freq, double gainDb, double q, int enabled);

typedef AudioForgeSetCompressorC = Void Function(
    Pointer<Void> handle, Float thresholdDb, Float ratio, Float attackMs, Float releaseMs, Float kneeDb, Float makeupGainDb, Int32 enabled);
typedef AudioForgeSetCompressorDart = void Function(
    Pointer<Void> handle, double thresholdDb, double ratio, double attackMs, double releaseMs, double kneeDb, double makeupGainDb, int enabled);

typedef AudioForgeSetLimiterC = Void Function(
    Pointer<Void> handle, Float ceilingDb, Float releaseMs, Float lookaheadMs, Int32 enabled);
typedef AudioForgeSetLimiterDart = void Function(
    Pointer<Void> handle, double ceilingDb, double releaseMs, double lookaheadMs, int enabled);

typedef AudioForgeGetLufsC = Float Function(Pointer<Void> handle);
typedef AudioForgeGetLufsDart = double Function(Pointer<Void> handle);

class AudioForgeDspBridge {
  static final AudioForgeDspBridge _instance = AudioForgeDspBridge._internal();
  factory AudioForgeDspBridge() => _instance;

  DynamicLibrary? _dylib;
  Pointer<Void>? _engineHandle;

  late AudioForgeCreateDart _create;
  late AudioForgeDestroyDart _destroy;
  late AudioForgeResetDart _reset;
  late AudioForgeSetEqBandDart _setEqBand;
  late AudioForgeSetCompressorDart _setCompressor;
  late AudioForgeSetLimiterDart _setLimiter;
  late AudioForgeGetLufsDart _getLufs;

  AudioForgeDspBridge._internal() {
    _loadLibrary();
  }

  void _loadLibrary() {
    try {
      if (Platform.isAndroid) {
        _dylib = DynamicLibrary.open('libaudioforge_dsp.so');
      } else if (Platform.isWindows) {
        _dylib = DynamicLibrary.open('audioforge_dsp.dll');
      } else if (Platform.isLinux) {
        _dylib = DynamicLibrary.open('libaudioforge_dsp.so');
      } else if (Platform.isMacOS || Platform.isIOS) {
        _dylib = DynamicLibrary.process();
      }

      if (_dylib != null) {
        _create = _dylib!.lookupFunction<AudioForgeCreateC, AudioForgeCreateDart>('audioforge_create');
        _destroy = _dylib!.lookupFunction<AudioForgeDestroyC, AudioForgeDestroyDart>('audioforge_destroy');
        _reset = _dylib!.lookupFunction<AudioForgeResetC, AudioForgeResetDart>('audioforge_reset');
        _setEqBand = _dylib!.lookupFunction<AudioForgeSetEqBandC, AudioForgeSetEqBandDart>('audioforge_set_eq_band');
        _setCompressor = _dylib!.lookupFunction<AudioForgeSetCompressorC, AudioForgeSetCompressorDart>('audioforge_set_compressor');
        _setLimiter = _dylib!.lookupFunction<AudioForgeSetLimiterC, AudioForgeSetLimiterDart>('audioforge_set_limiter');
        _getLufs = _dylib!.lookupFunction<AudioForgeGetLufsC, AudioForgeGetLufsDart>('audioforge_get_integrated_lufs');
      }
    } catch (e) {
      // Graceful fallback when running in hot reload or testing environments
      print('DSP Native Library note: $e');
    }
  }

  void init(int sampleRate, int blockSize) {
    if (_dylib != null) {
      _engineHandle = _create(sampleRate, blockSize);
    }
  }

  void setEqBand(int index, int type, double freq, double gainDb, double q) {
    if (_engineHandle != null) {
      _setEqBand(_engineHandle!, index, type, freq, gainDb, q, 1);
    }
  }

  void setCompressor(double threshold, double ratio, double attack, double release, double knee, double makeup) {
    if (_engineHandle != null) {
      _setCompressor(_engineHandle!, threshold, ratio, attack, release, knee, makeup, 1);
    }
  }

  void setLimiter(double ceiling, double release, double lookahead) {
    if (_engineHandle != null) {
      _setLimiter(_engineHandle!, ceiling, release, lookahead, 1);
    }
  }

  double getIntegratedLufs() {
    if (_engineHandle != null) {
      return _getLufs(_engineHandle!);
    }
    return -14.0;
  }

  void dispose() {
    if (_engineHandle != null) {
      _destroy(_engineHandle!);
      _engineHandle = null;
    }
  }
}
