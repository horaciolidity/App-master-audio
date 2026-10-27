import 'package:flutter/material.dart';

class AiModelManagerScreen extends StatefulWidget {
  const AiModelManagerScreen({super.key});

  @override
  State<AiModelManagerScreen> createState() => _AiModelManagerScreenState();
}

class _AiModelManagerScreenState extends State<AiModelManagerScreen> {
  final List<Map<String, dynamic>> _models = [
    {
      'name': 'Demucs v4 Hybrid Stems',
      'type': 'ONNX INT8',
      'size': '84 MB',
      'license': 'MIT (Meta AI / Open Source)',
      'status': 'Installed (Active)',
      'desc': '4-stem instrument separation (Drums, Bass, Other, Vocals) running locally.'
    },
    {
      'name': 'Matchering 2.0 Reference',
      'type': 'ONNX INT8',
      'size': '32 MB',
      'license': 'GPL-3.0 (Matchering)',
      'status': 'Available',
      'desc': 'Matches the spectral curve and RMS envelope of any commercial reference track.'
    },
    {
      'name': 'EnCodec Studio Neural Codec',
      'type': 'ONNX FP16',
      'size': '48 MB',
      'license': 'CC-BY-NC 4.0',
      'status': 'Available',
      'desc': 'Neural artifact removal and super-resolution upsampling to 48kHz.'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF131722),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white10),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.memory, color: Color(0xFFF59E0B)),
                    SizedBox(width: 8),
                    Text('LOCAL AI MODEL MANAGER',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                SizedBox(height: 6),
                Text(
                  'Zero cloud API calls, zero paid tokens. Models run entirely on your local device CPU/NPU hardware.',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          Expanded(
            child: ListView.separated(
              itemCount: _models.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final m = _models[index];
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131722),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(m['name'] as String,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 2),
                            Text('${m['type']} • ${m['size']} • License: ${m['license']}',
                                style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 11)),
                            const SizedBox(height: 4),
                            Text(m['desc'] as String,
                                style: const TextStyle(color: Colors.white60, fontSize: 12)),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: m['status'] == 'Installed (Active)'
                              ? const Color(0xFF10B981)
                              : const Color(0xFFF59E0B),
                          foregroundColor: Colors.black,
                        ),
                        onPressed: () {},
                        child: Text(m['status'] as String),
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
