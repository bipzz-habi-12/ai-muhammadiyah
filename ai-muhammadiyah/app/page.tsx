"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";

type Message = {
  role: "user" | "ai";
  text: string;
};

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
    <main className="h-screen bg-black text-white flex overflow-hidden">

      <aside className="w-72 bg-gray-950 border-r border-gray-800 px-5 py-6 hidden md:flex flex-col">
        <h1 className="text-2xl font-bold leading-tight">
          AI Muhammadiyah
        </h1>

        <p className="text-gray-400 mt-3 leading-relaxed">
          Asisten edukasi Islami modern.
        </p>

        <div className="mt-8 space-y-3">
          <button className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 py-3 rounded-xl text-base transition-colors">
            Chat Baru
          </button>

          <label className="block w-full cursor-pointer bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3 rounded-xl text-center text-base transition-colors">
            Upload Dokumen
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
          </label>

          <button className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3 rounded-xl text-base transition-colors">
            Popup Mode
          </button>
        </div>

        {uploadedFileName && (
          <div className="mt-6 rounded-xl bg-gray-900 p-3 text-sm text-gray-300 ring-1 ring-gray-800">
            <p className="text-gray-500">
              PDF terupload
            </p>

            <p className="mt-1 break-words font-medium text-white">
              {uploadedFileName}
            </p>
          </div>
        )}
      </aside>

      <section className="flex-1 flex flex-col">

        <header className="px-4 py-3 border-b border-gray-800 sm:px-6 sm:py-4">
          <Avatar />
        </header>

        <div className="border-b border-gray-800 px-4 py-3 sm:hidden">
          <label className="block cursor-pointer rounded-xl bg-gray-800 px-4 py-3 text-center text-sm transition-colors hover:bg-gray-700 active:bg-gray-600">
            Upload PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
          </label>

          {uploadedFileName && (
            <p className="mt-2 truncate text-sm text-gray-400">
              {uploadedFileName}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 sm:px-6 sm:py-6">

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
                    ? "max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-relaxed shadow-lg shadow-blue-950/30 sm:max-w-xl sm:text-base"
                    : "max-w-[85%] rounded-2xl rounded-bl-md bg-gray-800 px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/20 sm:max-w-xl sm:text-base"
                }
              >
                {message.text}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start animate-[messageIn_0.25s_ease-out]">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-800 px-4 py-3 text-sm leading-relaxed text-gray-300 shadow-lg shadow-black/20 sm:max-w-xl sm:text-base">
                Sedang menjawab...
              </div>
            </div>
          )}

        </div>

        <div className="border-t border-gray-800 p-3 sm:p-4">

          <div className="bg-gray-900 rounded-2xl flex items-center gap-2 px-3 py-2 ring-1 ring-gray-800 transition focus-within:ring-blue-500 sm:gap-3 sm:px-4 sm:py-3">

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Tulis pesan..."
              disabled={isSending}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-500 sm:text-base"
            />

            <button
              onClick={sendMessage}
              disabled={isSending}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-700 px-4 py-2 rounded-xl text-sm transition-colors sm:px-5 sm:text-base"
            >
              {isSending ? "..." : "Kirim"}
            </button>

          </div>

        </div>

      </section>

    </main>
  );
}
