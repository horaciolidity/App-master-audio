import 'package:flutter/material.dart';
import '../engine/dsp_ffi.dart';

class MultitrackScreen extends StatefulWidget {
  const MultitrackScreen({super.key});

  @override
  State<MultitrackScreen> createState() => _MultitrackScreenState();
}

class _MultitrackScreenState extends State<MultitrackScreen> {
  final List<Map<String, dynamic>> _tracks = [
    {'name': 'Drums (Kick & Snare)', 'color': Colors.red, 'vol': 0.0, 'pan': 0.0, 'mute': false, 'solo': false},
    {'name': 'Analog Bassline', 'color': Colors.amber, 'vol': 0.0, 'pan': 0.0, 'mute': false, 'solo': false},
    {'name': 'Rhythm Guitar Stabs', 'color': Colors.green, 'vol': -1.5, 'pan': -0.3, 'mute': false, 'solo': false},
    {'name': 'Atmospheric Keys Pad', 'color': Colors.cyan, 'vol': -2.0, 'pan': 0.3, 'mute': false, 'solo': false},
    {'name': 'Lead Melodic Vocal', 'color': Colors.purple, 'vol': +1.0, 'pan': 0.0, 'mute': false, 'solo': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // Toolbar
          Row(
            children: [
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: Colors.black,
                ),
                onPressed: () {},
                icon: const Icon(Icons.add, size: 16),
                label: const Text('ADD TRACK'),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.save, size: 16),
                label: const Text('SAVE PROJECT (.FORGEPROJ)'),
              ),
              const Spacer(),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.black,
                ),
                onPressed: () {},
                icon: const Icon(Icons.auto_awesome, size: 16),
                label: const Text('MASTER RESULTING MIX'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Track List
          Expanded(
            child: ListView.separated(
              itemCount: _tracks.length,
              separatorBuilder: (context, index) => const Divider(color: Colors.white10),
              itemBuilder: (context, index) {
                final track = _tracks[index];
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131722),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Row(
                    children: [
                      Container(width: 8, height: 40, color: track['color'] as Color),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(track['name'] as String,
                                style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text('Volume: ${(track['vol'] as double).toStringAsFixed(1)} dB • Pan: ${(track['pan'] as double).toStringAsFixed(2)}',
                                style: const TextStyle(color: Colors.white54, fontSize: 11)),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.volume_off,
                            color: track['mute'] as bool ? Colors.red : Colors.white38),
                        onPressed: () => setState(() => track['mute'] = !(track['mute'] as bool)),
                      ),
                      IconButton(
                        icon: Icon(Icons.headphones,
                            color: track['solo'] as bool ? const Color(0xFFF59E0B) : Colors.white38),
                        onPressed: () => setState(() => track['solo'] = !(track['solo'] as bool)),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
