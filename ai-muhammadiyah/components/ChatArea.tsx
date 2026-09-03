"use client";

import { useState, useSyncExternalStore } from "react";
import type {
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
} from "react";
import AskUserQuestion from "@/components/AskUserQuestion";
import Composer, { CHAT_DISCLAIMER } from "@/components/Composer";
import { SparkIcon, Icon } from "@/components/icons";
import MarkdownMessage from "@/components/MarkdownMessage";
import NoteSuggestions from "@/components/NoteSuggestions";
import WebSources from "@/components/WebSources";
import { formatArtifactTextForDisplay } from "@/lib/artifacts";
import { formatAskTextForDisplay } from "@/lib/ask-user";
import { formatNoteTextForDisplay } from "@/lib/second-brain/parse";
import { formatSourcesTextForDisplay } from "@/lib/web-search";
import type { Message } from "@/lib/mappers/types";
import type { Skill } from "@/lib/skills";
import {
  modelCatalog,
  type EffortLevel,
  type ModelProviderId,
  type PlanModelId,
} from "@/lib/subscriptions/plans";
import type { UsageSnapshot } from "@/lib/usage/limits";

// Sapaan layar sambutan — diacak tiap kali layar sambutan muncul (chat baru /
// ganti chat). Campuran salam Islami dan sapaan netral supaya tetap terbuka
// untuk semua pengguna, bukan hanya warga Muhammadiyah.
const welcomeGreetings = [
  "Mau mulai dari mana hari ini?",
  "Apa yang sedang kamu kerjakan?",
  "Assalamu’alaikum, mau bahas apa hari ini?",
  "Ada yang ingin kamu pelajari hari ini?",
  "Tulis apa saja, M-Agent siap membantu.",
  "Apa yang ingin kamu selesaikan hari ini?",
  "Selamat datang kembali. Lanjut yang mana?",
  "Mari mulai — apa topiknya?",
  "Butuh bantuan apa hari ini?",
  "Ada pertanyaan? Mulai saja dari sini.",
];

// Sapaan acak hanya boleh diputuskan di client: kalau diacak saat render,
// HTML server dan client berbeda dan hidrasi gagal. useSyncExternalStore
// menangani ini secara resmi — server memakai getServerSnapshot (kosong,
// judul dirender transparan), client mengisi pilihan acaknya sesudah hidrasi.
function subscribeGreeting(onStoreChange: () => void) {
  // Satu notifikasi sesudah mount. Tanpa ini React bisa tetap memakai nilai
  // getServerSnapshot (string kosong = judul transparan) sampai ada render
  // lain — terbukti terjadi di halaman yang tidak pernah re-render.
  let cancelled = false;

  queueMicrotask(() => {
    if (!cancelled) {
      onStoreChange();
    }
  });

  return () => {
    cancelled = true;
  };
}

function getServerGreeting() {
  return "";
}

function WelcomeGreeting() {
  // Satu pilihan acak per mount (layar sambutan muncul lagi = sapaan baru).
  // getSnapshot wajib mengembalikan nilai yang sama tiap dipanggil, jadi hasil
  // undian di-cache di dalam closure.
  const [getGreeting] = useState(() => {
    let picked = "";

    return () => {
      if (!picked) {
        picked =
          welcomeGreetings[
            Math.floor(Math.random() * welcomeGreetings.length)
          ];
      }

      return picked;
    };
  });

  const greeting = useSyncExternalStore(
    subscribeGreeting,
    getGreeting,
    getServerGreeting,
  );

  return (
    <h2
      className={
        greeting
          ? "font-serif text-[33px] font-normal leading-[1.16] tracking-[-0.01em] text-[var(--ink-deep)] opacity-100 transition-opacity duration-300 sm:text-[40px]"
          : "font-serif text-[33px] font-normal leading-[1.16] tracking-[-0.01em] text-[var(--ink-deep)] opacity-0 transition-opacity duration-300 sm:text-[40px]"
      }
    >
      {/* Fallback dipakai hanya untuk menahan tinggi baris saat masih transparan. */}
      {greeting || welcomeGreetings[0]}
    </h2>
  );
}

const quickPrompts = [
  {
    icon: "book",
    title: "Ringkas tafsir",
    description: "Surat Al-Kahfi ayat 1-10",
  },
  {
    icon: "cap",
    title: "Bantu pelajaran",
    description: "Matematika kelas 9 SMP Muhammadiyah",
  },
  {
    icon: "idea",
    title: "Ide kegiatan",
    description: "Ramadan untuk remaja masjid",
  },
  {
    icon: "heart",
    title: "Doa harian",
    description: "Sebelum belajar & bekerja",
  },
];

interface ChatAreaProps {
  messages: Message[];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  sendMessage: (messageOverride?: string) => Promise<void>;
  isSending: boolean;
  isAwaitingFirstChunk: boolean;
  hasMessageQuota: boolean;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  setIsAttachMenuOpen: Dispatch<SetStateAction<boolean>>;
  renderAttachMenu: () => ReactNode;
  renderAttachmentChips: (extraClassName?: string) => ReactNode;
  setIsStudyModeMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsModelMenuOpen: Dispatch<SetStateAction<boolean>>;
  selectedSkill: Skill | null;
  selectedSkillBadge: string;

  // model + skill selection (forwarded to the welcome composer)
  selectedModel: PlanModelId;
  selectModel: (model: PlanModelId, keepMenuOpen?: boolean) => void;
  allowedModels: string[];
  selectedProvider: ModelProviderId;
  selectProvider: (model: PlanModelId, provider: ModelProviderId) => void;
  availableProviders: ModelProviderId[];
  selectedEngineLabel: string;
  isModelMenuOpen: boolean;
  modelOptions: PlanModelId[];
  selectedModelInfo: (typeof modelCatalog)[PlanModelId];
  isEffortMenuOpen: boolean;
  setIsEffortMenuOpen: Dispatch<SetStateAction<boolean>>;
  effort: EffortLevel;
  setEffort: (level: EffortLevel) => void;
  isThinkingEnabled: boolean;
  toggleThinking: () => void;
  skills: Skill[];
  skillsLoading: boolean;
  selectedSkillId: string | null;
  selectSkill: (skillId: string) => void;
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>;
  usageSnapshot: UsageSnapshot | null;
  isStudyModeMenuOpen: boolean;
  messageSkillOverrideId: string | null;
  setMessageSkillOverrideId: Dispatch<SetStateAction<string | null>>;

  // Otak Kedua: dipakai untuk mencatat asal usulan catatan yang disimpan.
  activeConversationId: string | null;
  activeWorkspaceId: string | null;
}

export default function ChatArea({
  messages,
  input,
  setInput,
  sendMessage,
  isSending,
  isAwaitingFirstChunk,
  hasMessageQuota,
  messagesEndRef,
  setIsAttachMenuOpen,
  renderAttachMenu,
  renderAttachmentChips,
  setIsStudyModeMenuOpen,
  setIsModelMenuOpen,
  selectedSkill,
  selectedSkillBadge,
  selectedModel,
  selectModel,
  allowedModels,
  selectedProvider,
  selectProvider,
  availableProviders,
  selectedEngineLabel,
  isModelMenuOpen,
  modelOptions,
  selectedModelInfo,
  isEffortMenuOpen,
  setIsEffortMenuOpen,
  effort,
  setEffort,
  isThinkingEnabled,
  toggleThinking,
  skills,
  skillsLoading,
  selectedSkillId,
  selectSkill,
  setSelectedSkillId,
  usageSnapshot,
  isStudyModeMenuOpen,
  messageSkillOverrideId,
  setMessageSkillOverrideId,
  activeConversationId,
  activeWorkspaceId,
}: ChatAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-9">
      {/* Layar sambutan — Design premium Langkah 53: rata kiri, satu tujuan
          (kotak tulis), dan contoh pertanyaan turun jadi baris ramping supaya
          tidak bersaing dengan composer.

          justify-start, bukan justify-center: begitu isinya lebih tinggi dari
          kontainer (hampir selalu di HP), flex yang di-center meluber ke DUA
          arah dan bagian atasnya tidak bisa dijangkau dengan scroll. Padding
          atas yang lebih lega juga menurunkan posisi kotak tulis, sehingga menu
          model punya ruang dan layar tidak terasa mepet ke header. */}
      {messages.length <= 1 && (
        <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-start gap-6 pb-4 pt-8 sm:pt-10 md:pt-12">
          <div className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-[var(--brand)] text-[var(--on-brand)]">
            <SparkIcon className="h-6 w-6" />
          </div>

          <section>
            <WelcomeGreeting key={activeConversationId} />
            <p className="mt-3.5 max-w-[420px] text-[15px] leading-relaxed text-[var(--muted-2)]">
              Belajar, meneliti, dan berkarya — berpijak pada Muhammadiyah
              Knowledge Base dan nilai Islam berkemajuan.
            </p>
          </section>

          <Composer
            variant="welcome"
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            isSending={isSending}
            hasMessageQuota={hasMessageQuota}
            setIsAttachMenuOpen={setIsAttachMenuOpen}
            renderAttachMenu={renderAttachMenu}
            renderAttachmentChips={renderAttachmentChips}
            setIsStudyModeMenuOpen={setIsStudyModeMenuOpen}
            setIsModelMenuOpen={setIsModelMenuOpen}
            selectedSkill={selectedSkill}
            selectedSkillBadge={selectedSkillBadge}
            selectedModel={selectedModel}
            selectModel={selectModel}
            allowedModels={allowedModels}
            selectedProvider={selectedProvider}
            selectProvider={selectProvider}
            availableProviders={availableProviders}
            selectedEngineLabel={selectedEngineLabel}
            isModelMenuOpen={isModelMenuOpen}
            modelOptions={modelOptions}
            selectedModelInfo={selectedModelInfo}
            isEffortMenuOpen={isEffortMenuOpen}
            setIsEffortMenuOpen={setIsEffortMenuOpen}
            effort={effort}
            setEffort={setEffort}
            isThinkingEnabled={isThinkingEnabled}
            toggleThinking={toggleThinking}
            skills={skills}
            skillsLoading={skillsLoading}
            selectedSkillId={selectedSkillId}
            selectSkill={selectSkill}
            setSelectedSkillId={setSelectedSkillId}
            usageSnapshot={usageSnapshot}
            isStudyModeMenuOpen={isStudyModeMenuOpen}
            messageSkillOverrideId={messageSkillOverrideId}
            setMessageSkillOverrideId={setMessageSkillOverrideId}
          />

          <div className="w-full">
            <p className="mb-2 text-[12.5px] font-medium text-[var(--muted-3)]">
              Coba mulai dari
            </p>
            <div className="grid w-full gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.title}
                  type="button"
                  onClick={() => setInput(prompt.title)}
                  className="flex min-h-[56px] items-center gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-3.5 py-2 text-left transition hover:bg-[var(--surface-alt)]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Icon name={prompt.icon} className="h-[17px] w-[17px]" />
                  </span>
                  <span className="min-w-0 flex-1 text-[14.5px] leading-snug text-[var(--ink-soft)]">
                    {prompt.title}
                    <span className="text-[var(--muted-3)]">
                      {" · "}
                      {prompt.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-[var(--muted-3)]">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-[15px] w-[15px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11.5px] leading-relaxed text-[var(--muted-3)]">
            {CHAT_DISCLAIMER}
          </p>
        </div>
      )}

      {messages.length > 1 && (
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end space-y-4">
          {messages.map((message, index) => {
            // Pesan AI yang sedang di-stream: spark di header berdenyut dan
            // tiap blok teks baru fade-in (gaya Claude, tanpa caret).
            const isStreamingMessage =
              isSending &&
              !isAwaitingFirstChunk &&
              message.role === "ai" &&
              index === messages.length - 1;

            return message.role === "ai" && !message.text ? null : message.role ===
              "user" ? (
              <div
                key={index}
                className="flex flex-col items-end gap-1 animate-[messageIn_0.25s_ease-out]"
              >
                <div className="max-w-[85%] whitespace-pre-wrap rounded-[16px] rounded-br-[4px] bg-[var(--brand)] px-[17px] py-[13px] text-sm leading-relaxed text-[var(--on-brand)] sm:max-w-xl sm:text-[15px]">
                  {message.text}
                </div>
              </div>
            ) : (
              <div
                key={index}
                className="animate-[messageIn_0.25s_ease-out]"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] bg-[var(--brand)] text-[var(--on-brand)]">
                    <SparkIcon
                      className={
                        isStreamingMessage
                          ? "h-4 w-4 animate-[sparkPulse_1.4s_ease-in-out_infinite]"
                          : "h-4 w-4"
                      }
                    />
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--muted-2)]">
                    M-Agent
                  </span>
                </div>
                <div
                  className={`min-w-0 space-y-4 text-[15px] leading-[1.72] text-[var(--ink-soft)] sm:text-[15.5px]${
                    isStreamingMessage ? " ai-stream-in" : ""
                  }`}
                >
                  {/* Rows store raw artifact + note + sources + ask markers;
                      strip them at render time (works mid-stream too). Note
                      and ask blocks are removed entirely — isinya sudah tampil
                      di chip usulan / kartu pertanyaan. Sources marker is
                      appended by the server AFTER the model's own text
                      (lib/web-search.ts), so it only ever completes once
                      streaming is done. */}
                  <MarkdownMessage
                    text={formatAskTextForDisplay(
                      formatSourcesTextForDisplay(
                        formatNoteTextForDisplay(
                          formatArtifactTextForDisplay(message.text),
                        ),
                      ),
                    )}
                  />
                  {/* Usulan catatan, chip sumber web & kartu pertanyaan hanya
                      setelah streaming selesai, supaya tidak pernah menyela
                      pengguna yang sedang membaca (dan markernya baru lengkap
                      saat itu). */}
                  {!isStreamingMessage && (
                    <>
                      <AskUserQuestion
                        messageText={message.text}
                        isLatest={index === messages.length - 1}
                        disabled={isSending || !hasMessageQuota}
                        onAnswer={(answer) => {
                          void sendMessage(answer);
                        }}
                      />
                      <WebSources messageText={message.text} />
                      <NoteSuggestions
                        messageText={message.text}
                        conversationId={activeConversationId}
                        workspaceId={activeWorkspaceId}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {isSending && isAwaitingFirstChunk && (
            <div className="animate-[messageIn_0.25s_ease-out]">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] bg-[var(--brand)] text-[var(--on-brand)]">
                  <SparkIcon className="h-4 w-4 animate-[sparkPulse_1.4s_ease-in-out_infinite]" />
                </span>
                <span className="text-[13px] font-semibold text-[var(--muted-2)]">
                  M-Agent
                </span>
              </div>
              {/* Spark berdenyut di area jawaban (gaya Claude), tanpa kotak
                  "Sedang menjawab…" — label tetap ada untuk screen reader. */}
              <SparkIcon
                aria-hidden
                className="h-6 w-6 text-[var(--brand)] animate-[sparkPulse_1.4s_ease-in-out_infinite]"
              />
              <span className="sr-only" role="status">
                Sedang menjawab…
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
