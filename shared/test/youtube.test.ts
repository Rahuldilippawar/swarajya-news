import { describe, expect, it } from "vitest";
import { parseYouTubeUrl } from "../src/youtube";

const ID = "dQw4w9WgXcQ";

describe("parseYouTubeUrl", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `youtu.be/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `  https://www.youtube.com/watch?v=${ID}  `,
  ])("accepts %s", (url) => {
    const result = parseYouTubeUrl(url);
    expect(result).toMatchObject({ ok: true, videoId: ID, isShort: false });
  });

  it("flags Shorts", () => {
    expect(parseYouTubeUrl(`https://youtube.com/shorts/${ID}`)).toMatchObject({ ok: true, videoId: ID, isShort: true });
  });

  it.each([
    "",
    "not a url",
    `https://youtube.com.evil.example/watch?v=${ID}`,
    `https://evil.example/watch?v=${ID}`,
    `javascript:alert(1)//youtube.com/watch?v=${ID}`,
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/@swarajyanews2025",
    "https://www.youtube.com/playlist?list=PL123",
    `https://www.youtube.com/watch?v=${ID}xx`,
  ])("rejects %j", (url) => {
    expect(parseYouTubeUrl(url).ok).toBe(false);
  });

  it("returns a canonical watch URL", () => {
    const result = parseYouTubeUrl(`https://youtu.be/${ID}`);
    expect(result.ok && result.canonicalUrl).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });
});
