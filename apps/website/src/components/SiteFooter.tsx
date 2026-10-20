import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

export const SOCIAL_NAMES = { youtube: "YouTube", facebook: "Facebook", instagram: "Instagram", whatsapp: "WhatsApp", telegram: "Telegram", x: "X" } as const;

export async function SiteFooter() {
  const settings = await getSettings();
  const social = (Object.keys(SOCIAL_NAMES) as (keyof typeof SOCIAL_NAMES)[]).filter((k) => settings.socialLinks[k]);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <h3>{settings.channelName}</h3>
            <p>{settings.tagline ?? SITE.description}</p>
            {settings.tvChannel && <p>टीव्हीवर पाहा: {settings.tvChannel}</p>}
          </div>
          <div>
            <h3>माहिती</h3>
            <ul>
              <li><Link href="/about">आमच्याबद्दल</Link></li>
              <li><Link href="/contact">संपर्क</Link></li>
              <li><Link href="/editorial-policy">संपादकीय धोरण</Link></li>
              <li><Link href="/privacy-policy">गोपनीयता धोरण</Link></li>
            </ul>
          </div>
          <div>
            <h3>आम्हाला फॉलो करा</h3>
            <ul>
              {social.map((k) => (
                <li key={k}><a href={settings.socialLinks[k]} target="_blank" rel="noopener noreferrer">{SOCIAL_NAMES[k]}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <p className="copy">© {new Date().getFullYear()} {SITE.name}. सर्व हक्क राखीव.</p>
      </div>
    </footer>
  );
}
