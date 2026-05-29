"use client";

import { useState } from "react";

type Message = {
  role: "user" | "ai";
  text: string;
};

type ConversationGroup = {
  label: string;
  items: string[];
};

const conversationGroups: ConversationGroup[] = [
  {
    label: "HARI INI",
    items: [
      "Konsep Tajdid menurut KH Ahmad...",
      "Rencana pengajian RT bulan depan",
    ],
  },
  {
    label: "KEMARIN",
    items: [
      "Esai tentang pendidikan inklusif",
      "Ringkasan rapat Pimpinan Cabang",
    ],
  },
  {
    label: "7 HARI LALU",
    items: [
      "Doa untuk orang tua",
      "Belajar bahasa Arab dasar",
    ],
  },
  {
    label: "30 HARI LALU",
    items: [
      "Adab bermedia sosial",
    ],
  },
];

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

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3.5"
    >
      <path d="M29 5l-4.1 13.7L12 23l12.9 4.3L29 41l4.1-13.7L46 23l-12.9-4.3L29 5Z" />
      <path d="M12 6l-1.8 5.2L5 13l5.2 1.8L12 20l1.8-5.2L19 13l-5.2-1.8L12 6Z" />
      <path d="M10 35a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M40 8v7" />
      <path d="M36.5 11.5h7" />
    </svg>
  );
}

function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  if (name === "book") {
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
        <path d="M8 2v15" />
      </svg>
    );
  }

  if (name === "cap") {
    return (
      <svg {...common}>
        <path d="m22 10-10-5-10 5 10 5 10-5Z" />
        <path d="M6 12.5V16c2.8 2 9.2 2 12 0v-3.5" />
      </svg>
    );
  }

  if (name === "idea") {
    return (
      <svg {...common}>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.4 14.8A6 6 0 1 1 15.6 15c-.7.5-1.1 1.2-1.2 2h-4.8c-.1-.9-.5-1.6-1.2-2.2Z" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...common}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
    </svg>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Assalamualaikum! Saya AI Muhammadiyah.",
    },
  ]);

  const [input, setInput] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isSending, setIsSending] = useState(false);

  function preparePdfForAnalysis(file: File) {
    // This is where future AI document analysis can start.
    console.log("PDF ready for analysis:", file.name);
  }

  function handlePdfUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadedFileName(file.name);
    preparePdfForAnalysis(file);
  }

  async function sendMessage() {
    if (!input.trim() || isSending) return;

    const userText = input.trim();
    const nextMessages: Message[] = [
      ...messages,
      {
        role: "user",
        text: userText,
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat API request failed");
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.reply,
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Maaf, chat AI sedang bermasalah. Silakan coba lagi.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-[#f7fbf8] text-[#04140b]">
      <aside className="hidden w-[340px] shrink-0 border-r border-[#d9e9df] bg-[#eef8f1] md:flex md:flex-col">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#009252] text-white shadow-xl shadow-emerald-900/10">
              <SparkIcon className="h-7 w-7" />
            </div>

            <h1 className="text-xl font-bold tracking-tight">AI-mu</h1>
          </div>

          <button
            type="button"
            aria-label="Alihkan sidebar"
            title="Alihkan sidebar"
            className="grid h-10 w-10 place-items-center rounded-full text-[#557064] transition hover:bg-white/80"
          >
            <Icon name="book" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4">
          <button
            type="button"
            className="flex h-[62px] w-full items-center gap-4 rounded-[28px] bg-white px-6 text-left text-lg font-bold shadow-[0_2px_10px_rgba(15,55,35,0.16)] ring-1 ring-[#d8eadf] transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(15,55,35,0.14)]"
          >
            <span className="text-3xl font-light text-[#008d54]">+</span>
            Obrolan baru
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3 px-6 text-[#536b60]">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
          <span className="text-lg">Cari obrolan</span>
        </div>

        <nav className="mt-9 flex-1 overflow-y-auto px-5 pb-6">
          {conversationGroups.map((group) => (
            <div key={group.label} className="mb-8">
              <h2 className="mb-5 text-sm font-bold tracking-wide text-[#4f665c]">
                {group.label}
              </h2>

              <div className="space-y-5">
                {group.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="flex w-full items-center gap-3 text-left text-lg text-[#18392e] transition hover:text-[#008d54]"
                  >
                    <Icon name="chat" className="h-5 w-5 shrink-0 text-[#566d62]" />
                    <span className="truncate">{item}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#d9e9df] px-5 py-4">
          {uploadedFileName && (
            <div className="mb-4 rounded-2xl bg-white p-3 text-sm text-[#4f665c] ring-1 ring-[#d8eadf]">
              <p className="font-semibold text-[#008d54]">PDF terupload</p>
              <p className="mt-1 break-words text-[#18392e]">{uploadedFileName}</p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#c9f7dc] text-lg font-bold text-[#008d54]">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">Akun Anggota</p>
              <p className="truncate text-sm text-[#4f665c]">Paket Tajdid</p>
            </div>
            <button
              type="button"
              aria-label="Pengaturan akun"
              title="Pengaturan akun"
              className="grid h-10 w-10 place-items-center rounded-full text-[#566d62] transition hover:bg-white"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2.1 2.1 0 0 1-3 3l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7V22a2.1 2.1 0 0 1-4.2 0v-.2a1.8 1.8 0 0 0-1.2-1.7 1.8 1.8 0 0 0-2 .4l-.1.1a2.1 2.1 0 0 1-3-3l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1.1H2a2.1 2.1 0 0 1 0-4.2h.2a1.8 1.8 0 0 0 1.7-1.2 1.8 1.8 0 0 0-.4-2l-.1-.1a2.1 2.1 0 0 1 3-3l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1.1-1.7V2a2.1 2.1 0 0 1 4.2 0v.2a1.8 1.8 0 0 0 1.2 1.7 1.8 1.8 0 0 0 2-.4l.1-.1a2.1 2.1 0 0 1 3 3l-.1.1a1.8 1.8 0 0 0-.4 2c.3.7.9 1.1 1.7 1.1h.2a2.1 2.1 0 0 1 0 4.2h-.2a1.8 1.8 0 0 0-1.9 1.2Z" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#fbfdfb]">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#d9e9df] px-4 sm:px-6 md:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#009252] text-white md:hidden">
              <SparkIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0 text-lg font-bold sm:text-xl">
              <span>AI-mu</span>
              <span className="mx-2 text-[#4f665c]">·</span>
              <button
                type="button"
                className="inline-flex min-w-0 items-center gap-2 font-semibold text-[#38534a]"
              >
                <span className="truncate">ChatGPT 5.5</span>
                <span aria-hidden="true" className="text-[#4f665c]">⌄</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden rounded-full bg-white px-5 py-3 font-bold text-[#06140d] shadow-[0_2px_9px_rgba(15,55,35,0.14)] ring-1 ring-[#d8eadf] transition hover:-translate-y-0.5 sm:block"
            >
              Bagikan
            </button>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#009252] text-xl font-bold text-white">
              A
            </div>
          </div>
        </header>

        <div className="border-b border-[#d9e9df] px-4 py-3 md:hidden">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-[#18392e] shadow-sm ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1]">
            <span className="text-xl text-[#008d54]">+</span>
            Upload PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
          </label>

          {uploadedFileName && (
            <p className="mt-2 truncate text-sm text-[#4f665c]">{uploadedFileName}</p>
          )}
        </div>

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

              <div className="w-full rounded-[34px] bg-white p-5 shadow-[0_22px_60px_rgba(27,77,50,0.08)] ring-1 ring-[#d3e8dc]">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                  placeholder="Tanyakan apa saja kepada AI-mu..."
                  disabled={isSending}
                  className="h-20 w-full bg-transparent text-xl text-[#18392e] outline-none placeholder:text-[#4f665c]"
                />

                <div className="mt-4 flex flex-wrap items-center gap-3 text-[#4f665c]">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#eef8f1]">
                    <span aria-hidden="true" className="text-2xl">⌘</span>
                    Lampirkan
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#eef8f1]"
                  >
                    <Icon name="book" className="h-6 w-6" />
                    Mode Kajian
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#eef8f1]"
                  >
                    <Icon name="idea" className="h-5 w-5" />
                    Ide
                  </button>

                  <button
                    type="button"
                    aria-label="Input suara"
                    title="Input suara"
                    className="ml-auto grid h-11 w-11 place-items-center rounded-full transition hover:bg-[#eef8f1]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    >
                      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
                      <path d="M19 11a7 7 0 0 1-14 0" />
                      <path d="M12 18v4" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={isSending || !input.trim()}
                    aria-label="Kirim pesan"
                    title="Kirim pesan"
                    className="grid h-14 w-14 place-items-center rounded-full bg-[#95d6b9] text-white transition hover:bg-[#009252] disabled:cursor-not-allowed disabled:bg-[#c9ded3]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-7 w-7"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    >
                      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                      <path d="M22 2 11 13" />
                    </svg>
                  </button>
                </div>
              </div>

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
              {messages.map((message, index) => (
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
                        ? "max-w-[85%] rounded-[24px] rounded-br-md bg-[#009252] px-5 py-3 text-sm leading-relaxed text-white shadow-lg shadow-emerald-900/15 sm:max-w-xl sm:text-base"
                        : "max-w-[85%] rounded-[24px] rounded-bl-md bg-white px-5 py-3 text-sm leading-relaxed text-[#18392e] shadow-sm ring-1 ring-[#d3e8dc] sm:max-w-xl sm:text-base"
                    }
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start animate-[messageIn_0.25s_ease-out]">
                  <div className="max-w-[85%] rounded-[24px] rounded-bl-md bg-white px-5 py-3 text-sm leading-relaxed text-[#4f665c] shadow-sm ring-1 ring-[#d3e8dc] sm:max-w-xl sm:text-base">
                    Sedang menjawab...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {messages.length > 1 && (
          <div className="border-t border-[#d9e9df] bg-[#fbfdfb] p-3 sm:p-4">
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-[#d3e8dc] focus-within:ring-[#95d6b9] sm:gap-3 sm:px-4">
              <label
                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-[#4f665c] transition hover:bg-[#eef8f1]"
                title="Lampirkan PDF"
                aria-label="Lampirkan PDF"
              >
                <span aria-hidden="true" className="text-2xl leading-none">+</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </label>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
                placeholder="Tanyakan apa saja kepada AI-mu..."
                disabled={isSending}
                className="min-w-0 flex-1 bg-transparent text-sm text-[#18392e] outline-none placeholder:text-[#6d8178] sm:text-base"
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={isSending || !input.trim()}
                aria-label="Kirim pesan"
                title="Kirim pesan"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#95d6b9] text-white transition hover:bg-[#009252] disabled:cursor-not-allowed disabled:bg-[#c9ded3]"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>

            {uploadedFileName && (
              <p className="mx-auto mt-2 max-w-3xl truncate px-3 text-sm text-[#4f665c]">
                {uploadedFileName}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
