"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/formatting/text";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Design v2 port of Workspace.dc.html, wired to the real backend:
//  - workspace switcher sidebar (real chat_workspaces + per-workspace counts)
//  - conversation cards enriched with last-message preview, skill badge, and
//    latest-artifact badge (all read-only, RLS-scoped, fetched on the server)
//  - Workspace System slide-over that persists chat_workspaces.system_instructions
// Colours mirror the source design; interactivity is real React state.

export type WorkspaceSummary = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  count: number;
};

export type ChatItem = {
  id: string;
  title: string;
  updatedAt: string;
  isPinned: boolean;
  preview: string;
  skill: string | null;
  artifact: string | null;
};

type WorkspaceViewProps = {
  workspace: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    systemInstructions: string | null;
  };
  workspaces: WorkspaceSummary[];
  chats: ChatItem[];
  lastUpdatedIso: string | null;
  userInitials: string;
  hasError: boolean;
};

// Fallback tints for workspaces that have no stored color yet — taken from the
// source design's demo palette, assigned deterministically by id.
const fallbackTints = [
  { fg: "#0F5A3D", bg: "rgba(15,90,61,0.10)" },
  { fg: "#B08833", bg: "rgba(176,136,51,0.14)" },
  { fg: "#2E6E8E", bg: "rgba(46,110,142,0.13)" },
  { fg: "#5D6862", bg: "rgba(20,40,30,0.08)" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function tintFor(color: string | null, seed: string): { fg: string; bg: string } {
  if (color && /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(color)) {
    return { fg: color, bg: hexToRgba(color, 0.12) };
  }
  return fallbackTints[hashString(seed) % fallbackTints.length];
}

function glyphFor(name: string, icon: string | null): string {
  if (icon && icon.trim()) {
    return icon.trim();
  }
  const firstChar = name.trim().charAt(0);
  return firstChar ? firstChar.toUpperCase() : "◦";
}

// Two-rectangle "workspace" glyph reused from the source design.
function WorkspaceGlyph({ size = 21 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="6.5" rx="1.6" />
      <rect x="3" y="13.5" width="18" height="6.5" rx="1.6" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" />
    </svg>
  );
}

function RailIcon({
  href,
  title,
  active,
  children,
}: {
  href: string;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className={
        active
          ? "grid h-[42px] w-[42px] place-items-center rounded-[11px] bg-white/[0.14] text-[#f3efe2]"
          : "grid h-[42px] w-[42px] place-items-center rounded-[11px] text-[#9fb3a5] transition hover:bg-white/[0.08] hover:text-[#f3efe2]"
      }
    >
      {children}
    </Link>
  );
}

export default function WorkspaceView({
  workspace,
  workspaces,
  chats,
  lastUpdatedIso,
  userInitials,
  hasError,
}: WorkspaceViewProps) {
  const router = useRouter();

  const [systemOpen, setSystemOpen] = useState(false);
  const [instructions, setInstructions] = useState(
    workspace.systemInstructions ?? "",
  );
  const [draft, setDraft] = useState(workspace.systemInstructions ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [filter, setFilter] = useState<"recent" | "all">("recent");
  const [search, setSearch] = useState("");

  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const headerTint = tintFor(workspace.color, workspace.id);

  const filteredWorkspaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return workspaces;
    }
    return workspaces.filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [workspaces, search]);

  const visibleChats = useMemo(() => {
    if (filter === "all") {
      return chats;
    }
    return [...chats]
      .sort(
        (first, second) =>
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime(),
      )
      .slice(0, 6);
  }, [chats, filter]);

  const subtitle = `${chats.length} chat${
    lastUpdatedIso ? ` · diperbarui ${formatRelativeTime(lastUpdatedIso)}` : ""
  }`;

  function openSystem() {
    setDraft(instructions);
    setSaveError("");
    setSystemOpen(true);
  }

  async function saveSystem() {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setSaveError("");

    const nextValue = draft.trim() || null;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("chat_workspaces")
      .update({ system_instructions: nextValue })
      .eq("id", workspace.id);

    setIsSaving(false);

    if (error) {
      console.error(error);
      setSaveError("Instruksi belum bisa disimpan. Coba lagi.");
      return;
    }

    setInstructions(nextValue ?? "");
    setSystemOpen(false);
    router.refresh();
  }

  async function createWorkspace() {
    const name = newName.trim();
    if (!name || isCreating) {
      return;
    }
    setIsCreating(true);
    setSaveError("");

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("chat_workspaces")
      .insert({ name })
      .select("id")
      .single();

    setIsCreating(false);

    if (error || !data) {
      console.error(error);
      setSaveError("Workspace belum bisa dibuat. Coba lagi.");
      return;
    }

    setNewName("");
    setCreatingOpen(false);
    router.push(`/workspace/${data.id}`);
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f5f3ec] text-[#16211c]">
      {/* ICON RAIL */}
      <div className="flex w-[66px] shrink-0 flex-col items-center gap-1.5 bg-[#0b3d2a] py-4">
        <Link
          href="/"
          aria-label="Beranda"
          className="mb-3.5 grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-[#e7c77e] text-lg font-bold text-[#0b3d2a]"
        >
          <span aria-hidden="true">م</span>
        </Link>
        <div
          title="Workspaces"
          aria-current="page"
          className="grid h-[42px] w-[42px] place-items-center rounded-[11px] bg-white/[0.14] text-[#f3efe2]"
        >
          <WorkspaceGlyph />
        </div>
        <RailIcon href="/" title="Chat">
          <ChatGlyph />
        </RailIcon>
        <RailIcon href="/library" title="Library">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
            <path d="M11 4h3.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H11z" />
            <path d="M18 6l2 .5-2.5 12L15.5 18" />
          </svg>
        </RailIcon>
        <RailIcon href="/hub" title="Muhammadiyah Hub">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
        </RailIcon>
        <RailIcon href="/history" title="Riwayat">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 4v4h4" />
            <path d="M12 8v4l3 2" />
          </svg>
        </RailIcon>
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

      {/* WORKSPACE SIDEBAR */}
      <div className="scroll hidden w-[284px] shrink-0 overflow-y-auto border-r border-[#0b3d2a]/10 bg-[#f0eee6] px-4 py-6 md:block">
        <div className="mb-4 flex items-center justify-between px-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#7c857f]">
            Workspace
          </span>
          <button
            type="button"
            onClick={() => setCreatingOpen((open) => !open)}
            aria-label="Buat workspace baru"
            className="grid h-6 w-6 place-items-center rounded-[7px] text-lg text-[#5d6862] transition hover:bg-[#0b3d2a]/[0.07]"
          >
            +
          </button>
        </div>

        <div className="relative mb-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari workspace"
            className="h-[38px] w-full rounded-[9px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 text-[13.5px] text-[#16211c] outline-none transition focus:border-[#0f5a3d]"
          />
        </div>

        <div className="flex flex-col">
          {filteredWorkspaces.map((item) => {
            const isActive = item.id === workspace.id;
            const tint = tintFor(item.color, item.id);

            return (
              <Link
                key={item.id}
                href={`/workspace/${item.id}`}
                className={
                  isActive
                    ? "mb-0.5 flex items-center gap-3 rounded-[10px] bg-[#fbfaf6] px-2.5 py-2.5 shadow-[0_1px_3px_rgba(11,61,42,0.1)]"
                    : "mb-0.5 flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 transition hover:bg-[#0b3d2a]/[0.05]"
                }
              >
                <span
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg text-sm"
                  style={{ background: tint.bg, color: tint.fg }}
                >
                  {glyphFor(item.name, item.icon)}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      isActive
                        ? "block truncate text-sm font-bold text-[#25302a]"
                        : "block truncate text-sm font-medium text-[#25302a]"
                    }
                  >
                    {item.name}
                  </span>
                  <span className="block text-xs text-[#8a9089]">
                    {item.count} chat
                  </span>
                </span>
              </Link>
            );
          })}

          {creatingOpen ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void createWorkspace();
              }}
              className="mt-2.5 flex gap-2"
            >
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                autoFocus
                placeholder="Nama workspace"
                className="h-[38px] min-w-0 flex-1 rounded-[10px] border border-[#0b3d2a]/16 bg-[#fbfaf6] px-3 text-[13.5px] text-[#16211c] outline-none transition focus:border-[#0f5a3d]"
              />
              <button
                type="submit"
                disabled={!newName.trim() || isCreating}
                className="shrink-0 rounded-[10px] bg-[#0f5a3d] px-3 text-[13px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "…" : "Buat"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingOpen(true)}
              className="mt-2.5 flex items-center gap-2.5 rounded-[10px] border border-dashed border-[#0b3d2a]/[0.18] px-3 py-2.5 text-[13.5px] text-[#5d6862] transition hover:border-[#0f5a3d]"
            >
              <span className="text-base">+</span> Workspace baru
            </button>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div className="scroll flex-1 overflow-y-auto bg-[#f5f3ec]">
        <div className="mx-auto max-w-[860px] px-6 pb-20 pt-11 sm:px-11">
          {/* HEADER */}
          <div className="mb-3 flex items-start justify-between gap-6">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span
                className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px]"
                style={{ background: headerTint.bg, color: headerTint.fg }}
              >
                <WorkspaceGlyph size={26} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-serif text-[32px] font-normal leading-tight tracking-[-0.01em] text-[#12211b]">
                  {workspace.name}
                </h1>
                <div className="mt-0.5 text-[13.5px] text-[#7c857f]">
                  {subtitle}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                onClick={openSystem}
                className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#0b3d2a]/14 bg-[#fbfaf6] px-4 text-sm font-semibold text-[#25302a] transition hover:border-[#0f5a3d]"
              >
                <span className="text-[#0f5a3d]">⚙</span>
                <span className="hidden sm:inline">Workspace System</span>
              </button>
              <Link
                href={`/?workspaceId=${workspace.id}`}
                className="flex h-[42px] items-center gap-2 rounded-[10px] bg-[#0f5a3d] px-[18px] text-sm font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a]"
              >
                <span className="text-base">+</span> Chat baru
              </Link>
            </div>
          </div>

          {/* SYSTEM PREVIEW */}
          <button
            type="button"
            onClick={openSystem}
            className="relative mb-8 mt-6 block w-full overflow-hidden rounded-[14px] bg-[#0b3d2a] px-[22px] py-5 text-left text-[#e4e0d2]"
          >
            <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#c7a560]">
              Workspace System · berlaku untuk semua chat di sini
            </div>
            {instructions ? (
              <div className="max-w-[640px] font-serif text-[17px] italic leading-normal text-[#f0ecdf]">
                &ldquo;{instructions}&rdquo;
              </div>
            ) : (
              <div className="max-w-[640px] font-serif text-[17px] italic leading-normal text-[#f0ecdf]/70">
                Belum ada instruksi permanen. Tambahkan panduan yang berlaku ke
                seluruh chat di workspace ini.
              </div>
            )}
            <div className="mt-3 text-[13px] text-[#9fb3a5]">
              Klik untuk mengedit →
            </div>
          </button>

          {/* CHAT LIST */}
          <div className="mb-3.5 flex items-center justify-between">
            <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#7c857f]">
              Percakapan
            </span>
            <div className="flex gap-1 rounded-[9px] bg-[#ece9df] p-[3px]">
              <button
                type="button"
                onClick={() => setFilter("recent")}
                className={
                  filter === "recent"
                    ? "rounded-[7px] bg-[#fbfaf6] px-3 py-[5px] text-[12.5px] font-semibold text-[#0f5a3d]"
                    : "rounded-[7px] px-3 py-[5px] text-[12.5px] font-medium text-[#7c857f]"
                }
              >
                Terbaru
              </button>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={
                  filter === "all"
                    ? "rounded-[7px] bg-[#fbfaf6] px-3 py-[5px] text-[12.5px] font-semibold text-[#0f5a3d]"
                    : "rounded-[7px] px-3 py-[5px] text-[12.5px] font-medium text-[#7c857f]"
                }
              >
                Semua
              </button>
            </div>
          </div>

          {hasError ? (
            <p className="rounded-[14px] bg-[#ffdad6] px-5 py-4 text-sm font-semibold text-[#93000a]">
              Daftar chat belum bisa dimuat. Coba muat ulang halaman.
            </p>
          ) : visibleChats.length === 0 ? (
            <div className="rounded-[14px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-6 py-10 text-center">
              <p className="text-sm leading-relaxed text-[#6b746e]">
                Belum ada chat di workspace ini.
              </p>
              <Link
                href={`/?workspaceId=${workspace.id}`}
                className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[#0f5a3d] px-4 py-2.5 text-sm font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a]"
              >
                <span className="text-base">+</span> Mulai chat baru
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {visibleChats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/?conversationId=${chat.id}`}
                  className="block rounded-[14px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-[22px] py-[19px] transition duration-150 hover:-translate-y-0.5 hover:border-[#0f5a3d]/35 hover:shadow-[0_14px_30px_-24px_rgba(11,61,42,0.7)]"
                >
                  <div className="mb-[7px] flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="truncate text-base font-semibold text-[#1b2721]">
                        {chat.title}
                      </span>
                      {chat.isPinned && (
                        <span className="shrink-0 rounded-full bg-[#e7c77e]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a6a1f]">
                          Pin
                        </span>
                      )}
                      {chat.skill && (
                        <span className="shrink-0 rounded-full bg-[#0f5a3d]/[0.09] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#0f5a3d] [font-family:ui-monospace,SFMono-Regular,monospace]">
                          {chat.skill}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[12.5px] text-[#9aa099]">
                      {formatRelativeTime(chat.updatedAt)}
                    </span>
                  </div>
                  {chat.preview && (
                    <div className="truncate text-sm leading-normal text-[#6b746e]">
                      {chat.preview}
                    </div>
                  )}
                  {chat.artifact && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#b08833]/10 px-2.5 py-1 text-xs text-[#b08833]">
                      <span aria-hidden="true">◧</span> {chat.artifact}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* WORKSPACE SYSTEM SLIDE-OVER */}
      {systemOpen && (
        <>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setSystemOpen(false)}
            className="fixed inset-0 z-[60] bg-[#0b1e16]/40 [animation:fade_.2s_ease]"
          />
          <div className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[480px] flex-col bg-[#f7f5ee] shadow-[-30px_0_60px_-30px_rgba(11,61,42,0.5)] [animation:slideIn_.28s_cubic-bezier(.22,.9,.3,1)]">
            <div className="flex items-start justify-between border-b border-[#0b3d2a]/10 px-[30px] py-6">
              <div>
                <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#b08833]">
                  Instruksi permanen
                </div>
                <h2 className="font-serif text-[26px] font-normal text-[#12211b]">
                  Workspace System
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSystemOpen(false)}
                className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-[#0b3d2a]/14 bg-[#fbfaf6] text-base text-[#5d6862]"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="scroll flex-1 overflow-y-auto px-[30px] py-6">
              <p className="mb-4 text-sm leading-relaxed text-[#5d6862]">
                Instruksi ini digabungkan ke setiap chat di workspace ini,
                bersama skill aktif dan riwayat chat itu sendiri.
              </p>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Tulis instruksi permanen untuk workspace ini…"
                className="h-[220px] w-full resize-none rounded-[12px] border border-[#0b3d2a]/16 bg-[#fbfaf6] px-[18px] py-4 font-serif text-base leading-relaxed text-[#25302a] outline-none transition focus:border-[#0f5a3d]"
              />
              {saveError && (
                <p className="mt-3 text-sm font-semibold text-[#ba1a1a]">
                  {saveError}
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-[#0b3d2a]/10 px-[30px] py-5">
              <button
                type="button"
                onClick={saveSystem}
                disabled={isSaving}
                className="h-[46px] flex-1 rounded-[11px] bg-[#0f5a3d] text-[14.5px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Menyimpan…" : "Simpan instruksi"}
              </button>
              <button
                type="button"
                onClick={() => setSystemOpen(false)}
                className="h-[46px] rounded-[11px] border border-[#0b3d2a]/16 bg-transparent px-5 text-[14.5px] font-semibold text-[#25302a]"
              >
                Batal
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
