import type { AppSettingsDoc } from "./firestore";

export interface ShareableArticle {
  headline: string;
  slug?: string | null;
  youtubeUrl?: string | null;
}

/**
 * The text staff paste into WhatsApp groups and the channel for a published
 * article, in the channel's house format: link, bold-italic headline, then the
 * "join us" block built from Admin → Settings. WhatsApp offers no API for
 * posting to groups, so this is shared by hand (see the share button in the panels).
 */
export function whatsappShareText(
  article: ShareableArticle,
  settings: Pick<AppSettingsDoc, "channelName" | "socialLinks" | "contactDetails" | "tvChannel">,
  siteUrl: string,
): string {
  const site = siteUrl.replace(/\/+$/, "");
  const articleUrl = site && article.slug ? `${site}/news/${article.slug}` : null;
  const s = settings.socialLinks;
  const c = settings.contactDetails;
  const lines: string[] = [];

  // The video first (WhatsApp shows its preview), then the full story on the website.
  if (article.youtubeUrl) lines.push(article.youtubeUrl);
  else if (articleUrl) lines.push(articleUrl);
  lines.push(`_*${article.headline.trim()}*_`);
  if (article.youtubeUrl && articleUrl) lines.push(`📰 संपूर्ण बातमी: ${articleUrl}`);

  const join: string[] = [];
  if (s.whatsapp) join.push(`🔷 *व्हाट्सअप* ${s.whatsapp}`);
  if (s.telegram) join.push(`🔷 *टेलिग्राम* ${s.telegram}`);
  if (s.facebook) join.push(`🔷 *फेसबुक* ${s.facebook}`);
  if (s.instagram) join.push(`🔷 *इंस्टाग्राम* ${s.instagram}`);
  if (s.x) join.push(`🔷 *ट्विटर* ${s.x}`);
  if (s.youtube) join.push(`🔷 *यूट्यूब* ${s.youtube}`);
  if (join.length) lines.push("===============", "_*ताज्या अपडेट्स साठी जॉईन करा*_", ...join);

  const name = settings.channelName || "स्वराज्य न्यूज";
  let watch = `🔷 ${name} चॅनलचे बातमीपत्र पाहण्यासाठी like, comment, share आणि subscribe करा. तसेच बेल आयकॉन प्रेस करायला विसरू नका.`;
  if (settings.tvChannel) watch += ` ${name} चॅनल पहा आपल्या घरात टी.व्ही. वर... ${settings.tvChannel}`;
  lines.push(watch);

  if (c.editorName) {
    lines.push("===================", `🔷 *संचालक/ मुख्य संपादक - ${c.editorName}${c.editorPhone ? ` मो. ${c.editorPhone}` : ""}*`);
  }
  return lines.join("\n");
}

/** Opens WhatsApp (app on phones, WhatsApp Web on computers) with the text ready to send to chosen chats. */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
