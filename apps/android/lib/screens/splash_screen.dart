import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../widgets/brand_logo.dart';

/// Shows the logo while [initialise] runs, then replaces itself with [builder]'s
/// screen. On failure it offers a retry instead of a blank or crashed app.
class SplashScreen<T> extends StatefulWidget {
  const SplashScreen({super.key, required this.initialise, required this.builder, this.onReady});

  final Future<T> Function() initialise;
  final Widget Function(T result) builder;

  /// Called with the result before navigating, e.g. to provide it app-wide.
  final void Function(T result)? onReady;

  @override
  State<SplashScreen<T>> createState() => _SplashScreenState<T>();
}

class _SplashScreenState<T> extends State<SplashScreen<T>> {
  Object? _error;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    setState(() => _error = null);
    try {
      final result = await widget.initialise();
      if (!mounted) return;
      widget.onReady?.call(result);
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => widget.builder(result)));
    } catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const BrandLogo(height: 120),
              const SizedBox(height: 32),
              if (_error == null)
                const CircularProgressIndicator()
              else ...[
                const Text('ॲप सुरू करताना अडचण आली.', style: TextStyle(color: Colors.black87)),
                if (kDebugMode) ...[
                  const SizedBox(height: 8),
                  Text('$_error', textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54, fontSize: 12)),
                ],
                const SizedBox(height: 12),
                FilledButton(onPressed: _start, child: const Text('पुन्हा प्रयत्न करा')),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
