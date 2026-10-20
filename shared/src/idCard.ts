import type { Role } from "./roles";

/** How long a press card is valid from issue or renewal. */
export const ID_CARD_VALID_DAYS = 365;

/** Printed designation for each role when no custom one is set. Reporters show their district. */
export function defaultDesignation(role: Role, districtName?: string | null): string {
  switch (role) {
    case "REPORTER":
      return districtName ? `प्रतिनिधी ${districtName} जिल्हा` : "प्रतिनिधी";
    case "EDITOR":
      return "संपादक";
    case "SOCIAL_MEDIA_MANAGER":
      return "सोशल मीडिया व्यवस्थापक";
    case "OWNER":
      return "संचालक";
    case "SUPER_ADMIN":
      return "व्यवस्थापक";
  }
}

/** Card colours by role, so a reporter's card is told apart from an editor's at a glance. */
export const ID_CARD_THEME: Record<Role, { band: string; label: string }> = {
  REPORTER: { band: "#c4161c", label: "PRESS" },
  EDITOR: { band: "#1b1f9e", label: "PRESS" },
  SOCIAL_MEDIA_MANAGER: { band: "#0f7a40", label: "PRESS" },
  OWNER: { band: "#7a1020", label: "PRESS" },
  SUPER_ADMIN: { band: "#14152b", label: "STAFF" },
};

/** Public verification address printed as the card's QR code. */
export function idCardVerifyUrl(siteUrl: string, cardId: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/verify/${cardId}`;
}

/** Card IDs are 20 URL-safe characters; anything else is rejected before a lookup. */
export function isValidCardId(id: string): boolean {
  return /^[A-Za-z0-9]{20}$/.test(id);
}
