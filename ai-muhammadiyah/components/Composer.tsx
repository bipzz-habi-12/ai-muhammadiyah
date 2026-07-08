"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Icon } from "@/components/icons";
import type { Skill } from "@/lib/skills";

interface ComposerProps {
  variant: "welcome" | "active";
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  sendMessage: () => Promise<void>;
  isSending: boolean;
  hasMessageQuota: boolean;
  setIsAttachMenuOpen: Dispatch<SetStateAction<boolean>>;
  renderAttachMenu: () => ReactNode;
  renderAttachmentChips: (extraClassName?: string) => ReactNode;
  setIsStudyModeMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsModelMenuOpen: Dispatch<SetStateAction<boolean>>;
  selectedSkill: Skill | null;
  selectedSkillBadge: string;
}

export default function Composer({
  variant,
  input,
  setInput,
  sendMessage,
  isSending,
  hasMessageQuota,
  setIsAttachMenuOpen,
  renderAttachMenu,
  renderAttachmentChips,
  setIsStudyModeMenuOpen,
  setIsModelMenuOpen,
  selectedSkill,
  selectedSkillBadge,
}: ComposerProps) {
  if (variant === "welcome") {
    return (
      <div className="w-full rounded-[34px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] ring-1 ring-[#bec9be]">
        {renderAttachmentChips("mb-3")}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder="Tanyakan apa saja kepada AI-mu..."
          disabled={isSending}
          className="h-20 w-full bg-transparent text-xl text-[#191c1d] outline-none placeholder:text-[#6f7a70]"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[#3f4940]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
              className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#edeeef]"
            >
              <span aria-hidden="true" className="text-2xl">⌘</span>
              Lampirkan
            </button>
            {renderAttachMenu()}
          </div>

          <button
            type="button"
            onClick={() => setIsStudyModeMenuOpen(true)}
            className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#edeeef]"
          >
            <Icon name="book" className="h-6 w-6" />
            {selectedSkill ? selectedSkill.name : "Memuat..."}
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#edeeef]"
          >
            <Icon name="idea" className="h-5 w-5" />
            Ide
          </button>

          <button
            type="button"
            aria-label="Input suara"
            title="Input suara"
            className="ml-auto grid h-11 w-11 place-items-center rounded-full transition hover:bg-[#edeeef]"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
              <path d="M19 11a7 7 0 0 1-14 0" />
              <path d="M12 18v4" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={isSending || !input.trim() || !hasMessageQuota}
            aria-label="Kirim pesan"
            title="Kirim pesan"
            className="grid h-14 w-14 place-items-center rounded-full bg-[#004d27] text-white transition hover:bg-[#006837] disabled:cursor-not-allowed disabled:bg-[#004d27]/40"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="m22 2-7 20-4-9-9-4 20-7Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#bec9be] bg-white p-3 sm:p-4">
      {renderAttachmentChips("mb-2")}
      <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-[#bec9be] focus-within:ring-[#004d27] sm:gap-3 sm:px-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#3f4940] transition hover:bg-[#edeeef]"
            title="Add photos & files"
            aria-label="Add photos & files"
          >
            <span aria-hidden="true" className="text-2xl leading-none">+</span>
          </button>
          {renderAttachMenu()}
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder="Tanyakan apa saja kepada AI-mu..."
          disabled={isSending}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#191c1d] outline-none placeholder:text-[#6f7a70] sm:text-base"
        />

        <button
          type="button"
          onClick={() => {
            setIsModelMenuOpen(false);
            setIsStudyModeMenuOpen((isOpen) => !isOpen);
          }}
          className="hidden shrink-0 items-center gap-2 rounded-full bg-[#004d27]/10 px-3 py-2 text-xs font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#004d27]/15 sm:inline-flex"
        >
          {selectedSkill ? selectedSkill.name : "Memuat..."}
          <span className="text-[10px] text-[#3f4940]">
            {selectedSkillBadge}
          </span>
        </button>

        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={isSending || !input.trim() || !hasMessageQuota}
          aria-label="Kirim pesan"
          title="Kirim pesan"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#004d27] text-white transition hover:bg-[#006837] disabled:cursor-not-allowed disabled:bg-[#004d27]/40"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="m22 2-7 20-4-9-9-4 20-7Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
