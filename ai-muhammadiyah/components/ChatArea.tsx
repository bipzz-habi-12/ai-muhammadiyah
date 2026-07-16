"use client";

import type {
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
} from "react";
import Composer, { CHAT_DISCLAIMER } from "@/components/Composer";
import { SparkIcon, Icon } from "@/components/icons";
import MarkdownMessage from "@/components/MarkdownMessage";
import { formatArtifactTextForDisplay } from "@/lib/artifacts";
import type { Message } from "@/lib/mappers/types";
import type { Skill } from "@/lib/skills";
import { modelCatalog, type PlanModelId } from "@/lib/subscriptions/plans";
import type { UsageSnapshot } from "@/lib/usage/limits";

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

  // model + skill selection (forwarded to the welcome composer)
  selectedModel: PlanModelId;
  selectModel: (model: PlanModelId) => void;
  allowedModels: string[];
  isModelMenuOpen: boolean;
  modelOptions: PlanModelId[];
  selectedModelInfo: (typeof modelCatalog)[PlanModelId];
  skills: Skill[];
  skillsLoading: boolean;
  selectedSkillId: string | null;
  selectSkill: (skillId: string) => void;
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>;
  usageSnapshot: UsageSnapshot | null;
  isStudyModeMenuOpen: boolean;
  messageSkillOverrideId: string | null;
  setMessageSkillOverrideId: Dispatch<SetStateAction<string | null>>;
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
  selectedModel,
  selectModel,
  allowedModels,
  isModelMenuOpen,
  modelOptions,
  selectedModelInfo,
  skills,
  skillsLoading,
  selectedSkillId,
  selectSkill,
  setSelectedSkillId,
  usageSnapshot,
  isStudyModeMenuOpen,
  messageSkillOverrideId,
  setMessageSkillOverrideId,
}: ChatAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-9">
      {messages.length <= 1 && (
        <div className="mx-auto flex min-h-full w-full max-w-[746px] flex-col items-center justify-center gap-8 pb-3 pt-1 md:justify-start">
          <div className="grid h-[76px] w-[76px] place-items-center rounded-[22px] bg-[#0f5a3d] text-[#f5f3ec] shadow-[0_12px_32px_-18px_rgba(11,61,42,0.85)]">
            <SparkIcon className="h-11 w-11" />
          </div>

          <section className="text-center">
            <h2 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] text-[#12211b] sm:text-[44px]">
              Assalamu&apos;alaikum, ada yang bisa AI-mu bantu?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5d6862] sm:text-xl">
              Asisten cerdas Muhammadiyah, ditenagai{" "}
              <strong className="text-[#16211c]">ChatGPT 5.5</strong> &{" "}
              <strong className="text-[#16211c]">Gemini 3.1 Pro.</strong>
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
            isModelMenuOpen={isModelMenuOpen}
            modelOptions={modelOptions}
            selectedModelInfo={selectedModelInfo}
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

          <div className="grid w-full gap-3 sm:grid-cols-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.title}
                type="button"
                onClick={() => setInput(prompt.title)}
                className="flex min-h-[104px] items-center gap-5 rounded-[20px] bg-[#fbfaf6] px-6 text-left ring-1 ring-[#0b3d2a]/10 transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-24px_rgba(11,61,42,0.7)]"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#0f5a3d]/10 text-[#0f5a3d]">
                  <Icon name={prompt.icon} className="h-7 w-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold text-[#16211c]">
                    {prompt.title}
                  </span>
                  <span className="mt-1 block text-base leading-snug text-[#5d6862]">
                    {prompt.description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="max-w-2xl text-center text-base leading-relaxed text-[#5d6862]">
            {CHAT_DISCLAIMER}
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
                className="flex flex-col items-end gap-1 animate-[messageIn_0.25s_ease-out]"
              >
                <div className="max-w-[85%] whitespace-pre-wrap rounded-[16px] rounded-br-[4px] bg-[#0f5a3d] px-[17px] py-[13px] text-sm leading-relaxed text-[#f1f4ef] sm:max-w-xl sm:text-[15px]">
                  {message.text}
                </div>
              </div>
            ) : (
              <div
                key={index}
                className="animate-[messageIn_0.25s_ease-out]"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] bg-[#0f5a3d] text-[#f5f3ec]">
                    <SparkIcon className="h-4 w-4" />
                  </span>
                  <span className="text-[13px] font-semibold text-[#3a453e]">
                    AI Muhammadiyah
                  </span>
                </div>
                <div className="min-w-0 space-y-4 text-[15px] leading-[1.72] text-[#242e28] sm:text-[15.5px]">
                  {/* Rows store raw artifact markers; collapse them to a panel
                      reference at render time (works mid-stream too). */}
                  <MarkdownMessage
                    text={formatArtifactTextForDisplay(message.text)}
                  />
                  {message.continuationSuggested && !isSending && (
                    <button
                      type="button"
                      onClick={continueAnswer}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0f5a3d]/10 px-4 py-2 text-sm font-bold text-[#0f5a3d] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#0f5a3d]/15"
                    >
                      Lanjutkan jawaban
                    </button>
                  )}
                </div>
              </div>
            ),
          )}

          {isSending && isAwaitingFirstChunk && (
            <div className="animate-[messageIn_0.25s_ease-out]">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] bg-[#0f5a3d] text-[#f5f3ec]">
                  <SparkIcon className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-semibold text-[#3a453e]">
                  AI Muhammadiyah
                </span>
              </div>
              <div className="inline-flex items-center gap-3 rounded-[13px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-4 py-3 text-[13.5px] text-[#5d6862]">
                <span className="flex items-center gap-1">
                  <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-[#0f5a3d] [animation-delay:0ms]" />
                  <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-[#0f5a3d] [animation-delay:150ms]" />
                  <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-[#0f5a3d] [animation-delay:300ms]" />
                </span>
                Sedang menjawab…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
