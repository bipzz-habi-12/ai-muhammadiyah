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
    }, 1600);

    return () => window.clearInterval(id);
  }, []);

  const progressPct = Math.min(((stage + 1) / (stages.length + 0.4)) * 100, 88);

  return (
    <div className="max-w-[260px]" role="status" aria-live="polite">
      <p className="flex items-baseline text-[14px] leading-none text-[var(--muted-2)]">
        <span>{stages[stage]}</span>
        <span className="thinking-dots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
      <div className="thinking-progress mt-2.5" aria-hidden="true">
        <span
          className="thinking-progress-fill"
          style={{ transform: `scaleX(${progressPct / 100})` }}
        />
      </div>
    </div>
  );
}
