"use client";

import { APP_SETTINGS_DOC_ID, COLLECTIONS, whatsappShareText, whatsappShareUrl, type AppSettingsDoc, type ShareableArticle } from "@swarajya/shared";
import { doc } from "firebase/firestore";
import { useState } from "react";
import { getFirebase } from "../firebase";
import { useLiveDoc } from "../useLiveQuery";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/**
 * Ready-made WhatsApp message for a published article, in the channel's house
 * format. WhatsApp has no API for posting into groups or channels, so staff
 * send it themselves: the button opens WhatsApp with the text filled in, then
 * they pick the groups (WhatsApp lets you choose several chats at once).
 */
export function WhatsAppShare({ article }: { article: ShareableArticle }) {
  const settings = useLiveDoc<AppSettingsDoc>(() => doc(getFirebase().db, COLLECTIONS.appSettings, APP_SETTINGS_DOC_ID), []);
  const [copied, setCopied] = useState(false);
  if (settings.exists === null && !settings.error) return null;
  const text = whatsappShareText(article, settings.data ?? { channelName: "स्वराज्य न्यूज", contactDetails: {}, socialLinks: {} }, SITE_URL);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="panel-form-stack">
      <strong>WhatsApp groups &amp; channel</strong>
      <a className="panel-button" href={whatsappShareUrl(text)} target="_blank" rel="noopener noreferrer">
        WhatsApp वर पाठवा
      </a>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canShare && (
          <button type="button" className="panel-link" onClick={() => navigator.share({ text }).catch(() => undefined)}>
            Share…
          </button>
        )}
        <button type="button" className="panel-link" onClick={copy}>
          {copied ? "Copied ✓" : "Copy text"}
        </button>
      </div>
      <p className="panel-hint" style={{ margin: 0 }}>
        Opens WhatsApp with the message ready; choose your groups and send. For the WhatsApp channel, copy the text
        and paste it there.
      </p>
      <details>
        <summary className="panel-hint">Message preview</summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13, margin: "6px 0 0" }}>{text}</pre>
      </details>
    </div>
  );
}
