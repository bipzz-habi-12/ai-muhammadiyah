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
          <div className="grid h-[84px] w-[84px] place-items-center rounded-[34px] bg-[#004d27] text-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <SparkIcon className="h-12 w-12" />
          </div>

          <section className="text-center">
            <h2 className="text-4xl font-bold leading-tight tracking-normal text-[#191c1d] sm:text-5xl">
              Assalamu&apos;alaikum, ada yang bisa AI-mu bantu?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#3f4940] sm:text-xl">
              Asisten cerdas Muhammadiyah, ditenagai{" "}
              <strong className="text-[#191c1d]">ChatGPT 5.5</strong> &{" "}
              <strong className="text-[#191c1d]">Gemini 3.1 Pro.</strong>
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
                className="flex min-h-[104px] items-center gap-5 rounded-[30px] bg-white px-6 text-left ring-1 ring-[#bec9be] transition hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#004d27]/10 text-[#004d27]">
                  <Icon name={prompt.icon} className="h-7 w-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold text-[#191c1d]">
                    {prompt.title}
                  </span>
                  <span className="mt-1 block text-base leading-snug text-[#3f4940]">
                    {prompt.description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="max-w-2xl text-center text-base leading-relaxed text-[#3f4940]">
            AI-mu dapat keliru. Selalu verifikasi informasi penting, terutama
            dalam urusan ibadah & syariah.
          </p>
        </div>
      )}

      {messages.length > 1 && (
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end space-y-4">
          {messages.map((message, index) =>
            message.role === "ai" && !message.text ? null : message.role ===
              "user" ? (
              <div
                key={index}
                className="flex justify-end animate-[messageIn_0.25s_ease-out]"
              >
                <div className="max-w-[85%] whitespace-pre-wrap rounded-[24px] rounded-br-md bg-[#e7e8e9] px-5 py-3 text-sm leading-relaxed text-[#3f4940] sm:max-w-xl sm:text-base">
                  {message.text}
                </div>
              </div>
            ) : (
              <div
                key={index}
                className="flex gap-4 animate-[messageIn_0.25s_ease-out]"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#004d27]/10 text-[#004d27]">
                  <SparkIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-4 text-sm leading-relaxed text-[#191c1d] sm:text-base">
                  <MarkdownMessage text={message.text} />
                  {message.continuationSuggested && !isSending && (
                    <button
                      type="button"
                      onClick={continueAnswer}
                      className="inline-flex items-center gap-2 rounded-full bg-[#004d27]/10 px-4 py-2 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#004d27]/15"
                    >
                      Lanjutkan jawaban
                    </button>
                  )}
                </div>
              </div>
            ),
          )}

          {isSending && isAwaitingFirstChunk && (
            <div className="flex gap-4 animate-[messageIn_0.25s_ease-out]">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#004d27]/10 text-[#004d27]">
                <SparkIcon className="h-5 w-5" />
              </div>
              <div className="flex items-center pt-1.5 text-sm leading-relaxed text-[#3f4940] sm:text-base">
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
