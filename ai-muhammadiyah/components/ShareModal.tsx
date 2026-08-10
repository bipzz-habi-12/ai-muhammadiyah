"use client";

import type { Dispatch, SetStateAction } from "react";

interface ShareModalProps {
  sharePreview: string;
  setSharePreview: Dispatch<SetStateAction<string>>;
}

export default function ShareModal({
  sharePreview,
  setSharePreview,
}: ShareModalProps) {
  if (!sharePreview) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[var(--scrim)]/40 px-3 py-4 sm:items-center sm:justify-center">
      <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-[24px] bg-[var(--surface-panel)] shadow-2xl ring-1 ring-[var(--brand-deep-line)]/10">
        <div className="flex items-center justify-between border-b border-[var(--brand-deep-line)]/10 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-[var(--brand)]">Share preview</p>
            <h2 className="font-serif text-[22px] font-normal text-[var(--ink-deep)]">
              Local chat preview
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSharePreview("")}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface)] text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-border)]"
            aria-label="Tutup preview"
            title="Tutup preview"
          >
            x
          </button>
        </div>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-[var(--ink)]">
          {sharePreview}
        </pre>
      </div>
    </div>
  );
}
