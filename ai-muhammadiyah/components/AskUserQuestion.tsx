"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import {
  askSkipMessage,
  buildAskAnswerMessage,
  parseAskQuestions,
  type AskQuestion,
} from "@/lib/ask-user";

// Kartu "AI bertanya balik" — pasangan UI dari blok [[AI_MU_ASK]]
// (lib/ask-user.ts), meniru AskUserQuestion di Claude.
//
// Aturan yang menentukan bentuknya:
//   * Hanya dirender setelah streaming pesan SELESAI (dijaga pemanggil di
//     ChatArea lewat `isStreamingMessage`) — sama seperti NoteSuggestions dan
//     WebSources. Marker baru lengkap di akhir, dan kartu setengah jadi yang
//     melompat-lompat saat sedang dibaca lebih buruk daripada muncul telat
//     sedikit.
//   * Bukan modal dan bukan penghalang. Pengguna tetap bisa mengabaikan kartu
//     ini dan mengetik apa pun di komposer seperti biasa — kartu hanya jalan
//     pintas, bukan gerbang.
//   * Pertanyaan pada pesan yang BUKAN pesan terakhir dirender mati (mode
//     riwayat), karena jawabannya sudah ada sebagai pesan berikutnya di
//     percakapan. Tanpa ini, membuka chat lama akan menampilkan tombol yang —
//     kalau ditekan — menjawab pertanyaan yang sudah lama terjawab.

interface AskUserQuestionProps {
  messageText: string;
  /** Pesan AI terakhir di percakapan — hanya ini yang masih bisa dijawab. */
  isLatest: boolean;
  /** Mati saat pesan lain sedang dikirim atau kuota pesan habis. */
  disabled: boolean;
  onAnswer: (message: string) => void;
}

function isPicked(selection: string[], label: string) {
  return selection.includes(label);
}

export default function AskUserQuestion({
  messageText,
  isLatest,
  disabled,
  onAnswer,
}: AskUserQuestionProps) {
  const questions = useMemo(
    () => parseAskQuestions(messageText),
    [messageText],
  );
  const [selections, setSelections] = useState<Record<number, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!questions.length) {
    return null;
  }

  const isHistory = !isLatest || isSubmitted;

  const toggleOption = (
    questionIndex: number,
    question: AskQuestion,
    label: string,
  ) => {
    setSelections((previous) => {
      const current = previous[questionIndex] ?? [];

      if (!question.multiSelect) {
        // Menekan ulang pilihan yang sama membatalkannya, supaya pengguna yang
        // salah tekan tidak terkunci pada jawaban yang tidak ia maksud.
        return {
          ...previous,
          [questionIndex]: isPicked(current, label) ? [] : [label],
        };
      }

      return {
        ...previous,
        [questionIndex]: isPicked(current, label)
          ? current.filter((item) => item !== label)
          : [...current, label],
      };
    });
  };

  const answersPerQuestion = questions.map((_question, index) => {
    const custom = (customAnswers[index] ?? "").trim();
    const picked = selections[index] ?? [];

    return custom ? [...picked, custom] : picked;
  });
  const answeredCount = answersPerQuestion.filter(
    (answers) => answers.length > 0,
  ).length;
  const canSubmit =
    !disabled && !isHistory && answeredCount === questions.length;

  const submit = () => {
    const message = buildAskAnswerMessage(questions, answersPerQuestion);

    if (!message) {
      return;
    }

    setIsSubmitted(true);
    onAnswer(message);
  };

  const skip = () => {
    setIsSubmitted(true);
    onAnswer(askSkipMessage);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--hairline)] bg-[var(--surface-panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-3.5 py-2.5">
        <Icon
          name="question"
          className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]"
        />
        <p className="min-w-0 flex-1 text-[12.5px] font-medium text-[var(--ink-soft)]">
          {isHistory
            ? "M-Agent menanyakan ini"
            : questions.length > 1
              ? `M-Agent perlu ${questions.length} keputusan darimu`
              : "M-Agent perlu satu keputusan darimu"}
        </p>
      </div>

      <div className="space-y-4 px-3.5 py-3">
        {questions.map((question, questionIndex) => {
          const selection = selections[questionIndex] ?? [];

          return (
            <div key={`${question.question}-${questionIndex}`}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {question.header && (
                  <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--brand)]">
                    {question.header}
                  </span>
                )}
                <p className="min-w-0 text-[13.5px] font-medium leading-snug text-[var(--ink)]">
                  {question.question}
                </p>
              </div>

              {question.multiSelect && !isHistory && (
                <p className="mt-1 text-[11.5px] text-[var(--muted-3)]">
                  Boleh pilih lebih dari satu.
                </p>
              )}

              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {question.options.map((option) => {
                  const picked = isPicked(selection, option.label);

                  return (
                    <button
                      key={option.label}
                      type="button"
                      disabled={isHistory || disabled}
                      aria-pressed={picked}
                      onClick={() =>
                        toggleOption(questionIndex, question, option.label)
                      }
                      className={`rounded-[9px] border px-3 py-2 text-left transition-colors disabled:cursor-default ${
                        picked
                          ? "border-[var(--brand)] bg-[var(--brand)]/[0.07]"
                          : "border-[var(--hairline)] bg-[var(--surface)] enabled:hover:border-[var(--brand)]/40 enabled:hover:bg-[var(--background)]"
                      }`}
                    >
                      <span className="flex items-start gap-1.5">
                        {picked && (
                          <Icon
                            name="check"
                            className="mt-[3px] h-3 w-3 shrink-0 text-[var(--brand)]"
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-[var(--ink)]">
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="mt-0.5 block text-[11.5px] leading-[1.45] text-[var(--muted)]">
                              {option.description}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Jalan keluar wajib: pilihan buatan model belum tentu memuat
                  yang pengguna maksud, dan memaksa memilih salah satunya
                  membuat jawaban jadi tidak jujur. */}
              {!isHistory && (
                <input
                  type="text"
                  value={customAnswers[questionIndex] ?? ""}
                  onChange={(event) =>
                    setCustomAnswers((previous) => ({
                      ...previous,
                      [questionIndex]: event.target.value,
                    }))
                  }
                  disabled={disabled}
                  placeholder="Atau tulis jawabanmu sendiri…"
                  aria-label={`Jawaban lain untuk: ${question.question}`}
                  className="mt-1.5 w-full rounded-[9px] border border-[var(--hairline)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--muted-3)] focus:border-[var(--brand)]/50"
                />
              )}
            </div>
          );
        })}
      </div>

      {!isHistory && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--hairline)] px-3.5 py-2.5">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-[8px] bg-[var(--brand)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--on-brand)] transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
          >
            Kirim jawaban
          </button>
          <button
            type="button"
            onClick={skip}
            disabled={disabled}
            className="rounded-[8px] border border-[var(--hairline)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink-soft)] disabled:cursor-default disabled:opacity-40"
          >
            Tentukan saja untukku
          </button>
          {answeredCount < questions.length && (
            <span className="text-[11.5px] text-[var(--muted-3)]">
              {questions.length - answeredCount} pertanyaan belum dijawab
            </span>
          )}
        </div>
      )}
    </div>
  );
}
