/**
 * WhatsApp bulletins. The message is an approved WhatsApp template (Meta
 * requires templates for business-initiated messages). Its body must be,
 * exactly, BULLETIN_TEMPLATE_BODY — see docs/SETUP.md.
 */
export const BULLETIN_TEMPLATE_BODY =
  "स्वराज्य न्यूज — {{1}}\n\n{{2}}\n\n{{3}}\n\nसविस्तर बातमी वाचा आणि व्हिडिओ पाहा:\n{{4}}\n\nसूचना बंद करण्यासाठी STOP पाठवा.";

/** A send is refused above this many recipients (one function run); larger lists need a queue. */
export const MAX_BULLETIN_RECIPIENTS = 1000;

export const WHATSAPP_GROUP_ALL = "ALL";

/** Recipient group: everyone, or subscribers of one district (its location ID). */
export type WhatsAppGroup = string;

/**
 * Normalises a phone number to E.164. Ten-digit Indian mobile numbers (with
 * optional 0, 91 or +91 prefixes) become +91XXXXXXXXXX; other countries must
 * be written with "+" and the country code. Returns null if not a valid number.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  const digits = raw.replace(/[\s\-().]/g, "");
  if (/^\+\d{8,15}$/.test(digits)) {
    if (digits.startsWith("+91")) return /^\+91[6-9]\d{9}$/.test(digits) ? digits : null;
    return digits;
  }
  const local = digits.replace(/^(?:0091|91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

/** Firestore document ID for a subscriber: the number without "+", so one person is one document. */
export function subscriberId(e164: string): string {
  return e164.replace(/^\+/, "");
}

export function bulletinJobId(newsId: string, group: WhatsAppGroup): string {
  return `${newsId}__${group.replace(/[^A-Za-z0-9_.~-]/g, "_")}`;
}

/** WhatsApp template parameters may not contain new lines, tabs or more than four spaces in a row. */
function templateText(value: string, max: number): string {
  const clean = value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export interface BulletinInput {
  headline: string;
  summary: string;
  isBreaking: boolean;
  url: string;
}

/** The four template parameters, in order. */
export function bulletinParams(a: BulletinInput): [string, string, string, string] {
  return [
    a.isBreaking ? "ब्रेकिंग न्यूज" : "ताजी बातमी",
    templateText(a.headline, 200),
    templateText(a.summary || a.headline, 600),
    a.url,
  ];
}

/** The message as recipients will see it, for previews. */
export function renderBulletin(params: readonly string[]): string {
  return BULLETIN_TEMPLATE_BODY.replace(/\{\{(\d)\}\}/g, (_, i: string) => params[Number(i) - 1] ?? "");
}

/** Words that opt a recipient out or back in when they message the business number. */
export const OPT_OUT_WORDS = ["stop", "unsubscribe", "बंद", "थांबवा"];
export const OPT_IN_WORDS = ["start", "subscribe", "सुरू"];

export function optKeyword(text: string): "OUT" | "IN" | null {
  const t = text.trim().toLowerCase();
  if (OPT_OUT_WORDS.includes(t)) return "OUT";
  if (OPT_IN_WORDS.includes(t)) return "IN";
  return null;
}
