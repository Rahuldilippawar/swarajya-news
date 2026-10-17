import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS, SITE } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="bar container">
        <Link href="/" className="brand" aria-label={`${SITE.name} — मुख्यपृष्ठ`}>
          <Image src="/logo.svg" alt="" width={96} height={54} priority />
          <strong>{SITE.nameMarathi}</strong>
        </Link>
      </div>
      <nav className="site-nav" aria-label="मुख्य">
        <ul>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
