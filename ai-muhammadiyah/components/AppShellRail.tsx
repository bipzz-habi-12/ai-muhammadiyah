import Link from "next/link";
import { SparkIcon } from "@/components/icons";

// Sidebar desktop untuk halaman non-chat (Library, Hub, Research, Work,
// Workspaces, Settings). Design premium Langkah 53: dulu ini rail ikon 66px
// hijau tua TANPA breakpoint — dua masalah sekaligus, karena bentuknya berbeda
// dari sidebar halaman chat (dua sistem navigasi) dan di HP ia tetap memakan
// lebar. Sekarang: panel netral 264px dengan label, `hidden md:flex`, dan di HP
// digantikan <BottomNav />.
//
// Tetap purely presentational (tanpa hook/client API) supaya bisa dirender dari
// Server Component seperti sebelumnya, dan tetap memakai nama + props yang sama
// agar keenam halaman pemakainya tidak perlu diubah.

type RailKey =
  | "workspaces"
  | "chat"
  | "work"
  | "research"
  | "library"
  | "hub"
  | "history";

function ChatGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" />
    </svg>
  );
}

function WorkspaceGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="6.5" rx="1.6" />
      <rect x="3" y="13.5" width="18" height="6.5" rx="1.6" />
    </svg>
  );
}

function LibraryGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l8.5 4.6L12 12.2 3.5 7.6 12 3z" />
      <path d="M3.5 12l8.5 4.6L20.5 12" />
    </svg>
  );
}

function ResearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
    </svg>
  );
}

function WorkGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="7" width="19" height="13" rx="2" />
      <path d="M8.5 7V5.2A1.7 1.7 0 0 1 10.2 3.5h3.6A1.7 1.7 0 0 1 15.5 5.2V7" />
      <path d="M2.5 12.5h19" />
    </svg>
  );
}

function HubGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10.8 5 8.8 4.2 4.8 4.2V18c4 0 6 .8 7.2 2.3M12 6.5c1.2-1.5 3.2-2.3 7.2-2.3V18c-4 0-6 .8-7.2 2.3M12 6.5V20.3" />
    </svg>
  );
}

function HistoryGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

const items: { key: RailKey; href: string; label: string; glyph: React.ReactNode }[] = [
  { key: "chat", href: "/", label: "Chat", glyph: <ChatGlyph /> },
  { key: "workspaces", href: "/workspace", label: "Workspaces", glyph: <WorkspaceGlyph /> },
  { key: "library", href: "/library", label: "Library", glyph: <LibraryGlyph /> },
  { key: "research", href: "/research", label: "Research", glyph: <ResearchGlyph /> },
  { key: "work", href: "/work", label: "Work", glyph: <WorkGlyph /> },
  { key: "hub", href: "/hub", label: "Muhammadiyah Hub", glyph: <HubGlyph /> },
  { key: "history", href: "/history", label: "Riwayat", glyph: <HistoryGlyph /> },
];

export default function AppShellRail({
  active,
  userInitials,
}: {
  // A RailKey highlights that item; any other value (e.g. "settings") highlights none.
  active: RailKey | (string & {});
  userInitials: string;
}) {
  return (
    <aside className="hidden w-[264px] shrink-0 flex-col border-r border-[var(--hairline)] bg-[var(--surface-panel)] md:flex">
      <div className="flex flex-col gap-3 p-3.5 pb-0">
        <div className="flex h-10 items-center gap-2.5">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-[var(--brand)] text-[var(--on-brand)]">
            <SparkIcon className="h-[17px] w-[17px]" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-[var(--ink)]">
            M-Agent
          </span>
        </div>

        <Link
          href="/"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-[14.5px] font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Obrolan baru
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pt-3.5">
        <div className="space-y-px">
          {items.map((item) =>
            item.key === active ? (
              <div
                key={item.key}
                aria-current="page"
                className="flex h-[38px] items-center gap-3 rounded-[10px] bg-[var(--brand-soft)] px-2.5 text-sm font-semibold text-[var(--brand)]"
              >
                <span className="shrink-0">{item.glyph}</span>
                <span className="truncate">{item.label}</span>
              </div>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                className="flex h-[38px] items-center gap-3 rounded-[10px] px-2.5 text-sm text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)]"
              >
                <span className="shrink-0 text-[var(--muted-2)]">{item.glyph}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            ),
          )}
        </div>
      </nav>

      <div className="border-t border-[var(--hairline)] p-2.5">
        <Link
          href="/more"
          className="flex h-12 items-center gap-2.5 rounded-xl px-2.5 transition hover:bg-[var(--surface-alt)]"
        >
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-xs font-semibold text-[var(--brand)]">
            {userInitials}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--ink)]">
            Akun &amp; pengaturan
          </span>
          <span className="shrink-0 text-[var(--muted-3)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </Link>
      </div>
    </aside>
  );
}
