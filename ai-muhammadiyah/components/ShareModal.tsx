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
    <div className="fixed inset-0 z-50 flex items-end bg-[#16211c]/40 px-3 py-4 sm:items-center sm:justify-center">
      <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-[24px] bg-[#f7f5ee] shadow-2xl ring-1 ring-[#0b3d2a]/10">
        <div className="flex items-center justify-between border-b border-[#0b3d2a]/10 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-[#0f5a3d]">Share preview</p>
            <h2 className="font-serif text-[22px] font-normal text-[#12211b]">
              Local chat preview
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSharePreview("")}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf6] text-[#5d6862] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#ece9df]"
            aria-label="Tutup preview"
            title="Tutup preview"
          >
            x
          </button>
        </div>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-[#16211c]">
          {sharePreview}
        </pre>
      </div>
    </div>
  );
}
