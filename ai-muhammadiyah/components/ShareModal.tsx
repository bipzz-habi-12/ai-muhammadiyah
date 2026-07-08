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
    <div className="fixed inset-0 z-50 flex items-end bg-[#04140b]/35 px-3 py-4 sm:items-center sm:justify-center">
      <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-[28px] bg-[#f7fbf8] shadow-2xl ring-1 ring-[#d8eadf]">
        <div className="flex items-center justify-between border-b border-[#d9e9df] px-5 py-4">
          <div>
            <p className="text-sm font-bold text-[#008d54]">Share preview</p>
            <h2 className="text-xl font-bold text-[#05150d]">
              Local chat preview
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSharePreview("")}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#4f665c] ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1]"
            aria-label="Tutup preview"
            title="Tutup preview"
          >
            x
          </button>
        </div>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-[#18392e]">
          {sharePreview}
        </pre>
      </div>
    </div>
  );
}
