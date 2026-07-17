"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Honest research entry: this bar does NOT fabricate a synthesis. It starts a
// real chat with the question prefilled (SPA reads ?ask=), where the /riset
// skill can be applied. No fake findings/citations are shown anywhere.

export default function ResearchAskBar() {
  const router = useRouter();
  const [question, setQuestion] = useState("");

  function submit() {
    const text = question.trim();
    if (!text) {
      return;
    }
    router.push(`/?ask=${encodeURIComponent(text.slice(0, 2000))}`);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mb-8 flex items-center gap-3.5 rounded-[16px] border border-[#0b3d2a]/13 bg-[#fbfaf6] px-4 py-3.5 shadow-[0_10px_30px_-26px_rgba(11,61,42,0.6)] transition focus-within:border-[#0f5a3d]"
    >
      <span className="flex text-[#0f5a3d]" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <line x1="15.5" y1="15.5" x2="21" y2="21" />
        </svg>
      </span>
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ajukan pertanyaan riset — dijawab di chat dengan skill /riset…"
        className="min-w-0 flex-1 bg-transparent text-[15.5px] text-[#16211c] outline-none placeholder:text-[#9aa099]"
      />
      <span className="hidden shrink-0 rounded-full bg-[#0f5a3d]/[0.08] px-[11px] py-1.5 text-xs font-semibold text-[#0f5a3d] [font-family:ui-monospace,monospace] sm:inline">
        /riset
      </span>
      <button
        type="submit"
        disabled={!question.trim()}
        aria-label="Mulai riset di chat"
        className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-[#0f5a3d] text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        ↑
      </button>
    </form>
  );
}
