import 'package:flutter/material.dart';

import '../widgets/brand_logo.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.initialise, required this.next});

  final Future<void> Function() initialise;
  final Widget next;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Object? _error;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    setState(() => _error = null);
    try {
      await widget.initialise();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => widget.next));
    } catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const BrandLogo(height: 120),
            const SizedBox(height: 32),
            if (_error == null)
              const CircularProgressIndicator()
            else ...[
              const Text('अॅप सुरू करताना अडचण आली.', style: TextStyle(color: Colors.black87)),
              const SizedBox(height: 12),
              FilledButton(onPressed: _start, child: const Text('पुन्हा प्रयत्न करा')),
            ],
          ],
        ),
      ),
    );
  }
}
