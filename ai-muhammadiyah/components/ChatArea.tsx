"use client";

import type {
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
} from "react";
import Composer from "@/components/Composer";
import { SparkIcon, Icon } from "@/components/icons";
import MarkdownMessage from "@/components/MarkdownMessage";
import type { Message } from "@/lib/mappers/types";
import type { Skill } from "@/lib/skills";

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
  sendMessage: () => Promise<void>;
  isSending: boolean;
  isAwaitingFirstChunk: boolean;
  hasMessageQuota: boolean;
  continueAnswer: () => void;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  setIsAttachMenuOpen: Dispatch<SetStateAction<boolean>>;
  renderAttachMenu: () => ReactNode;
  renderAttachmentChips: (extraClassName?: string) => ReactNode;
  setIsStudyModeMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsModelMenuOpen: Dispatch<SetStateAction<boolean>>;
  selectedSkill: Skill | null;
  selectedSkillBadge: string;
}

export default function ChatArea({
  messages,
  input,
  setInput,
  sendMessage,
  isSending,
  isAwaitingFirstChunk,
  hasMessageQuota,
  continueAnswer,
  messagesEndRef,
  setIsAttachMenuOpen,
  renderAttachMenu,
  renderAttachmentChips,
  setIsStudyModeMenuOpen,
  setIsModelMenuOpen,
  selectedSkill,
  selectedSkillBadge,
}: ChatAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-9">
      {messages.length <= 1 && (
        <div className="mx-auto flex min-h-full w-full max-w-[746px] flex-col items-center justify-center gap-8 pb-3 pt-1 md:justify-start">
          <div className="grid h-[84px] w-[84px] place-items-center rounded-[34px] bg-[#009252] text-white shadow-2xl shadow-emerald-900/10">
            <SparkIcon className="h-12 w-12" />
          </div>

          <section className="text-center">
            <h2 className="text-4xl font-bold leading-tight tracking-normal text-[#05150d] sm:text-5xl">
              Assalamu&apos;alaikum, ada yang bisa AI-mu bantu?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#4a6258] sm:text-xl">
              Asisten cerdas Muhammadiyah, ditenagai{" "}
              <strong className="text-[#05150d]">ChatGPT 5.5</strong> &{" "}
              <strong className="text-[#05150d]">Gemini 3.1 Pro.</strong>
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
          />

          <div className="grid w-full gap-3 sm:grid-cols-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.title}
                type="button"
                onClick={() => setInput(prompt.title)}
                className="flex min-h-[104px] items-center gap-5 rounded-[30px] bg-white px-6 text-left ring-1 ring-[#d3e8dc] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(27,77,50,0.08)]"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#c9f7dc] text-[#008d54]">
                  <Icon name={prompt.icon} className="h-7 w-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold text-[#05150d]">
                    {prompt.title}
                  </span>
                  <span className="mt-1 block text-base leading-snug text-[#38534a]">
                    {prompt.description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="max-w-2xl text-center text-base leading-relaxed text-[#4f665c]">
            AI-mu dapat keliru. Selalu verifikasi informasi penting, terutama
            dalam urusan ibadah & syariah.
          </p>
        </div>
      )}

      {messages.length > 1 && (
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end space-y-4">
          {messages.map((message, index) =>
            message.role === "ai" && !message.text ? null : (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "flex justify-end animate-[messageIn_0.25s_ease-out]"
                    : "flex justify-start animate-[messageIn_0.25s_ease-out]"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-[24px] rounded-br-md bg-[#009252] px-5 py-3 text-sm leading-relaxed text-white shadow-lg shadow-emerald-900/15 sm:max-w-xl sm:text-base"
                      : "max-w-[85%] rounded-[24px] rounded-bl-md bg-white px-5 py-3 text-sm leading-relaxed text-[#18392e] shadow-sm ring-1 ring-[#d3e8dc] sm:max-w-2xl sm:text-base"
                  }
                >
                  {message.role === "ai" ? (
                    <>
                      <MarkdownMessage text={message.text} />
                      {message.continuationSuggested && !isSending && (
                        <button
                          type="button"
                          onClick={continueAnswer}
                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#eef8f1] px-4 py-2 text-sm font-bold text-[#008d54] ring-1 ring-[#d8eadf] transition hover:bg-white"
                        >
                          Lanjutkan jawaban
                        </button>
                      )}
                    </>
                  ) : (
                    message.text
                  )}
                </div>
              </div>
            ),
          )}

          {isSending && isAwaitingFirstChunk && (
            <div className="flex justify-start animate-[messageIn_0.25s_ease-out]">
              <div className="max-w-[85%] rounded-[24px] rounded-bl-md bg-white px-5 py-3 text-sm leading-relaxed text-[#4f665c] shadow-sm ring-1 ring-[#d3e8dc] sm:max-w-xl sm:text-base">
                Sedang menjawab...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
