"use client";

import { ID_CARD_THEME, idCardVerifyUrl, type AppSettingsDoc, type IdCardDoc, type TimestampLike } from "@swarajya/shared";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** The rules printed on the back of every card (as on the channel's existing press card). */
const CARD_RULES = [
  "सदर ओळखपत्र हस्तांतरणीय नाही.",
  "ओळखपत्र धारकास वार्ता, बातमी संकलन कामी सहकार्य करावे.",
  "पोलीस तपासातील मजकूर, सभा, संमेलनासाठी प्राधान्य दिले जावे.",
  "जाहिराती, छायाचित्रासाठी पुरेपूर सहाय्य करावे.",
  "कोर्ट, पोलीस स्टेशन, तहसील, व्ही.आय.पी. प्रतिनिधी दौरा, सभा, विविध प्रकारचे वार्ता संकलनासाठी हे ओळखपत्र दिले आहे.",
];

const DEFAULT_TAGLINE = "सत्य हेच तुमच्या समोर !";

function toDate(t: TimestampLike | null | undefined): Date | null {
  if (!t) return null;
  if (t instanceof Date) return t;
  const v = t as { toDate?: () => Date; seconds?: number };
  if (typeof v.toDate === "function") return v.toDate();
  return typeof v.seconds === "number" ? new Date(v.seconds * 1000) : null;
}

const formatDate = (d: Date | null) =>
  d ? d.toLocaleDateString("mr-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" }) : "—";

export type CardSettings = Pick<AppSettingsDoc, "channelName" | "tagline" | "contactDetails" | "tvChannel">;

/**
 * Front and back of a staff press card at ID-1 size (54 × 85.6 mm). Sizes are
 * in container units so the same markup is crisp on screen and exact in print.
 */
export function IdCard({ card, settings, siteUrl }: { card: IdCardDoc; settings: CardSettings; siteUrl: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const verifyUrl = idCardVerifyUrl(siteUrl, card.cardId);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(verifyUrl, { margin: 0, width: 300, errorCorrectionLevel: "M" })
      .then((url) => live && setQr(url))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [verifyUrl]);

  const theme = ID_CARD_THEME[card.role];
  const tagline = settings.tagline || DEFAULT_TAGLINE;
  const c = settings.contactDetails;
  const inactive = card.status !== "ACTIVE";

  return (
    <div className="id-cards">
      <div className="id-card id-front" style={{ ["--band" as string]: theme.band }}>
        {inactive && <div className="id-void">रद्द / INVALID</div>}
        <div className="id-head">
          <img src="/logo.png" alt={settings.channelName} className="id-logo" />
          <div className="id-tagline">{tagline}</div>
        </div>
        <div className="id-middle">
          <div className="id-photo">{card.photoUrl ? <img src={card.photoUrl} alt="" /> : <span>फोटो</span>}</div>
          <div className="id-side">
            {qr && <img src={qr} alt="" className="id-qr" />}
            {settings.tvChannel && <div className="id-tv">{settings.tvChannel}</div>}
          </div>
        </div>
        <div className="id-band">
          <div className="id-name">{card.fullName}</div>
          <div className="id-designation">{card.designation}</div>
          <div className="id-meta">
            क्र. {card.cardNumber} · वैध: {formatDate(toDate(card.validUntil))}
          </div>
          <div className="id-foot">
            <span className="id-press">{theme.label}</span>
            <span className="id-sign">
              {c.editorName && <span className="id-sign-name">{c.editorName}</span>}
              <span>मुख्य संपादक</span>
            </span>
          </div>
        </div>
      </div>

      <div className="id-card id-back" style={{ ["--band" as string]: theme.band }}>
        <ul className="id-rules">
          {CARD_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="id-head">
          <img src="/logo.png" alt="" className="id-logo id-logo-small" />
          <div className="id-tagline">{tagline}</div>
        </div>
        <div className="id-office">
          <div className="id-office-title">✱ कार्यालय ✱</div>
          {c.address && <div>{c.address}</div>}
          {c.email && <div>✉ {c.email}</div>}
          {c.phone && <div>☎ {c.phone}</div>}
        </div>
        <div className="id-back-band">{theme.label}</div>
      </div>
    </div>
  );
}
