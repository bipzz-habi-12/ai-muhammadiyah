import Link from "next/link";

// Design v2 icon rail, shared by the full-shell pages (Library, and later Hub /
// Research / Settings). Purely presentational — no hooks or client APIs — so it
// renders in both Server and Client components. Only links to routes that
// actually exist in the app; the active item is a non-link highlight.

type RailKey = "workspaces" | "chat" | "research" | "library" | "hub" | "history";

function WorkspaceGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="6.5" rx="1.6" />
      <rect x="3" y="13.5" width="18" height="6.5" rx="1.6" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" />
    </svg>
  );
}

function ResearchGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
    </svg>
  );
}

function LibraryGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l8.5 4.6L12 12.2 3.5 7.6 12 3z" />
      <path d="M3.5 12l8.5 4.6L20.5 12" />
    </svg>
  );
}

function HubGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10.8 5 8.8 4.2 4.8 4.2V18c4 0 6 .8 7.2 2.3M12 6.5c1.2-1.5 3.2-2.3 7.2-2.3V18c-4 0-6 .8-7.2 2.3M12 6.5V20.3" />
    </svg>
  );
}

function HistoryGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

const items: { key: RailKey; href: string; title: string; glyph: React.ReactNode }[] = [
  { key: "workspaces", href: "/workspace", title: "Workspaces", glyph: <WorkspaceGlyph /> },
  { key: "chat", href: "/", title: "Chat", glyph: <ChatGlyph /> },
  { key: "research", href: "/research", title: "Research", glyph: <ResearchGlyph /> },
  { key: "library", href: "/library", title: "Library", glyph: <LibraryGlyph /> },
  { key: "hub", href: "/hub", title: "Muhammadiyah Hub", glyph: <HubGlyph /> },
  { key: "history", href: "/history", title: "Riwayat", glyph: <HistoryGlyph /> },
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
    <div className="flex w-[66px] shrink-0 flex-col items-center gap-1.5 bg-[#0b3d2a] py-4">
      <Link
        href="/"
        aria-label="Beranda"
        className="mb-3.5 grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-[#e7c77e] text-lg font-bold text-[#0b3d2a]"
      >
        <span aria-hidden="true">م</span>
      </Link>
      {items.map((item) =>
        item.key === active ? (
          <div
            key={item.key}
            title={item.title}
            aria-current="page"
            className="grid h-[42px] w-[42px] place-items-center rounded-[11px] bg-white/[0.14] text-[#f3efe2]"
          >
            {item.glyph}
          </div>
        ) : (
          <Link
            key={item.key + item.href}
            href={item.href}
            title={item.title}
            aria-label={item.title}
            className="grid h-[42px] w-[42px] place-items-center rounded-[11px] text-[#9fb3a5] transition hover:bg-white/[0.08] hover:text-[#f3efe2]"
          >
            {item.glyph}
          </Link>
        ),
      )}
      <div className="flex-1" />
      <Link
        href="/"
        title="Akun"
        aria-label="Akun"
        className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[#147553] text-sm font-semibold text-[#f3efe2]"
      >
        {userInitials}
      </Link>
    </div>
  );
}
