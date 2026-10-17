import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

import '../data/youtube.dart';

/// Full-screen YouTube's own embedded player (with YouTube's branding and ads,
/// as its terms require). If a video cannot be embedded YouTube shows its own
/// message; "Open in YouTube" is always available.
class VideoPlayerScreen extends StatefulWidget {
  const VideoPlayerScreen({super.key, required this.videoId, required this.title, this.isShort = false});

  final String videoId;
  final String title;
  final bool isShort;

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  late final YoutubePlayerController _controller = YoutubePlayerController.fromVideoId(
    videoId: widget.videoId,
    autoPlay: true,
    params: const YoutubePlayerParams(showFullscreenButton: true, strictRelatedVideos: true),
  );

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, title: Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: Column(
        children: [
          Expanded(
            child: Center(
              child: YoutubePlayer(controller: _controller, aspectRatio: widget.isShort ? 9 / 16 : 16 / 9),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: TextButton.icon(
                onPressed: () => openInYouTube(widget.videoId),
                icon: const Icon(Icons.open_in_new, color: Colors.white),
                label: const Text('YouTube ॲपमध्ये उघडा', style: TextStyle(color: Colors.white)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

Future<void> openInYouTube(String videoId) async {
  await launchUrl(Uri.parse(YouTubeLink(videoId, isShort: false).watchUrl), mode: LaunchMode.externalApplication);
}
