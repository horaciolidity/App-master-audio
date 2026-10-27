import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/easy_mastering_screen.dart';
import 'screens/pro_mastering_screen.dart';
import 'screens/multitrack_screen.dart';
import 'screens/ai_model_manager_screen.dart';
import 'engine/dsp_ffi.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // High performance studio display settings
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    systemNavigationBarColor: Color(0xFF0B0D13),
  ));

  // Initialize native C++ DSP engine at 48kHz, 512 samples
  AudioForgeDspBridge().init(48000, 512);

  runApp(const AudioForgeStudioApp());
}

class AudioForgeStudioApp extends StatelessWidget {
  const AudioForgeStudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AUDIOFORGE AI STUDIO',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0D13),
        primaryColor: const Color(0xFFF59E0B),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF59E0B),
          secondary: Color(0xFF38BDF8),
          surface: Color(0xFF131722),
          background: Color(0xFF0B0D13),
        ),
        fontFamily: 'Roboto',
      ),
      home: const StudioMainScreen(),
    );
  }
}

class StudioMainScreen extends StatefulWidget {
  const StudioMainScreen({super.key});

  @override
  State<StudioMainScreen> createState() => _StudioMainScreenState();
}

class _StudioMainScreenState extends State<StudioMainScreen> {
  int _currentTabIndex = 0; // 0: Easy Mode, 1: Pro Mastering, 2: Multitrack Mixer, 3: Local AI

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF131722),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                'AUDIOFORGE',
                style: TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                  letterSpacing: 1.5,
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'STUDIO',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 14,
                letterSpacing: 2,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            // Mode Segmented Switch
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: const Color(0xFF090B0E),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _modeButton(0, 'EASY MASTER', Icons.auto_awesome),
                  _modeButton(1, 'PRO MASTER', Icons.equalizer),
                  _modeButton(2, 'MULTITRACK', Icons.view_column_rounded),
                  _modeButton(3, 'LOCAL AI', Icons.memory),
                ],
              ),
            ),
          ],
        ),
      ),
      body: IndexedStack(
        index: _currentTabIndex,
        children: const [
          EasyMasteringScreen(),
          ProMasteringScreen(),
          MultitrackScreen(),
          AiModelManagerScreen(),
        ],
      ),
    );
  }

  Widget _modeButton(int index, String label, IconData icon) {
    final isSelected = _currentTabIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _currentTabIndex = index),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF59E0B) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? Colors.black : Colors.white70),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.black : Colors.white70,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
