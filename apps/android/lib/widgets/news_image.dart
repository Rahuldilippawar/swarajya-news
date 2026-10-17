import 'package:flutter/material.dart';

/// Network image with a neutral placeholder while loading or when it fails (offline, deleted image…).
class NewsImage extends StatelessWidget {
  const NewsImage({super.key, required this.url, this.aspectRatio = 16 / 9});

  final String? url;
  final double aspectRatio;

  @override
  Widget build(BuildContext context) {
    final placeholder = ColoredBox(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Icon(Icons.image_outlined, color: Theme.of(context).colorScheme.outline),
    );
    return AspectRatio(
      aspectRatio: aspectRatio,
      child: url == null
          ? placeholder
          : Image.network(
              url!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => placeholder,
              loadingBuilder: (context, child, progress) => progress == null ? child : placeholder,
            ),
    );
  }
}
