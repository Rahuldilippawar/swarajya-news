import Image from "next/image";
import Link from "next/link";
import { getCategories } from "@/lib/news";
import { NAV_LINKS, SITE } from "@/lib/site";

export async function SiteHeader() {
  const categories = await getCategories();
  return (
    <header className="site-header">
      <div className="bar container">
        <Link href="/" className="brand" aria-label={`${SITE.name} — मुख्यपृष्ठ`}>
          <Image src="/logo.svg" alt="" width={96} height={54} priority />
          <strong>{SITE.nameMarathi}</strong>
        </Link>
        <form action="/search" role="search" className="header-search">
          <input type="search" name="q" placeholder="बातम्या शोधा" aria-label="बातम्या शोधा" />
        </form>
      </div>
      <nav className="site-nav" aria-label="मुख्य">
        <ul>
          {NAV_LINKS.filter((l) => l.href !== "/about" && l.href !== "/contact").map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          {categories.slice(0, 8).map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}`}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
