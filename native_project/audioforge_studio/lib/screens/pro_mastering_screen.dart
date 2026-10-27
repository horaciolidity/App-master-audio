import 'package:flutter/material.dart';
import '../engine/dsp_ffi.dart';

class ProMasteringScreen extends StatefulWidget {
  const ProMasteringScreen({super.key});

  @override
  State<ProMasteringScreen> createState() => _ProMasteringScreenState();
}

class _ProMasteringScreenState extends State<ProMasteringScreen> {
  double _threshold = -16.0;
  double _ratio = 2.5;
  double _ceiling = -0.3;
  double _stereoWidth = 1.0;
  bool _eqEngaged = true;
  bool _compEngaged = true;
  bool _limiterEngaged = true;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: ListView(
        children: [
          // EQ Section
          Card(
            color: const Color(0xFF131722),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      const Text('5-BAND PARAMETRIC EQUALIZER',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFF59E0B))),
                      Switch(
                        value: _eqEngaged,
                        activeColor: const Color(0xFFF59E0B),
                        onChanged: (v) => setState(() => _eqEngaged = v),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    height: 120,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFF090B0E),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: const Center(
                      child: Text('Interactive Real-time Biquad Filter Curve',
                          style: TextStyle(color: Colors.white38, fontSize: 11)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Dynamics Compressor & Limiter
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Card(
                  color: const Color(0xFF131722),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('DYNAMICS COMPRESSOR',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF38BDF8))),
                        const SizedBox(height: 12),
                        Text('Threshold: ${_threshold.toStringAsFixed(1)} dB'),
                        Slider(
                          value: _threshold,
                          min: -40,
                          max: 0,
                          activeColor: const Color(0xFF38BDF8),
                          onChanged: (v) => setState(() => _threshold = v),
                        ),
                        Text('Ratio: ${_ratio.toStringAsFixed(1)}:1'),
                        Slider(
                          value: _ratio,
                          min: 1,
                          max: 20,
                          activeColor: const Color(0xFF38BDF8),
                          onChanged: (v) => setState(() => _ratio = v),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Card(
                  color: const Color(0xFF131722),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('BRICKWALL LIMITER & LUFS',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFEF4444))),
                        const SizedBox(height: 12),
                        Text('Ceiling: ${_ceiling.toStringAsFixed(1)} dBTP'),
                        Slider(
                          value: _ceiling,
                          min: -6,
                          max: 0,
                          activeColor: const Color(0xFFEF4444),
                          onChanged: (v) => setState(() => _ceiling = v),
                        ),
                        Text('Stereo Width: ${_stereoWidth.toStringAsFixed(2)}x'),
                        Slider(
                          value: _stereoWidth,
                          min: 0,
                          max: 2,
                          activeColor: Colors.purpleAccent,
                          onChanged: (v) => setState(() => _stereoWidth = v),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
