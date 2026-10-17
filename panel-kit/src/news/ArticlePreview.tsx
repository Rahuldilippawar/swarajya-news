import { parseYouTubeUrl, youTubeEmbedUrl } from "@swarajya/shared";

/** Approximates how the article will read on the public website. */
export function ArticlePreview({
  headline,
  summary,
  content,
  youtubeUrl,
  thumbnailUrl,
  meta,
}: {
  headline: string;
  summary: string;
  content: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  meta: string;
}) {
  const video = youtubeUrl.trim() ? parseYouTubeUrl(youtubeUrl) : null;
  const paragraphs = content.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <article className="panel-card panel-preview">
      <h1>{headline || "Headline"}</h1>
      <p className="panel-muted">{meta}</p>
      {summary && <p className="lead">{summary}</p>}
      {video?.ok ? (
        <div className="panel-video">
          <iframe src={youTubeEmbedUrl(video.videoId)} title={headline} allowFullScreen loading="lazy" />
        </div>
      ) : (
        thumbnailUrl && <img className="panel-thumb" src={thumbnailUrl} alt="" />
      )}
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </article>
  );
}
