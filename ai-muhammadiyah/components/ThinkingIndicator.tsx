"use client";

import { useEffect, useState } from "react";

const stages = [
  "Memahami pertanyaan",
  "Menyusun kerangka",
  "Menyiapkan jawaban",
];

export default function ThinkingIndicator() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStage((current) => Math.min(current + 1, stages.length - 1));
    }, 1800);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center gap-2.5"
      role="status"
      aria-live="polite"
    >
      <span className="thinking-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="text-[14.5px] font-medium text-[var(--ink-soft)]">
        {stages[stage]}
      </span>
    </div>
  );
}
