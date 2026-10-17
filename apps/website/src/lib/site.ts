import { CHANNEL } from "@swarajya/shared";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE = {
  name: CHANNEL.name,
  nameMarathi: CHANNEL.nameMarathi,
  description: "Swarajya News — Marathi news from your district, taluka and village, with recorded video reports.",
  social: {
    youtube: `https://www.youtube.com/${CHANNEL.youtubeHandle}`,
  },
} as const;

export const NAV_LINKS = [
  { href: "/", label: "मुख्यपृष्ठ" },
  { href: "/news", label: "ताज्या बातम्या" },
  { href: "/breaking-news", label: "ब्रेकिंग न्यूज" },
  { href: "/video-news", label: "व्हिडिओ बातम्या" },
  { href: "/about", label: "आमच्याबद्दल" },
  { href: "/contact", label: "संपर्क" },
] as const;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
