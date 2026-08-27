"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Nav bawah khusus mobile (Design premium, Langkah 53). Menggantikan DUA hal
// sekaligus: sidebar yang `hidden md:flex` — sehingga di HP tidak ada jalan ke
// Workspaces/Library/Hub/Research sama sekali — dan rail ikon 66px yang dulu
// tetap tampil di HP dan memakan lebar halaman Library/Hub/Work/Research.
//
// Dirender sebagai anak flex biasa (bukan `fixed`), jadi tidak pernah menutupi
// composer atau isi halaman; tiap halaman cukup menaruhnya sebagai elemen
// terakhir di kolom utamanya.

type NavKey = "chat" | "workspace" | "library" | "more";

// Rute yang TIDAK punya tab sendiri (Hub, Research, Work, Riwayat, Settings,
// Plans) menyalakan tab "Lainnya" — di situlah semuanya bisa dijangkau.
function resolveActive(pathname: string): NavKey {
  if (pathname === "/") return "chat";
  if (pathname.startsWith("/workspace")) return "workspace";
  if (pathname.startsWith("/library")) return "library";
  return "more";
}

const items: { key: NavKey; href: string; label: string; glyph: React.ReactNode }[] = [
  {
    key: "chat",
    href: "/",
    label: "Chat",
    glyph: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" />
      </svg>
    ),
  },
  {
    key: "workspace",
    href: "/workspace",
    label: "Workspace",
    glyph: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="6.5" rx="1.6" />
        <rect x="3" y="13.5" width="18" height="6.5" rx="1.6" />
      </svg>
    ),
  },
  {
    key: "library",
    href: "/library",
    label: "Library",
    glyph: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8.5 4.6L12 12.2 3.5 7.6 12 3z" />
        <path d="M3.5 12l8.5 4.6L20.5 12" />
      </svg>
    ),
  },
  {
    key: "more",
    href: "/more",
    label: "Lainnya",
    glyph: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="12" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="19" cy="12" r="1.4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const active = resolveActive(pathname ?? "/");

  return (
    <nav
      aria-label="Navigasi utama"
      className="flex shrink-0 items-start border-t border-[var(--hairline)] bg-[var(--surface)] pb-3 pt-2.5 md:hidden"
    >
      {items.map((item) => {
        const isActive = item.key === active;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "flex flex-1 flex-col items-center gap-1.5 py-1 text-[var(--brand)]"
                : "flex flex-1 flex-col items-center gap-1.5 py-1 text-[var(--muted-3)] transition hover:text-[var(--ink-soft)]"
            }
          >
            {item.glyph}
            <span
              className={
                isActive ? "text-[11px] font-semibold" : "text-[11px] font-medium"
              }
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
