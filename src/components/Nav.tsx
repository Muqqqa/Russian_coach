"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const I = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />,
  book: <path d="M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-7a2 2 0 00-2 2v14a2 2 0 012-2h7z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14 3h-4l-.6 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2L10 21h4l.6-2.7c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
    </>
  ),
};

const ITEMS = [
  { href: "/", label: "Oggi", icon: I.home },
  { href: "/lezione/", label: "Lezione", icon: I.book },
  { href: "/obiettivi/", label: "Obiettivi", icon: I.target },
  { href: "/progressi/", label: "Progressi", icon: I.chart },
  { href: "/impostazioni/", label: "Altro", icon: I.gear },
];

export function Nav() {
  const path = usePathname() ?? "/";
  const norm = (p: string) => (p.endsWith("/") ? p : p + "/");
  return (
    <nav className="nav" aria-label="Navigazione principale">
      {ITEMS.map((it) => {
        const active = it.href === "/" ? norm(path) === "/" : norm(path).startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {it.icon}
            </svg>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
