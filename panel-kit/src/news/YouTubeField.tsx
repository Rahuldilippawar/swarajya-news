"use client";

import { parseYouTubeUrl, youTubeEmbedUrl, type VideoStatus } from "@swarajya/shared";

const STATUS_TEXT: Record<VideoStatus, { tone: string; text: string }> = {
  AVAILABLE: { tone: "ok", text: "Verified on YouTube" },
  UNAVAILABLE: { tone: "danger", text: "Unavailable — private, deleted or embedding disabled" },
  UNVERIFIED: { tone: "warn", text: "Not verified yet (YouTube could not be reached)" },
};

/**
 * YouTube link input with instant format checking and an embedded preview.
 * Whether the video is actually public and embeddable is checked by Cloud
 * Functions on submit and publish; `verifiedStatus` shows that result.
 */
export function YouTubeField({
  value,
  onChange,
  verifiedStatus,
  locked,
}: {
  value: string;
  onChange: (value: string) => void;
  verifiedStatus?: VideoStatus | null;
  locked?: boolean;
}) {
  const parsed = value.trim() ? parseYouTubeUrl(value) : null;

  return (
    <div className="panel-form-stack">
      <label>
        YouTube video link
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://youtu.be/…"
          disabled={locked}
          aria-invalid={parsed?.ok === false}
        />
        {locked && <span className="panel-hint">Unpublish the article to change its video.</span>}
        {parsed && !parsed.ok && <span className="panel-field-error">{parsed.reason}</span>}
        {parsed?.ok && (
          <span className="panel-hint">
            Video ID <code>{parsed.videoId}</code>
            {parsed.isShort && " · Short"}
            {verifiedStatus && (
              <> · <span className="panel-badge" data-tone={STATUS_TEXT[verifiedStatus].tone}>{STATUS_TEXT[verifiedStatus].text}</span></>
            )}
          </span>
        )}
      </label>
      {parsed?.ok && (
        <div className="panel-video">
          <iframe
            src={youTubeEmbedUrl(parsed.videoId)}
            title="YouTube video preview"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
