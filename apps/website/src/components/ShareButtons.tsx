"use client";

import { useState } from "react";
import { whatsAppShareUrl } from "@/lib/seo";

export function ShareButtons({ headline, summary, url }: { headline: string; summary: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("ही लिंक कॉपी करा:", url);
    }
  }

  return (
    <div className="share">
      <a className="share-btn share-whatsapp" href={whatsAppShareUrl({ headline, summary }, url)} target="_blank" rel="noopener noreferrer">
        WhatsApp वर शेअर करा
      </a>
      <button type="button" className="share-btn" onClick={copy}>{copied ? "लिंक कॉपी झाली ✓" : "लिंक कॉपी करा"}</button>
    </div>
  );
}
