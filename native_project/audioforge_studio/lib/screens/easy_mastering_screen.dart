import 'package:flutter/material.dart';
import '../engine/dsp_ffi.dart';

class EasyMasteringScreen extends StatefulWidget {
  const EasyMasteringScreen({super.key});

  @override
  State<EasyMasteringScreen> createState() => _EasyMasteringScreenState();
}

class _EasyMasteringScreenState extends State<EasyMasteringScreen> {
  String _selectedProfile = 'Streaming (-14 LUFS)';
  bool _isPlaying = false;
  bool _isAuditionMaster = true;

  final List<Map<String, String>> _profiles = [
    {'name': 'Streaming (-14 LUFS)', 'desc': 'Spotify & Apple Music compliance with zero penalty.'},
    {'name': 'EDM & Club (-9 LUFS)', 'desc': 'Heavy sub-bass, aggressive limiter, club impact.'},
    {'name': 'Pop & Hip-Hop (-10.5 LUFS)', 'desc': 'Radio-ready, crisp highs, tight 808 response.'},
    {'name': 'Rock & Metal (-11 LUFS)', 'desc': 'Mid-range guitar bite and transient glue.'},
    {'name': 'Acoustic (-16 LUFS)', 'desc': 'Preserves open dynamics and silky acoustic presence.'},
    {'name': 'Voice & Podcast (-16 LUFS)', 'desc': 'Vocal leveling and de-essing for broadcast.'},
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Loaded song card
          Card(
            color: const Color(0xFF131722),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  const Icon(Icons.music_note, color: Color(0xFFF59E0B), size: 36),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('AudioForge_Demo_Song.wav',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text('48,000 Hz • Stereo • 32-bit Float',
                            style: TextStyle(color: Colors.white54, fontSize: 12)),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: Colors.black,
                    ),
                    onPressed: () {},
                    icon: const Icon(Icons.upload_file, size: 16),
                    label: const Text('IMPORT SONG'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Profile selection
          const Text('1. SELECT MASTERING TARGET PROFILE',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
          const SizedBox(height: 8),

          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 2.2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: _profiles.length,
              itemBuilder: (context, index) {
                final p = _profiles[index];
                final isSelected = _selectedProfile == p['name'];
                return InkWell(
                  onTap: () {
                    setState(() => _selectedProfile = p['name']!);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF261E10) : const Color(0xFF131722),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSelected ? const Color(0xFFF59E0B) : Colors.white10,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(p['name']!,
                            style: TextStyle(
                              color: isSelected ? const Color(0xFFF59E0B) : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            )),
                        const SizedBox(height: 4),
                        Text(p['desc']!,
                            style: const TextStyle(color: Colors.white60, fontSize: 11),
                            maxLines: 2),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Bottom Audition & Export
          Row(
            children: [
              IconButton.filled(
                style: IconButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
                onPressed: () => setState(() => _isPlaying = !_isPlaying),
                icon: Icon(_isPlaying ? Icons.pause : Icons.play_arrow, color: Colors.black),
              ),
              const SizedBox(width: 12),
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: true, label: Text('MASTERED')),
                  ButtonSegment(value: false, label: Text('ORIGINAL (A/B)')),
                ],
                selected: {_isAuditionMaster},
                onSelectionChanged: (val) => setState(() => _isAuditionMaster = val.first),
              ),
              const Spacer(),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                ),
                onPressed: () {},
                icon: const Icon(Icons.download, size: 18),
                label: const Text('EXPORT MASTERED WAV'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
