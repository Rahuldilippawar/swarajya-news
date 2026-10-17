"use client";

import { youTubeEmbedUrl, youTubeThumbnailUrl, youTubeWatchUrl } from "@swarajya/shared";
import Image from "next/image";
import { useState } from "react";

/**
 * Click-to-play YouTube embed: shows the thumbnail first so the page stays
 * fast, then loads YouTube's own player (with its branding and ads, as the
 * YouTube terms require). A direct YouTube link is always offered in case the
 * video cannot be embedded on this device.
 */
export function VideoPlayer({ videoId, title, isShort }: { videoId: string; title: string; isShort: boolean }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="video-block">
      <div className={`video-frame${isShort ? " video-short" : ""}`}>
        {playing ? (
          <iframe
            src={`${youTubeEmbedUrl(videoId)}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className="video-poster" onClick={() => setPlaying(true)} aria-label={`व्हिडिओ पाहा: ${title}`}>
            <Image src={youTubeThumbnailUrl(videoId)} alt="" fill sizes="(max-width: 900px) 100vw, 800px" />
            <span className="video-play" aria-hidden="true">▶</span>
          </button>
        )}
      </div>
      <a className="video-link" href={youTubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer">
        व्हिडिओ चालत नसल्यास YouTube वर पाहा ↗
      </a>
    </div>
  );
}
