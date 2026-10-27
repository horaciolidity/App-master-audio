#ifndef AUDIOFORGE_DSP_H
#define AUDIOFORGE_DSP_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#if defined(_WIN32)
  #define AUDIOFORGE_EXPORT __declspec(dllexport)
#else
  #define AUDIOFORGE_EXPORT __attribute__((visibility("default")))
#endif

// ==========================================
// C API for Dart FFI Interop
// ==========================================

typedef void* AudioForgeEngineHandle;

// Engine lifecycle
AUDIOFORGE_EXPORT AudioForgeEngineHandle audioforge_create(uint32_t sample_rate, uint32_t block_size);
AUDIOFORGE_EXPORT void audioforge_destroy(AudioForgeEngineHandle handle);
AUDIOFORGE_EXPORT void audioforge_reset(AudioForgeEngineHandle handle);

// Parametric EQ (5-Band)
// Filter types: 0 = LowShelf, 1 = Peaking, 2 = HighShelf, 3 = HighPass, 4 = LowPass
AUDIOFORGE_EXPORT void audioforge_set_eq_band(
    AudioForgeEngineHandle handle,
    int band_index,
    int filter_type,
    float frequency,
    float gain_db,
    float q_factor,
    int enabled
);

// Dynamics Compressor
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

// Lookahead Limiter
AUDIOFORGE_EXPORT void audioforge_set_limiter(
    AudioForgeEngineHandle handle,
    float ceiling_db,
    float release_ms,
    float lookahead_ms,
    int enabled
);

// Master Output & Stereo Width
AUDIOFORGE_EXPORT void audioforge_set_master_gain(AudioForgeEngineHandle handle, float gain_db);
AUDIOFORGE_EXPORT void audioforge_set_stereo_width(AudioForgeEngineHandle handle, float width_factor);

// Real-time audio block processing (Interleaved 32-bit float stereo)
AUDIOFORGE_EXPORT void audioforge_process_master(
    AudioForgeEngineHandle handle,
    const float* input_interleaved,
    float* output_interleaved,
    size_t num_frames
);

// Loudness & Metering Feedback
AUDIOFORGE_EXPORT float audioforge_get_current_gain_reduction(AudioForgeEngineHandle handle);
AUDIOFORGE_EXPORT float audioforge_get_current_lufs_momentary(AudioForgeEngineHandle handle);
AUDIOFORGE_EXPORT float audioforge_get_current_lufs_short_term(AudioForgeEngineHandle handle);
AUDIOFORGE_EXPORT float audioforge_get_integrated_lufs(AudioForgeEngineHandle handle);
AUDIOFORGE_EXPORT float audioforge_get_peak_db(AudioForgeEngineHandle handle, int channel);
AUDIOFORGE_EXPORT float audioforge_get_true_peak_db(AudioForgeEngineHandle handle);

// Multitrack Mixing Engine
AUDIOFORGE_EXPORT int audioforge_create_track(AudioForgeEngineHandle handle);
AUDIOFORGE_EXPORT void audioforge_delete_track(AudioForgeEngineHandle handle, int track_id);
AUDIOFORGE_EXPORT void audioforge_set_track_volume(AudioForgeEngineHandle handle, int track_id, float volume_db);
AUDIOFORGE_EXPORT void audioforge_set_track_pan(AudioForgeEngineHandle handle, int track_id, float pan); // -1.0 to +1.0
AUDIOFORGE_EXPORT void audioforge_set_track_mute(AudioForgeEngineHandle handle, int track_id, int mute);
AUDIOFORGE_EXPORT void audioforge_set_track_solo(AudioForgeEngineHandle handle, int track_id, int solo);
AUDIOFORGE_EXPORT void audioforge_set_track_eq(AudioForgeEngineHandle handle, int track_id, float low_gain, float mid_gain, float high_gain);
AUDIOFORGE_EXPORT void audioforge_set_track_send_fx(AudioForgeEngineHandle handle, int track_id, float reverb_send, float delay_send);

// Multitrack sum & render
AUDIOFORGE_EXPORT void audioforge_process_multitrack_mix(
    AudioForgeEngineHandle handle,
    const float** track_buffers, // array of interleaved stereo buffers
    const int* track_ids,
    size_t num_tracks,
    float* master_output,
    size_t num_frames
);

// Offline Audio File Rendering & Normalization
AUDIOFORGE_EXPORT int audioforge_render_offline(
    AudioForgeEngineHandle handle,
    const char* input_file_path,
    const char* output_file_path,
    float target_lufs,
    int bit_depth,
    int sample_rate
);

#ifdef __cplusplus
}
#endif

#endif // AUDIOFORGE_DSP_H
