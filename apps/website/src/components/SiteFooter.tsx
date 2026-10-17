import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <h3>{SITE.nameMarathi}</h3>
            <p>{SITE.description}</p>
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
              <li><a href={SITE.social.youtube} target="_blank" rel="noopener noreferrer">YouTube</a></li>
            </ul>
          </div>
        </div>
        <p className="copy">© {new Date().getFullYear()} {SITE.name}. सर्व हक्क राखीव.</p>
      </div>
    </footer>
  );
}
