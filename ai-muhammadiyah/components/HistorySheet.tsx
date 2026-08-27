"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Icon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import type { groupConversationsByWorkspace } from "@/lib/mappers/conversation";
import type { Conversation, Workspace } from "@/lib/mappers/types";

// Sheet riwayat khusus mobile — pengganti MobileToolbar.
//
// MobileToolbar lama menumpuk lima baris kontrol (cari, pilih workspace, chip
// percakapan, pin/export/share, tombol lampiran) di ATAS percakapan: sekitar
// 280px chrome sebelum isi halaman muncul. Semuanya dipindahkan ke sini dan
// dibuka dari satu tombol di header, sehingga layar chat berangkat dari sapaan
// dan kotak tulis — bukan dari deretan kontrol.
//
// Kontrol lampiran TIDAK ikut pindah: ia sudah ada di composer (tombol "+"),
// yang selalu tampil di mobile lewat ChatArea maupun Composer varian aktif.

interface HistorySheetProps {
  isOpen: boolean;
  onClose: () => void;

  chatSearch: string;
  setChatSearch: Dispatch<SetStateAction<string>>;

  // Chip workspace = tujuan obrolan BARU (persis fungsi <select> lama di
  // MobileToolbar). Daftar percakapannya sendiri sudah dikelompokkan per
  // workspace oleh groupConversationsByWorkspace, jadi tidak perlu difilter.
  workspaces: Workspace[];
  selectedWorkspaceId: string;
  setSelectedWorkspaceId: Dispatch<SetStateAction<string>>;

  isLoadingConversations: boolean;
  historyError: string;
  conversationGroups: ReturnType<typeof groupConversationsByWorkspace>;
  activeConversationId: string;
  loadConversation: (conversation: Conversation) => Promise<void>;
  toggleConversationPin: (conversation: Conversation) => Promise<void>;
  deleteConversation: (
    conversationId: string,
    resetMemory?: () => void,
  ) => Promise<void>;
  resetMemory: () => void;
}

export default function HistorySheet({
  isOpen,
  onClose,
  chatSearch,
  setChatSearch,
  workspaces,
  selectedWorkspaceId,
  setSelectedWorkspaceId,
  isLoadingConversations,
  historyError,
  conversationGroups,
  activeConversationId,
  loadConversation,
  toggleConversationPin,
  deleteConversation,
  resetMemory,
}: HistorySheetProps) {
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const workspaceOptions: { id: string; name: string }[] = [
    { id: "", name: "General" },
    ...workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)] md:hidden">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 pl-5 pr-2">
        <span className="text-[17px] font-semibold tracking-tight text-[var(--ink)]">
          Riwayat
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup riwayat"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)]"
        >
          <Icon name="close" className="h-[21px] w-[21px]" />
        </button>
      </div>

      <div className="shrink-0 px-5 pt-1">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-3)]">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </span>
          <input
            value={chatSearch}
            onChange={(event) => setChatSearch(event.target.value)}
            placeholder="Cari obrolan"
            className="h-12 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] pl-11 pr-4 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted-3)] focus:border-[var(--brand)]"
          />
        </div>

        <p className="mt-4 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-3)]">
          Obrolan baru masuk ke
        </p>
        <div className="scroll -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
          {workspaceOptions.map((option) => {
            const isSelected = selectedWorkspaceId === option.id;

            return (
              <button
                key={option.id || "general"}
                type="button"
                onClick={() => setSelectedWorkspaceId(option.id)}
                className={
                  isSelected
                    ? "flex h-11 shrink-0 items-center rounded-full bg-[var(--brand)] px-4 text-[13.5px] font-semibold text-[var(--on-brand)]"
                    : "flex h-11 shrink-0 items-center rounded-full border border-[var(--hairline)] px-4 text-[13.5px] font-medium text-[var(--ink-soft)]"
                }
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scroll flex-1 overflow-y-auto px-3 pt-5">
        {isLoadingConversations && (
          <p className="px-2 text-[14px] text-[var(--muted-2)]">
            Memuat riwayat...
          </p>
        )}

        {historyError && (
          <p className="mx-2 mb-4 rounded-xl bg-[var(--danger-bg)] p-3 text-[13px] text-[var(--danger-ink)]">
            {historyError}
          </p>
        )}

        {!isLoadingConversations && conversationGroups.length === 0 && (
          <p className="px-2 text-[14px] text-[var(--muted-2)]">
            Belum ada riwayat obrolan.
          </p>
        )}

        {conversationGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <h2 className="px-2 pb-2 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-3)]">
              {group.label}
            </h2>

            <div className="space-y-px">
              {group.items.map((conversation) => {
                const isActive = conversation.id === activeConversationId;

                return (
                  <div
                    key={conversation.id}
                    className={
                      isActive
                        ? "relative rounded-xl border border-[var(--hairline)] bg-[var(--surface)]"
                        : "relative rounded-xl"
                    }
                  >
                    <div className="flex items-center gap-1 pl-3.5 pr-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await loadConversation(conversation);
                          onClose();
                        }}
                        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 py-3 text-left"
                      >
                        <span
                          className={
                            isActive
                              ? "w-full truncate text-[15px] font-medium text-[var(--ink)]"
                              : "w-full truncate text-[15px] text-[var(--ink-soft)]"
                          }
                        >
                          {conversation.title}
                        </span>
                        <span className="w-full truncate text-[12px] text-[var(--muted-3)]">
                          {formatRelativeTime(conversation.updatedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenKebabId((current) =>
                            current === conversation.id ? null : conversation.id,
                          )
                        }
                        aria-label="Opsi obrolan"
                        aria-expanded={openKebabId === conversation.id}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--muted-3)] transition hover:bg-[var(--surface-alt)]"
                      >
                        <Icon name="dots" className="h-[18px] w-[18px]" />
                      </button>
                    </div>

                    {openKebabId === conversation.id && (
                      <div className="absolute right-2 top-full z-10 mt-1 w-56 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-1.5 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            void toggleConversationPin(conversation);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] text-[var(--ink)] transition hover:bg-[var(--surface-alt)]"
                        >
                          <Icon
                            name="pin"
                            className="h-[18px] w-[18px] text-[var(--muted-2)]"
                          />
                          {conversation.isPinned ? "Lepas pin" : "Pin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void deleteConversation(conversation.id, resetMemory);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] text-[var(--danger)] transition hover:bg-[var(--danger-bg)]"
                        >
                          <Icon name="trash" className="h-[18px] w-[18px]" />
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 px-5 pb-6 pt-3">
        <button
          type="button"
          onClick={() => {
            resetMemory();
            onClose();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-4 text-[15px] font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Obrolan baru
        </button>
      </div>
    </div>
  );
}
