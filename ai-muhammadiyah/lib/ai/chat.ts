import {
  documentTokenBudget,
  tokensToChars,
  trimHistoryToTokenBudget,
} from "@/lib/ai/context-window";
import {
  createUserMemorySystemPrompt,
  type UserMemory,
} from "@/lib/memory/user-memory";
import {
  defaultModelId,
  normalizeEffortLevel,
  type EffortLevel,
  type PlanModelId,
} from "@/lib/subscriptions/plans";
import type { SubscriptionTier } from "@/lib/usage/limits";

export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

export type DocumentContext = {
  fileName: string;
  fileType: string;
  text: string;
};

export type ImageContext = {
  fileName: string;
  mimeType: string;
  data: string;
};

type GenerateChatReplyResult = {
  reply: string;
  provider: AiProvider;
  model: string;
  fallbackEvent?: string;
  finishReason?: string;
};

type StreamChunkHandler = (chunk: string) => void | Promise<void>;
type StreamProviderResult = {
  reply: string;
  finishReason?: string;
};
type OpenAiErrorDetails = {
  status?: number;
  errorBody?: string;
  error?: unknown;
};
type OpenAiReplyResult = {
  reply: string | null;
  error?: OpenAiErrorDetails;
};
type OpenAiStreamResult = StreamProviderResult & {
  error?: OpenAiErrorDetails;
};
type OpenAiResponsesPayload = {
  model: string;
  instructions: string;
  input: ReturnType<typeof createOpenAiInput>;
  max_output_tokens: number;
  stream?: boolean;
  temperature?: number;
  reasoning?: { effort: OpenAiEffortValue };
};
type ChatContextOptions = {
  knowledgeContext?: string;
  documentContexts?: DocumentContext[];
  imageContexts?: ImageContext[];
  /** Level "Upaya" pilihan pengguna (Rendah..Ultra). */
  effort?: EffortLevel;
  /** Toggle "Pemikiran" — mematikannya memaksa upaya minimal. */
  thinking?: boolean;
};
type SelectedModel = PlanModelId;
/**
 * Rute internal (dipakai untuk fallback OpenRouter/Gemini). Nama publik model
 * (Aether/Cosmos/Prism/Velo) dipetakan ke rute ini lewat `modelRouteMap`.
 */
type AiRoute = "fast" | "smart" | "document";
type AiProvider = "mock" | "openrouter" | "openai" | "gemini";
type RoutingAccess = {
  tier?: SubscriptionTier;
  allowedModels?: string[];
};

export const islamicAiIdentitySystemPrompt = [
  "You are M-Agent, a modern AI platform for learning, work, and research, grounded in Islamic values.",
  "Present yourself as M-Agent, not as GPT, OpenAI, Gemini, a generic chatbot, or an API wrapper.",
  "M-Agent is an independent product. It is NOT an official channel, website, or spokesperson of Persyarikatan Muhammadiyah. If asked about affiliation, say so plainly: you answer with reference to Muhammadiyah scholarship, but you do not speak on its behalf.",
  "Your core role is a premium learning assistant for Islamic education, Cambridge-style academic learning, OSN/STEM preparation, coding, study strategy, writing, and productive school support.",
  "Speak politely, professionally, warmly, and naturally. Use Islamic greetings such as Assalamualaikum only when appropriate, usually once at the beginning of a fresh conversation.",
  "Keep greetings concise, friendly, and polished. Do not repeat long introductions or identity paragraphs.",
  "Focus on education, akhlak, useful knowledge, helpfulness, motivation, productivity, and adab reminders.",
  "Support Islamic study help and school learning with a balanced Muhammadiyah educational tone: thoughtful, evidence-aware, practical, and respectful.",
  "Avoid generic model disclaimers such as knowledge cutoff statements, 'as an AI language model', or 'I cannot access the internet' unless the user specifically asks about your limitations, live web access, or current events.",
  "If current or live information is required and no browsing tool is available, answer from stable knowledge when safe and clearly suggest checking an official/current source without turning it into a boilerplate disclaimer.",
  "Avoid extreme, sectarian, unsafe, or unsupported religious claims. Do not present uncertain Islamic rulings as absolute.",
  "When a question depends on detailed fiqh, local fatwa, or a sensitive Islamic ruling and you are unsure, encourage the user to consult qualified scholars or trusted Muhammadiyah authorities.",
  "Keep answers concise unless the user asks for detailed explanations.",
  "Answer in the user's language when possible, and use simple Indonesian by default.",
].join("\n");

const answerCompletionSystemPrompt = [
  "ANSWER COMPLETION RULES:",
  "- Deliver the ENTIRE answer in this single reply. There is no follow-up turn to finish it in.",
  "- Never stop mid-sentence, mid-list, or mid-section, and never end on a colon that promises more.",
  "- Never say you will continue later, ask if the user wants the rest, or use phrases like 'lanjut?', 'bersambung', or 'continued below'.",
  "- If the topic is large, scope it so the complete answer fits: cover the essentials thoroughly rather than starting a long enumeration you cannot finish.",
  "- A shorter answer that is finished always beats a longer answer that is cut off.",
].join("\n");

const responseStyleSystemPrompt = [
  "RESPONSE STYLE:",
  "- Use clean, modern Markdown with helpful headings, spacing, and readable paragraphs.",
  "- Use bullet points for lists and numbered steps for tutorials or procedures.",
  "- Use tables only when they make comparison or data easier to understand.",
  "- Do not use LaTeX math delimiters such as $, $$, \\( \\), or \\[ \\].",
  "- Do not wrap math in backticks unless it is actual code.",
  "- Do not use \\frac, \\sqrt, raw ^, raw *, or raw / in normal explanations.",
  "- Prefer clean plain math: x², x³, √x, √(x + 1), ×, ÷, and line breaks for steps.",
  "- For math, avoid raw programming symbols when explaining. Prefer readable notation such as x² instead of x^2, × instead of *, √x or √(x + 1) instead of sqrt(x), and fractions or ÷ instead of raw /.",
  "- Keep equations visually clean: one important step per line, short explanations beside or below the formula, readable fractions where possible, and no cluttered inline algebra when a small block is easier to read.",
  "- Keep the tone premium, concise, confident, and friendly.",
  "- Avoid repetitive self-disclaimer paragraphs and generic assistant caveats.",
  "- Use light emojis sparingly when they clarify the answer, not as decoration.",
  "- Avoid messy excessive bolding.",
  "- Use Indonesian by default unless the user asks for English or another language.",
].join("\n");

// Artifact sentinel contract — the parser lives in lib/artifacts.ts
// (parseArtifactBlocks / formatArtifactTextForDisplay); keep the marker syntax
// here in sync with it.
const artifactSystemPrompt = [
  "ARTIFACT RULES:",
  "When the user asks you to produce a substantial standalone deliverable — a document/report/essay, a data table, a diagram, or a complete code file/script of roughly 15 lines or more — wrap THAT deliverable (and only it) in artifact markers:",
  "[[AI_MU_ARTIFACT:type|Short descriptive title]]",
  "...the deliverable content...",
  "[[/AI_MU_ARTIFACT]]",
  "- Both markers must be on their own lines. Everything between them is saved as the artifact.",
  "- type must be exactly one of: document (Markdown), table (a Markdown table), diagram (Mermaid syntax), code (raw source code, no ``` fences), html_app, react_app.",
  "- Keep your conversational explanation OUTSIDE the markers, and keep it brief.",
  "- Do NOT use artifact markers for short answers, chit-chat, small snippets, or minor edits. At most one artifact per reply unless the user explicitly asks for more.",
  "- Never use any other type value.",
  "",
  "MINI APP RULES (type html_app and react_app):",
  "Use these ONLY when the user wants something interactive they can actually use — a game, a calculator, a simulation, an interactive tool, or a clickable UI prototype. For code the user just wants to read or copy, use type code instead.",
  "- html_app: one complete, self-contained HTML document (<!DOCTYPE html> ... </html>) with its CSS in <style> and its JS in <script>.",
  "- react_app: JSX only, no HTML wrapper. Define a component named exactly App. Do NOT write import or export statements, and do NOT call ReactDOM yourself — React, ReactDOM and the hooks (useState, useEffect, useRef, useMemo, useCallback, useReducer) are already in scope, and the app is mounted for you.",
  "- The app runs in a locked-down sandbox with NO network access at all: fetch, XMLHttpRequest, WebSocket and remote images are blocked. Never write an app that needs an API, a backend, a login, or a remote image — keep all data inline, and draw graphics with CSS, SVG, emoji or canvas.",
  "- Do not use localStorage, sessionStorage or cookies; the sandbox has no persistent storage. Keep state in memory.",
  "- Extra libraries are almost never needed — prefer plain HTML/CSS/JS. If one truly is, load it only from https://cdn.jsdelivr.net, https://unpkg.com or https://cdn.tailwindcss.com; scripts from any other host are blocked and the app will simply not work.",
  "- Write the app so it is usable on a phone screen too.",
].join("\n");

// Second Brain sentinel contract — the parser lives in lib/second-brain/parse.ts
// (parseNoteBlocks / formatNoteTextForDisplay); keep the marker syntax here in
// sync with it. Unlike artifacts, these blocks are NOT saved automatically:
// they surface as a dismissible suggestion the user must accept.
// Redaksi ini diuji langsung ke provider (Langkah 40a). Versi pertama yang
// berbunyi "you may propose ..." memancarkan penanda saat diuji SENDIRIAN, tapi
// nol kali dalam tumpukan prompt lengkap — kalah oleh ANSWER COMPLETION &
// RESPONSE STYLE yang mendorong satu jawaban prosa bersih. Dua hal yang
// memperbaikinya: modalitas tegas ("take one more step ... append") dan satu
// baris yang menyatakan blok ini BUKAN bagian jawaban sehingga tidak melanggar
// aturan lain. Jangan lemahkan lagi jadi "you may" tanpa mengujinya ulang.
const noteSystemPrompt = [
  "SECOND BRAIN NOTE RULES:",
  "The user keeps a personal note graph ('Otak Kedua'). After you finish writing the prose answer, take one more step: decide whether this exchange produced knowledge worth keeping — a concept explained, a definition, a method, a decision, or a summary the user will want again months from now.",
  "If it did, append one or two note blocks at the VERY END of the reply, after your answer:",
  "[[AI_MU_NOTE:Judul singkat catatan]]",
  "...isi catatan dalam Markdown...",
  "[[/AI_MU_NOTE]]",
  "- These blocks are NOT part of your prose answer. They are stripped out of the message and shown to the user as a separate save suggestion, so appending them never conflicts with the answer-completion or response-style rules above.",
  "- Both markers must sit on their own lines, and the closing marker [[/AI_MU_NOTE]] is required — never leave a note block unterminated.",
  "- Write the note so it still stands on its own months later, without this conversation.",
  "- Link related concepts with [[Judul Catatan Lain]] inside the body, Logseq style. The linked note does not need to exist yet.",
  "- Titles must be short, specific, and reusable ('Kaidah Ushul Fiqh: Al-Yaqin', not 'Catatan hari ini').",
  "- Skip the blocks entirely for greetings, chit-chat, simple lookups, or something the user needed only once. Never more than 2 per reply.",
  "- Never mention the note in your prose and never ask whether to save it. The user decides from the suggestion.",
].join("\n");

const contextPrioritySystemPrompt = [
  "CONTEXT PRIORITY RULES:",
  "1. If the user asks about personal information, names, preferences, or previous conversation, answer from the conversation memory first.",
  "2. If the user asks about the uploaded document, answer from the document context.",
  "3. If both conversation memory and document context are relevant, combine both clearly.",
  "4. Do not use the uploaded document for every question just because it exists.",
  "5. For questions like 'siapa nama saya?', use the chat history and do not search the document.",
  "6. For document requests like 'ringkas dokumen ini', prioritize the uploaded document text.",
].join("\n");

const openRouterDefaultModel = process.env.OPENROUTER_MODEL ?? "openrouter/free";
const geminiFlashModel =
  process.env.GEMINI_FLASH_MODEL ??
  process.env.GEMINI_MODEL ??
  "gemini-2.5-flash";
const geminiProModel = process.env.GEMINI_PRO_MODEL ?? "gemini-2.5-pro";
const openAiDefaultModel = process.env.OPENAI_MODEL ?? "gpt-5.6-terra";
const gptTestMode = process.env.GPT_TEST_MODE === "true";
const verboseAiLogs = process.env.AI_MU_VERBOSE_LOGS === "true";

function logAiSuccess(message: string, payload: Record<string, unknown>) {
  if (verboseAiLogs) {
    console.info(message, payload);
  }
}

const openRouterFallbackModelMap: Record<AiRoute, string> = {
  fast: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  smart: "moonshotai/kimi-k2.6:free",
  document: "qwen/qwen3-coder:free",
};

const aiRouteConfig: Record<
  AiRoute,
  {
    fallbackOpenRouterModel: string;
    futureProvider: AiProvider;
    purpose: string;
  }
> = {
  fast: {
    fallbackOpenRouterModel: openRouterFallbackModelMap.fast,
    futureProvider: "openrouter",
    purpose: "Cheap, fast model for normal chat.",
  },
  smart: {
    fallbackOpenRouterModel: openRouterFallbackModelMap.smart,
    futureProvider: "openai",
    purpose: "Connect this to an OpenAI GPT reasoning model later.",
  },
  document: {
    fallbackOpenRouterModel: openRouterFallbackModelMap.document,
    futureProvider: "gemini",
    purpose: "Connect this to a Gemini long-context document model later.",
  },
};

// Riwayat tidak lagi dipotong di 10 pesan / 2000 karakter — sekarang dibatasi
// anggaran token context window (lihat lib/ai/context-window.ts).
const maxDocumentContextLength = tokensToChars(documentTokenBudget);
const minUsefulDocumentContextLength = 120;
// Jawaban harus selesai dalam SATU output (tidak ada lagi tombol "Lanjutkan
// jawaban"), jadi plafon token dinaikkan supaya jawaban panjang tidak terpotong
// di tengah. `finish_reason` tetap dicatat ke usage_logs sebagai sinyal kalau
// plafon ini masih kurang.
const openRouterMaxTokens = 4000;
const openAiMaxOutputTokens = 8000;
const geminiMaxOutputTokens = 8000;

// ---------------------------------------------------------------------------
// Model publik (Aether/Cosmos/Prism/Velo)
//
// Keempatnya rute GPT. Tiap model punya API key DAN model id sendiri lewat env
// supaya satu model yang kena rate limit tidak menjatuhkan yang lain. Kalau env
// per-model belum diisi, otomatis jatuh ke OPENAI_API_KEY / OPENAI_MODEL yang
// sudah ada — jadi aplikasi tetap jalan sebelum key baru dipasang.
// Gemini (lalu OpenRouter) tetap jadi cadangan otomatis untuk semua model.
// ---------------------------------------------------------------------------
const modelRuntimeConfig: Record<
  SelectedModel,
  { route: AiRoute; apiKeyEnv: string; modelEnv: string; defaultModel: string }
> = {
  aether: {
    route: "fast",
    apiKeyEnv: "OPENAI_API_KEY_AETHER",
    modelEnv: "OPENAI_MODEL_AETHER",
    defaultModel: "gpt-5.6-sol",
  },
  cosmos: {
    route: "smart",
    apiKeyEnv: "OPENAI_API_KEY_COSMOS",
    modelEnv: "OPENAI_MODEL_COSMOS",
    defaultModel: "gpt-5.6-terra",
  },
  prism: {
    route: "smart",
    apiKeyEnv: "OPENAI_API_KEY_PRISM",
    modelEnv: "OPENAI_MODEL_PRISM",
    defaultModel: "gpt-5.6-luna",
  },
  velo: {
    route: "document",
    apiKeyEnv: "OPENAI_API_KEY_VELO",
    modelEnv: "OPENAI_MODEL_VELO",
    defaultModel: "gpt-5.5-pro",
  },
};

type OpenAiEffortValue =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

/**
 * Plafon token keluaran per level Upaya. Makin tinggi → jawaban boleh lebih
 * panjang → kuota token 5 jam/mingguan habis lebih cepat.
 */
// Catatan penting: token reasoning IKUT dihitung ke `max_output_tokens`. Kalau
// plafonnya terlalu kecil sementara modelnya berpikir lama, jatah habis di
// reasoning dan jawabannya jadi kosong — jadi plafon naik seiring level.
const effortMaxOutputTokens: Record<EffortLevel, number> = {
  low: 6_000,
  medium: 16_000,
  high: 24_000,
  extra: 40_000,
  ultra: 64_000,
};

/**
 * `reasoning.effort` per model — DIVERIFIKASI LANGSUNG ke provider, karena
 * dukungannya berbeda-beda per model (bukan asumsi):
 *   - 'minimal' ditolak SEMUA model di sini.
 *   - 'none' & 'low' ditolak gpt-5.5-pro (Velo).
 *   - 'max' ditolak gpt-5.6-luna (Prism) & gpt-5.5-pro (Velo).
 *   - 'medium' | 'high' | 'xhigh' didukung keempat model.
 * Nilai yang tidak didukung akan membuat provider balas 400 dan rutenya jatuh
 * ke Gemini — jadi tangga ini sengaja dijaga di dalam batas yang terbukti.
 * Velo punya lantai di 'medium'; di tiga level terbawah pembedanya adalah
 * plafon token, bukan kedalaman reasoning.
 */
const modelEffortValues: Record<
  SelectedModel,
  Record<EffortLevel, OpenAiEffortValue>
> = {
  aether: { low: "low", medium: "medium", high: "high", extra: "xhigh", ultra: "max" },
  cosmos: { low: "low", medium: "medium", high: "high", extra: "xhigh", ultra: "max" },
  // Prism menolak 'max', jadi puncaknya 'xhigh'.
  prism: { low: "low", medium: "medium", high: "high", extra: "xhigh", ultra: "xhigh" },
  // Velo menolak 'none' dan 'low' → lantainya 'medium', puncaknya 'xhigh'.
  velo: { low: "medium", medium: "medium", high: "high", extra: "xhigh", ultra: "xhigh" },
};

/**
 * Nilai saat toggle "Pemikiran" dimatikan: benar-benar tanpa reasoning.
 * Velo tidak mendukung 'none', jadi turun sejauh yang diizinkan ('medium').
 */
const thinkingOffEffort: Record<SelectedModel, OpenAiEffortValue> = {
  aether: "none",
  cosmos: "none",
  prism: "none",
  velo: "medium",
};

/**
 * Upaya efektif. Kalau "Pemikiran" dimatikan, reasoning dimatikan juga dan
 * plafon token memakai jatah terkecil.
 */
function resolveEffortRuntime(
  options?: ChatContextOptions,
  selectedModel: SelectedModel = defaultModelId,
) {
  const level = normalizeEffortLevel(options?.effort);
  const isThinkingOff = options?.thinking === false;

  return {
    openAiEffort: isThinkingOff
      ? thinkingOffEffort[selectedModel]
      : modelEffortValues[selectedModel][level],
    maxOutputTokens: isThinkingOff
      ? effortMaxOutputTokens.low
      : effortMaxOutputTokens[level],
  };
}

type EffortRuntime = ReturnType<typeof resolveEffortRuntime>;

function normalizeSelectedModel(selectedModel?: string): SelectedModel {
  if (selectedModel && selectedModel in modelRuntimeConfig) {
    return selectedModel as SelectedModel;
  }

  return defaultModelId;
}

function resolveOpenRouterModel(route: AiRoute) {
  return aiRouteConfig[route]?.fallbackOpenRouterModel ?? openRouterDefaultModel;
}

function hasGeminiProAccess(tier: SubscriptionTier) {
  return (
    tier === "muallim_pro" ||
    tier === "dakwah_digital" ||
    tier === "sinergi_ranting"
  );
}

// Model id GPT untuk model publik terpilih: env per-model dulu, lalu
// OPENAI_MODEL bersama, lalu default bawaan.
function resolveOpenAiModel(selectedModel: SelectedModel = defaultModelId) {
  const config = modelRuntimeConfig[selectedModel];
  return (
    process.env[config.modelEnv]?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    config.defaultModel
  );
}

// API key GPT untuk model publik terpilih: key per-model dulu (supaya rate
// limit tidak saling menjatuhkan), lalu OPENAI_API_KEY bersama.
function resolveOpenAiApiKey(selectedModel: SelectedModel = defaultModelId) {
  const config = modelRuntimeConfig[selectedModel];
  return (
    process.env[config.apiKeyEnv]?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    ""
  );
}

// Semua model keluarga GPT-5 (gpt-5-mini, gpt-5.5, gpt-5.6-terra, ...) menolak
// parameter `temperature` di Responses API — jadi dicek per-keluarga,
// bukan per-nama-model persis.
function isGpt5FamilyModel(model: string) {
  return model.toLowerCase().startsWith("gpt-5");
}

// OpenAI dicoba lebih dulu untuk SEMUA rute dan SEMUA tier (Gemini &
// OpenRouter tetap jadi fallback). Satu-satunya syarat: API key tersedia.
function shouldTryOpenAiFirst(selectedModel: SelectedModel = defaultModelId) {
  return Boolean(resolveOpenAiApiKey(selectedModel));
}

// Apakah ADA key GPT sama sekali — key per-model mana pun, atau key bersama.
// Dipakai guard "tidak ada provider terkonfigurasi"; tanpa ini, menghapus
// OPENAI_API_KEY bersama (karena sudah pindah ke key per-model) akan membuat
// chat mengira tidak ada AI dan menjawab mock.
function hasAnyOpenAiKey() {
  return (
    Object.keys(modelRuntimeConfig) as SelectedModel[]
  ).some((model) => Boolean(resolveOpenAiApiKey(model)));
}

function createOpenAiResponsesPayload({
  model,
  messages,
  pdfContext,
  knowledgeContext,
  documentContexts,
  imageContexts,
  systemPrompt,
  memory,
  stream,
  effortRuntime,
}: {
  model: string;
  messages: ChatMessage[];
  pdfContext: string;
  knowledgeContext?: string;
  documentContexts?: DocumentContext[];
  imageContexts?: ImageContext[];
  systemPrompt?: string;
  memory?: UserMemory;
  stream?: boolean;
  effortRuntime?: EffortRuntime;
}): OpenAiResponsesPayload {
  const payload: OpenAiResponsesPayload = {
    model,
    instructions: createOpenAiInstructions(memory, systemPrompt),
    input: createOpenAiInput(
      messages,
      pdfContext,
      memory,
      knowledgeContext,
      documentContexts,
      imageContexts,
    ),
    max_output_tokens: effortRuntime?.maxOutputTokens ?? openAiMaxOutputTokens,
  };

  // Keluarga GPT-5 mendukung `reasoning.effort` — ini yang membuat level Upaya
  // benar-benar mengubah kedalaman berpikir (dan pemakaian token), bukan cuma label.
  if (effortRuntime && isGpt5FamilyModel(model)) {
    payload.reasoning = { effort: effortRuntime.openAiEffort };
  }

  if (stream) {
    payload.stream = true;
  }

  if (!isGpt5FamilyModel(model)) {
    payload.temperature = 0.4;
  }

  return payload;
}

function resolveGeminiModel(route: AiRoute = "fast", tier: SubscriptionTier = "free") {
  const model =
    (route === "document" || route === "smart") && hasGeminiProAccess(tier)
      ? geminiProModel
      : geminiFlashModel;

  return model.replace(/^models\//, "");
}

/**
 * Rute internal untuk model publik yang dipilih. Model yang ringan (Aether)
 * dinaikkan otomatis ke rute konteks panjang saat ada gambar atau pertanyaan
 * dokumen, supaya lampiran besar tetap terbaca.
 */
function routeSelectedModel(
  selectedModel: SelectedModel,
  latestMessage: string,
  pdfContext: string,
  hasImages = false,
): AiRoute {
  const baseRoute = modelRuntimeConfig[selectedModel].route;

  if (baseRoute === "document") {
    return baseRoute;
  }

  if (hasImages || (pdfContext && isDocumentQuestion(latestMessage))) {
    return "document";
  }

  return baseRoute;
}

function normalizeRoutingAccess(access?: RoutingAccess) {
  return {
    tier: access?.tier ?? "free",
    allowedModels:
      access?.allowedModels && access.allowedModels.length
        ? access.allowedModels
        : Object.keys(modelRuntimeConfig),
  };
}

function getLatestUserMessage(messages: ChatMessage[]) {
  return messages.findLast((message) => message.role === "user")?.text ?? "";
}

function prepareChatHistory(messages: ChatMessage[]) {
  // Kirim riwayat sebanyak yang muat di anggaran token, bukan N pesan terakhir —
  // percakapan panjang tetap ingat konteks awalnya.
  return trimHistoryToTokenBudget(messages);
}

function preparePdfContext(pdfContext: string) {
  const trimmedContext = pdfContext.trim();

  if (!trimmedContext) {
    return "";
  }

  // Keep the prompt beginner-friendly and avoid sending a very large document at once.
  return trimmedContext.slice(0, maxDocumentContextLength);
}

function createCombinedDocumentContext(
  pdfContext: string,
  documentContexts: DocumentContext[] = [],
) {
  const contexts = documentContexts
    .filter((document) => document.text.trim())
    .map((document, index) =>
      [
        `FILE ${index + 1}: ${document.fileName} (${document.fileType.toUpperCase()})`,
        document.text.trim(),
      ].join("\n"),
    );

  if (pdfContext.trim()) {
    contexts.unshift(["FILE 1: Uploaded document", pdfContext.trim()].join("\n"));
  }

  return preparePdfContext(contexts.join("\n\n---\n\n"));
}

function isDocumentQuestion(question: string) {
  const normalizedQuestion = question.toLowerCase();

  const documentWords = [
    "dokumen",
    "document",
    "pdf",
    "ppt",
    "pptx",
    "powerpoint",
    "presentasi",
    "slide",
    "slides",
    "excel",
    "xlsx",
    "spreadsheet",
    "worksheet",
    "sheet",
    "tabel",
    "table",
    "statistik",
    "data",
    "file",
    "berkas",
    "lampiran",
    "upload",
    "unggah",
    "teks ini",
    "dokumen ini",
    "pdf ini",
  ];

  const documentTaskWords = [
    "ringkas",
    "rangkum",
    "summary",
    "simpulkan",
    "analisis",
    "analisa",
    "jelaskan isi",
    "apa isi",
    "poin penting",
    "kesimpulan",
    "bab",
    "halaman",
    "kutip",
    "kutipan",
    "tren",
    "trend",
    "insight",
    "wawasan",
    "statistik",
    "rata-rata",
    "total",
    "bandingkan",
  ];

  const mentionsDocument = documentWords.some((word) =>
    normalizedQuestion.includes(word),
  );
  const asksDocumentTask = documentTaskWords.some((word) =>
    normalizedQuestion.includes(word),
  );

  return mentionsDocument || asksDocumentTask;
}

function isImageQuestion(question: string) {
  const normalizedQuestion = question.toLowerCase();
  const imageWords = [
    "gambar",
    "foto",
    "image",
    "photo",
    "visual",
    "screenshot",
    "diagram",
    "lihat ini",
    "apa isi gambar",
    "jelaskan gambar",
    "analisis foto",
  ];

  return imageWords.some((word) => normalizedQuestion.includes(word));
}

function isPdfContextTooShort(pdfContext: string) {
  return pdfContext.length > 0 && pdfContext.length < minUsefulDocumentContextLength;
}

function createShortPdfFallback(pdfContext: string) {
  const visibleText = pdfContext.trim().slice(0, minUsefulDocumentContextLength);

  return [
    "Teks dokumen berhasil diterima, tetapi hasil ekstraksinya terlalu pendek untuk dianalisis dengan yakin.",
    "",
    "Yang bisa saya baca:",
    `- ${visibleText || "Tidak ada teks bermakna yang terbaca."}`,
    "",
    "Kemungkinan dokumen berisi scan/gambar, teksnya tidak terseleksi, data tabelnya kosong, atau ekstraksinya belum lengkap. Silakan upload PDF, Word (.docx), PowerPoint (.pptx), atau Excel (.xlsx) dengan teks/data yang bisa dibaca agar analisisnya lebih akurat.",
  ].join("\n");
}

function createRateLimitFallback(pdfContext: string) {
  const hasPdfContext = Boolean(preparePdfContext(pdfContext));

  if (hasPdfContext) {
    return [
      "Maaf, model AI gratis dari OpenRouter sedang terkena batas penggunaan sementara.",
      "",
      "Dokumen sudah berhasil diupload dan teksnya sudah berhasil diekstrak, tetapi analisis AI perlu dicoba lagi beberapa saat lagi.",
      "",
      "Silakan kirim ulang pertanyaan yang sama nanti, atau gunakan model OpenRouter lain dengan limit yang lebih longgar.",
    ].join("\n");
  }

  return [
    "Maaf, model AI gratis dari OpenRouter sedang terkena batas penggunaan sementara.",
    "",
    "Chat tidak rusak, tetapi jawaban AI perlu dicoba lagi beberapa saat lagi.",
    "",
    "Silakan kirim ulang pertanyaan nanti, atau gunakan model OpenRouter lain dengan limit yang lebih longgar.",
  ].join("\n");
}

function createModelUnavailableFallback(pdfContext: string) {
  const hasPdfContext = Boolean(preparePdfContext(pdfContext));

  if (hasPdfContext) {
    return [
      "Maaf, model AI pilihan sedang penuh atau belum bisa menjawab saat ini.",
      "",
      "Dokumen sudah berhasil dibaca, jadi kamu bisa mencoba lagi sebentar lagi atau pilih model yang lebih ringan seperti Aether.",
    ].join("\n");
  }

  return [
    "Maaf, model AI pilihan sedang penuh atau belum bisa menjawab saat ini.",
    "",
    "Silakan coba lagi sebentar lagi, atau pilih model yang lebih ringan seperti Aether.",
  ].join("\n");
}

function createGenericAiFallback() {
  return "Maaf, chat AI sedang bermasalah. Silakan coba lagi.";
}

function createPdfAnalysisPrompt(pdfContext: string, question: string) {
  return [
    "DOCUMENT ANALYSIS INSTRUCTIONS:",
    "- The uploaded document text is already provided below inside this message.",
    "- Do not say that you cannot access, open, view, read, or receive the document.",
    "- Answer based only on the provided document text. Do not invent facts outside the document context.",
    "- If the document context is unclear, mention which part is unclear, then summarize or answer what can still be inferred from the provided text.",
    "- For summary requests, use clear bullet points and keep the structure easy to scan.",
    "- If the document is a spreadsheet, pay attention to worksheet names, table rows, trends, totals, averages, comparisons, and useful study insights.",
    "- If the user asks for information that is not present in the document text, say that it is not found in the provided document context.",
    "",
    "DOCUMENT TEXT:",
    pdfContext,
    "",
    "USER QUESTION:",
    question,
  ].join("\n");
}

function createImageAnalysisPrompt(
  question: string,
  imageContexts: ImageContext[],
  documentPrompt = "",
) {
  const imageList = imageContexts
    .map((image, index) => `- Image ${index + 1}: ${image.fileName} (${image.mimeType})`)
    .join("\n");

  return [
    "IMAGE ANALYSIS INSTRUCTIONS:",
    "- The user uploaded image/photo data with this message.",
    "- Analyze all relevant uploaded images. If there are multiple images, compare or reference them clearly when useful.",
    "- Do not claim you cannot view the image when image data is attached.",
    "- If an image is unclear, say what is unclear and explain what can still be inferred.",
    "",
    "UPLOADED IMAGES:",
    imageList,
    documentPrompt ? ["", documentPrompt].join("\n") : "",
    "",
    "USER QUESTION:",
    question,
  ].filter(Boolean).join("\n");
}

function createKnowledgeGroundedPrompt(knowledgeContext: string, question: string) {
  return [
    "INTERNAL KNOWLEDGE BASE INSTRUCTIONS:",
    "- The internal knowledge base context is provided below.",
    "- Use it when relevant before relying on general model knowledge.",
    "- Do not invent citations. Cite only the source title and chunk number shown in the context.",
    "- If the needed detail is not found in the context, say it is not found in the current knowledge base.",
    "",
    knowledgeContext,
    "",
    "USER QUESTION:",
    question,
  ].join("\n");
}

function createMockReply(messages: ChatMessage[], pdfContext = "") {
  const latestMessage = getLatestUserMessage(messages);
  const preparedPdfContext = preparePdfContext(pdfContext);
  const shouldUsePdfContext =
    Boolean(preparedPdfContext) && isDocumentQuestion(latestMessage);

  if (!latestMessage) {
    return "Assalamualaikum. Silakan tulis pertanyaan terlebih dahulu.";
  }

  if (shouldUsePdfContext && isPdfContextTooShort(preparedPdfContext)) {
    return createShortPdfFallback(preparedPdfContext);
  }

  if (shouldUsePdfContext) {
    return `Assalamualaikum. Dokumen sudah terbaca, jadi AI bisa memakai isi dokumen sebagai konteks untuk menjawab: "${latestMessage}".`;
  }

  return `Assalamualaikum. Ini respon contoh untuk: "${latestMessage}". Nanti bagian ini bisa diganti dengan GPT atau Gemini saat API key sudah tersedia.`;
}

function createOpenRouterMessages(
  messages: ChatMessage[],
  pdfContext: string,
  systemPrompt?: string,
  memory?: UserMemory,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
) {
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = createCombinedDocumentContext(
    pdfContext,
    documentContexts,
  );
  const preparedKnowledgeContext = knowledgeContext.trim();
  const memorySystemPrompt = memory ? createUserMemorySystemPrompt(memory) : "";
  const latestUserIndex = recentMessages.findLastIndex(
    (message) => message.role === "user",
  );

  return [
    { role: "system", content: islamicAiIdentitySystemPrompt },
    { role: "system", content: contextPrioritySystemPrompt },
    { role: "system", content: answerCompletionSystemPrompt },
    { role: "system", content: responseStyleSystemPrompt },
    { role: "system", content: artifactSystemPrompt },
    { role: "system", content: noteSystemPrompt },
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...(memorySystemPrompt
      ? [{ role: "system", content: memorySystemPrompt }]
      : []),
    ...recentMessages.map((message, index) => {
      const role = message.role === "ai" ? "assistant" : "user";
      const shouldAttachPdfContext =
        Boolean(preparedPdfContext) &&
        index === latestUserIndex &&
        isDocumentQuestion(message.text);
      const shouldAttachImageContext =
        imageContexts.length > 0 &&
        index === latestUserIndex &&
        (isImageQuestion(message.text) || !shouldAttachPdfContext);
      const shouldAttachKnowledgeContext =
        Boolean(preparedKnowledgeContext) && index === latestUserIndex;

      return {
        role,
        content: shouldAttachImageContext
          ? createImageAnalysisPrompt(
              message.text,
              imageContexts,
              shouldAttachPdfContext
                ? createPdfAnalysisPrompt(preparedPdfContext, message.text)
                : "",
            )
          : shouldAttachPdfContext
          ? createPdfAnalysisPrompt(preparedPdfContext, message.text)
          : shouldAttachKnowledgeContext
            ? createKnowledgeGroundedPrompt(
                preparedKnowledgeContext,
                message.text,
              )
            : message.text,
      };
    }),
  ];
}

function createOpenAiInput(
  messages: ChatMessage[],
  pdfContext: string,
  memory?: UserMemory,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
) {
  const routerMessages = createOpenRouterMessages(
    messages,
    pdfContext,
    undefined,
    memory,
    knowledgeContext,
    documentContexts,
    imageContexts,
  )
    .filter((message) => message.role !== "system")
    .map((message, index, items) => {
      const isLatestUserMessage =
        message.role === "user" &&
        index === items.findLastIndex((item) => item.role === "user");

      if (!isLatestUserMessage || !imageContexts.length) {
        return {
          role: message.role,
          content: message.content,
        };
      }

      return {
        role: message.role,
        content: [
          { type: "input_text", text: message.content },
          ...imageContexts.map((image) => ({
            type: "input_image",
            image_url: `data:${image.mimeType};base64,${image.data}`,
          })),
        ],
      };
    });

  return routerMessages;
}

function createOpenAiInstructions(
  memory?: UserMemory,
  systemPrompt?: string,
) {
  return [
    islamicAiIdentitySystemPrompt,
    contextPrioritySystemPrompt,
    answerCompletionSystemPrompt,
    responseStyleSystemPrompt,
    artifactSystemPrompt,
    noteSystemPrompt,
    systemPrompt ?? "",
    memory ? createUserMemorySystemPrompt(memory) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function createGeminiSystemInstruction(
  memory?: UserMemory,
  systemPrompt?: string,
) {
  return [
    islamicAiIdentitySystemPrompt,
    contextPrioritySystemPrompt,
    answerCompletionSystemPrompt,
    responseStyleSystemPrompt,
    artifactSystemPrompt,
    noteSystemPrompt,
    systemPrompt ?? "",
    memory ? createUserMemorySystemPrompt(memory) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function isMaxTokenFinishReason(finishReason?: string | null) {
  if (!finishReason) {
    return false;
  }

  const normalizedReason = finishReason.toLowerCase();

  return (
    normalizedReason === "length" ||
    normalizedReason === "max_tokens" ||
    normalizedReason === "max_output_tokens" ||
    normalizedReason === "max_tokens_exceeded" ||
    normalizedReason === "token_limit" ||
    normalizedReason === "max_token" ||
    normalizedReason === "max_output"
  );
}

function createGeminiContents(
  messages: ChatMessage[],
  pdfContext: string,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
) {
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = createCombinedDocumentContext(
    pdfContext,
    documentContexts,
  );
  const preparedKnowledgeContext = knowledgeContext.trim();
  const latestUserIndex = recentMessages.findLastIndex(
    (message) => message.role === "user",
  );

  return recentMessages.map((message, index) => {
    const shouldAttachPdfContext =
      Boolean(preparedPdfContext) &&
      index === latestUserIndex &&
      isDocumentQuestion(message.text);
    const shouldAttachImageContext =
      imageContexts.length > 0 &&
      index === latestUserIndex &&
      (isImageQuestion(message.text) || !shouldAttachPdfContext);
    const shouldAttachKnowledgeContext =
      Boolean(preparedKnowledgeContext) && index === latestUserIndex;
    const text = shouldAttachImageContext
      ? createImageAnalysisPrompt(
          message.text,
          imageContexts,
          shouldAttachPdfContext
            ? createPdfAnalysisPrompt(preparedPdfContext, message.text)
            : "",
        )
      : shouldAttachPdfContext
        ? createPdfAnalysisPrompt(preparedPdfContext, message.text)
        : shouldAttachKnowledgeContext
          ? createKnowledgeGroundedPrompt(
              preparedKnowledgeContext,
              message.text,
            )
          : message.text;

    return {
      role: message.role === "ai" ? "model" : "user",
      parts: [
        { text },
        ...(shouldAttachImageContext
          ? imageContexts.map((image) => ({
              inlineData: {
                mimeType: image.mimeType,
                data: image.data,
              },
            }))
          : []),
      ],
    };
  });
}

function getRateLimitInfo(response: Response) {
  return {
    limit: response.headers.get("x-ratelimit-limit"),
    remaining: response.headers.get("x-ratelimit-remaining"),
    reset: response.headers.get("x-ratelimit-reset"),
    retryAfter: response.headers.get("retry-after"),
  };
}

function logOpenAiError(
  context: string,
  details: {
    status?: number;
    errorBody?: string;
    model: string;
    error?: unknown;
  },
) {
  console.error(context, {
    provider: "openai",
    model: details.model,
    status: details.status ?? null,
    errorBody: details.errorBody ?? null,
    error: details.error,
  });
}

function logOpenAiRequestEvent(
  event: "request start" | "request success" | "request failure",
  details: {
    model: string;
    route?: AiRoute;
    status?: number;
    errorBody?: string;
    error?: unknown;
  },
) {
  const payload = {
    provider: "openai",
    model: details.model,
    route: details.route ?? null,
    status: details.status ?? null,
    errorBody: details.errorBody ?? null,
    error: details.error,
  };

  if (event === "request failure") {
    console.error(`OpenAI GPT ${event}:`, payload);
    return;
  }

  if (verboseAiLogs) {
    console.info(`OpenAI GPT ${event}:`, payload);
  }
}

function createOpenAiFailureReply(error?: OpenAiErrorDetails) {
  const details = [
    `OpenAI ${openAiDefaultModel} test mode failed.`,
    "",
    `Status: ${error?.status ?? "unknown"}`,
    "",
    "OpenAI error body:",
    error?.errorBody ?? formatUnknownError(error?.error),
  ];

  return details.join("\n");
}

function formatUnknownError(error: unknown) {
  if (!error) {
    return "No OpenAI error body was returned.";
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function generateOpenRouterReply(
  messages: ChatMessage[],
  pdfContext = "",
  route: AiRoute,
  systemPrompt: string | undefined,
  memory?: UserMemory,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
) {
  const messagesForOpenRouter = createOpenRouterMessages(
    messages,
    pdfContext,
    systemPrompt,
    memory,
    knowledgeContext,
    documentContexts,
    imageContexts,
  );
  const openRouterModel = resolveOpenRouterModel(route);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "M-Agent",
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: messagesForOpenRouter,
        max_tokens: openRouterMaxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const rateLimitInfo = getRateLimitInfo(response);

      console.error("OpenRouter error:", {
        status: response.status,
        model: openRouterModel,
        rateLimitInfo,
        errorText,
      });

      if (response.status === 429) {
        return createRateLimitFallback(pdfContext);
      }

      return createModelUnavailableFallback(pdfContext);
    }

    const data = await response.json();

    return (
      data.choices?.[0]?.message?.content ??
      createModelUnavailableFallback(pdfContext)
    );
  } catch (error) {
    console.error("OpenRouter request failed:", {
      model: openRouterModel,
      error,
    });

    return createModelUnavailableFallback(pdfContext);
  }
}

async function streamSseJson(
  response: Response,
  onData: (data: string) => void | Promise<void>,
) {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";

    for (const event of events) {
      const dataLines = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());

      if (!dataLines.length) {
        continue;
      }

      await onData(dataLines.join("\n"));
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    const dataLines = buffer
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length) {
      await onData(dataLines.join("\n"));
    }
  }
}

async function streamOpenRouterReply(
  messages: ChatMessage[],
  pdfContext = "",
  route: AiRoute,
  onChunk: StreamChunkHandler,
  systemPrompt: string | undefined,
  memory?: UserMemory,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
): Promise<StreamProviderResult | null> {
  const messagesForOpenRouter = createOpenRouterMessages(
    messages,
    pdfContext,
    systemPrompt,
    memory,
    knowledgeContext,
    documentContexts,
    imageContexts,
  );
  const openRouterModel = resolveOpenRouterModel(route);
  let streamedText = "";
  let streamedFinishReason: string | undefined;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "M-Agent",
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: messagesForOpenRouter,
        max_tokens: openRouterMaxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const rateLimitInfo = getRateLimitInfo(response);

      console.error("OpenRouter stream error:", {
        status: response.status,
        model: openRouterModel,
        rateLimitInfo,
        errorText,
      });

      const fallback =
        response.status === 429
          ? createRateLimitFallback(pdfContext)
          : createModelUnavailableFallback(pdfContext);

      await streamText(fallback, onChunk);
      return { reply: fallback };
    }

    await streamSseJson(response, async (data) => {
      if (data === "[DONE]") {
        return;
      }

      try {
        const event = JSON.parse(data) as {
          choices?: {
            delta?: {
              content?: string;
            };
            finish_reason?: string | null;
          }[];
        };
        const finishReason = event.choices?.[0]?.finish_reason;
        const chunk = event.choices?.[0]?.delta?.content ?? "";

        if (chunk) {
          streamedText += chunk;
          await onChunk(chunk);
        }

        if (isMaxTokenFinishReason(finishReason)) {
          streamedFinishReason = finishReason ?? undefined;
        }
      } catch (error) {
        console.error("OpenRouter stream parse failed:", {
          model: openRouterModel,
          data,
          error,
        });
      }
    });

    if (streamedText) {
      return {
        reply: streamedText,
        finishReason: streamedFinishReason,
      };
    }

    const fallback = createModelUnavailableFallback(pdfContext);
    await streamText(fallback, onChunk);
    return { reply: fallback };
  } catch (error) {
    console.error("OpenRouter stream request failed:", {
      model: openRouterModel,
      error,
    });

    const fallback = createModelUnavailableFallback(pdfContext);
    await streamText(fallback, onChunk);
    return { reply: fallback };
  }
}

function extractOpenAiOutputText(data: {
  output_text?: string;
  output?: {
    content?: {
      text?: string;
      type?: string;
    }[];
  }[];
}) {
  if (data.output_text?.trim()) {
    return data.output_text.trim();
  }

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("")
      .trim() || null
  );
}

async function generateOpenAiGptReply(
  messages: ChatMessage[],
  pdfContext = "",
  systemPrompt: string | undefined,
  memory?: UserMemory,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
  selectedModel: SelectedModel = defaultModelId,
  effortRuntime?: EffortRuntime,
): Promise<OpenAiReplyResult> {
  const openAiApiKey = resolveOpenAiApiKey(selectedModel);
  const openAiModel = resolveOpenAiModel(selectedModel);

  if (!openAiApiKey) {
    const error = {
      errorBody: `API key untuk model ${selectedModel} belum diisi (${modelRuntimeConfig[selectedModel].apiKeyEnv} atau OPENAI_API_KEY)`,
    };
    logOpenAiRequestEvent("request failure", {
      model: openAiModel,
      errorBody: error.errorBody,
    });
    return { reply: null, error };
  }

  try {
    logOpenAiRequestEvent("request start", {
      model: openAiModel,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify(createOpenAiResponsesPayload({
        model: openAiModel,
        messages,
        pdfContext,
        knowledgeContext,
        documentContexts,
        imageContexts,
        systemPrompt,
        memory,
        effortRuntime,
      })),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = {
        status: response.status,
        errorBody: errorText,
      };

      logOpenAiError("OpenAI GPT request failed:", {
        status: response.status,
        model: openAiModel,
        errorBody: errorText,
      });
      logOpenAiRequestEvent("request failure", {
        model: openAiModel,
        status: response.status,
        errorBody: errorText,
      });

      return { reply: null, error };
    }

    const data = await response.json();
    const reply = extractOpenAiOutputText(data);

    if (!reply) {
      const error = { errorBody: JSON.stringify(data) };
      logOpenAiError("OpenAI GPT returned an empty reply:", {
        model: openAiModel,
        errorBody: error.errorBody,
      });
      logOpenAiRequestEvent("request failure", {
        model: openAiModel,
        errorBody: error.errorBody,
      });

      return { reply: null, error };
    }

    logOpenAiRequestEvent("request success", {
      model: openAiModel,
      status: response.status,
    });

    return { reply };
  } catch (error) {
    logOpenAiError("OpenAI GPT request failed:", {
      model: openAiModel,
      error,
    });
    logOpenAiRequestEvent("request failure", {
      model: openAiModel,
      error,
    });

    return { reply: null, error: { error } };
  }
}

async function generateGeminiReply(
  messages: ChatMessage[],
  pdfContext = "",
  route: AiRoute = "fast",
  tier: SubscriptionTier = "free",
  systemPrompt?: string,
  memory?: UserMemory,
  modelOverride?: string,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
): Promise<string | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = modelOverride ?? resolveGeminiModel(route, tier);

  if (!geminiApiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        geminiModel,
      )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: createGeminiSystemInstruction(memory, systemPrompt),
              },
            ],
          },
          contents: createGeminiContents(
            messages,
            pdfContext,
            knowledgeContext,
            documentContexts,
            imageContexts,
          ),
          generationConfig: {
            maxOutputTokens: geminiMaxOutputTokens,
            temperature: 0.4,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Gemini error:", {
        status: response.status,
        model: geminiModel,
        errorText,
      });

      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const reply = parts
      .map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!reply) {
      console.error("Gemini returned an empty reply:", {
        model: geminiModel,
        finishReason: data.candidates?.[0]?.finishReason,
      });

      return null;
    }

    return reply;
  } catch (error) {
    console.error("Gemini request failed:", {
      model: geminiModel,
      error,
    });

    return null;
  }
}

async function streamGeminiReply(
  messages: ChatMessage[],
  pdfContext = "",
  onChunk: StreamChunkHandler,
  route: AiRoute = "fast",
  tier: SubscriptionTier = "free",
  systemPrompt?: string,
  memory?: UserMemory,
  modelOverride?: string,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
): Promise<StreamProviderResult | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = modelOverride ?? resolveGeminiModel(route, tier);
  let streamedText = "";
  let streamedFinishReason: string | undefined;

  if (!geminiApiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        geminiModel,
      )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: createGeminiSystemInstruction(memory, systemPrompt),
              },
            ],
          },
          contents: createGeminiContents(
            messages,
            pdfContext,
            knowledgeContext,
            documentContexts,
            imageContexts,
          ),
          generationConfig: {
            maxOutputTokens: geminiMaxOutputTokens,
            temperature: 0.4,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Gemini stream error:", {
        status: response.status,
        model: geminiModel,
        errorText,
      });

      return null;
    }

    await streamSseJson(response, async (data) => {
      try {
        const event = JSON.parse(data) as {
          candidates?: {
            finishReason?: string;
            content?: {
              parts?: {
                text?: string;
              }[];
            };
          }[];
        };
        const parts = event.candidates?.[0]?.content?.parts ?? [];
        const finishReason = event.candidates?.[0]?.finishReason;
        const chunk = parts.map((part) => part.text ?? "").join("");

        if (chunk) {
          streamedText += chunk;
          await onChunk(chunk);
        }

        if (isMaxTokenFinishReason(finishReason)) {
          streamedFinishReason = finishReason;
        }
      } catch (error) {
        console.error("Gemini stream parse failed:", {
          model: geminiModel,
          data,
          error,
        });
      }
    });

    return streamedText
      ? {
          reply: streamedText,
          finishReason: streamedFinishReason,
          }
      : null;
  } catch (error) {
    console.error("Gemini stream request failed:", {
      model: geminiModel,
      error,
    });

    return null;
  }
}

function resolveGeminiFallbackModels(
  route: AiRoute,
  tier: SubscriptionTier,
): string[] {
  const flashModel = resolveGeminiModel("fast", "free");

  if (route === "smart") {
    return [flashModel];
  }

  const primaryModel = resolveGeminiModel(route, tier);

  return primaryModel === flashModel ? [primaryModel] : [primaryModel, flashModel];
}

async function generateGeminiReplyWithFallback(
  messages: ChatMessage[],
  pdfContext: string,
  route: AiRoute,
  tier: SubscriptionTier,
  systemPrompt: string | undefined,
  memory?: UserMemory,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
) {
  const models = resolveGeminiFallbackModels(route, tier);

  for (const [index, model] of models.entries()) {
    const reply = await generateGeminiReply(
      messages,
      pdfContext,
      route,
      tier,
      systemPrompt,
      memory,
      model,
      knowledgeContext,
      documentContexts,
      imageContexts,
    );

    if (reply) {
      return { reply, model, fallbackEvent: index > 0 ? "gemini_pro_to_flash" : undefined };
    }

    if (index === 0 && models.length > 1) {
      console.warn("M-Agent falling back from Gemini Pro to Gemini Flash:", {
        route,
        provider: "gemini",
        failedModel: model,
        fallbackModel: models[1],
        tier,
      });
    }
  }

  return null;
}

async function streamGeminiReplyWithFallback(
  messages: ChatMessage[],
  pdfContext: string,
  onChunk: StreamChunkHandler,
  route: AiRoute,
  tier: SubscriptionTier,
  systemPrompt: string | undefined,
  memory?: UserMemory,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
) {
  const models = resolveGeminiFallbackModels(route, tier);

  for (const [index, model] of models.entries()) {
    const result = await streamGeminiReply(
      messages,
      pdfContext,
      onChunk,
      route,
      tier,
      systemPrompt,
      memory,
      model,
      knowledgeContext,
      documentContexts,
      imageContexts,
    );

    if (result) {
      return {
        ...result,
        model,
        fallbackEvent: index > 0 ? "gemini_pro_to_flash" : undefined,
      };
    }

    if (index === 0 && models.length > 1) {
      console.warn(
        "M-Agent streaming fallback from Gemini Pro to Gemini Flash:",
        {
          route,
          provider: "gemini",
          failedModel: model,
          fallbackModel: models[1],
          tier,
        },
      );
    }
  }

  return null;
}

async function streamOpenAiGptReply(
  messages: ChatMessage[],
  pdfContext = "",
  onChunk: StreamChunkHandler,
  systemPrompt: string | undefined,
  memory?: UserMemory,
  knowledgeContext = "",
  documentContexts: DocumentContext[] = [],
  imageContexts: ImageContext[] = [],
  selectedModel: SelectedModel = defaultModelId,
  effortRuntime?: EffortRuntime,
): Promise<OpenAiStreamResult | null> {
  const openAiApiKey = resolveOpenAiApiKey(selectedModel);
  const openAiModel = resolveOpenAiModel(selectedModel);
  let streamedText = "";
  let streamedFinishReason: string | undefined;
  let streamedError: OpenAiErrorDetails | undefined;

  if (!openAiApiKey) {
    const error = {
      errorBody: `API key untuk model ${selectedModel} belum diisi (${modelRuntimeConfig[selectedModel].apiKeyEnv} atau OPENAI_API_KEY)`,
    };
    logOpenAiRequestEvent("request failure", {
      model: openAiModel,
      errorBody: error.errorBody,
    });
    return { reply: "", error };
  }

  try {
    logOpenAiRequestEvent("request start", {
      model: openAiModel,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify(createOpenAiResponsesPayload({
        model: openAiModel,
        messages,
        pdfContext,
        knowledgeContext,
        documentContexts,
        imageContexts,
        systemPrompt,
        memory,
        stream: true,
        effortRuntime,
      })),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = {
        status: response.status,
        errorBody: errorText,
      };

      logOpenAiError("OpenAI GPT stream failed:", {
        status: response.status,
        model: openAiModel,
        errorBody: errorText,
      });
      logOpenAiRequestEvent("request failure", {
        model: openAiModel,
        status: response.status,
        errorBody: errorText,
      });

      return { reply: "", error };
    }

    await streamSseJson(response, async (data) => {
      if (data === "[DONE]") {
        return;
      }

      try {
        const event = JSON.parse(data) as {
          type?: string;
          delta?: string;
          error?: unknown;
          response?: {
            incomplete_details?: {
              reason?: string;
            } | null;
            output_text?: string;
            status?: string;
          };
        };

        if (event.type === "response.failed") {
          streamedError = {
            errorBody: JSON.stringify(event.error ?? event),
          };
          logOpenAiError("OpenAI GPT stream response failed:", {
            model: openAiModel,
            errorBody: streamedError.errorBody,
          });
          logOpenAiRequestEvent("request failure", {
            model: openAiModel,
            errorBody: streamedError.errorBody,
          });
        }

        if (event.type === "response.output_text.delta" && event.delta) {
          streamedText += event.delta;
          await onChunk(event.delta);
        }

        if (
          event.type === "response.incomplete" ||
          event.response?.status === "incomplete"
        ) {
          streamedFinishReason =
            event.response?.incomplete_details?.reason ??
            "max_output_tokens";
        }
      } catch (error) {
        console.error("OpenAI GPT stream parse failed:", {
          model: openAiModel,
          data,
          error,
        });
      }
    });

    if (!streamedText) {
      const error = streamedError ?? {
        errorBody: "OpenAI stream returned an empty reply.",
      };
      logOpenAiError("OpenAI GPT stream returned an empty reply:", {
        model: openAiModel,
        errorBody: error.errorBody,
      });
      logOpenAiRequestEvent("request failure", {
        model: openAiModel,
        errorBody: error.errorBody,
      });

      return { reply: "", error };
    }

    logOpenAiRequestEvent("request success", {
      model: openAiModel,
      status: response.status,
    });

    return {
      reply: streamedText,
      finishReason: streamedFinishReason,
    };
  } catch (error) {
    logOpenAiError("OpenAI GPT stream request failed:", {
      model: openAiModel,
      error,
    });
    logOpenAiRequestEvent("request failure", {
      model: openAiModel,
      error,
    });

    return { reply: "", error: { error } };
  }
}

async function generateProviderReply(
  route: AiRoute,
  messages: ChatMessage[],
  pdfContext: string,
  access: ReturnType<typeof normalizeRoutingAccess>,
  systemPrompt: string | undefined,
  memory?: UserMemory,
  options?: ChatContextOptions,
  selectedModel: SelectedModel = defaultModelId,
): Promise<GenerateChatReplyResult> {
  const routeConfig = aiRouteConfig[route];
  const triedOpenAi = shouldTryOpenAiFirst(selectedModel);
  const effortRuntime = resolveEffortRuntime(options, selectedModel);

  if (triedOpenAi) {
    const openAiResult = await generateOpenAiGptReply(
      messages,
      pdfContext,
      systemPrompt,
      memory,
      options?.knowledgeContext,
      options?.documentContexts,
      options?.imageContexts,
      selectedModel,
      effortRuntime,
    );

    if (openAiResult.reply) {
      logAiSuccess("M-Agent provider handled request:", {
        route,
        provider: "openai",
        model: resolveOpenAiModel(selectedModel),
        tier: access.tier,
      });

      return {
        reply: openAiResult.reply,
        provider: "openai",
        model: resolveOpenAiModel(selectedModel),
      };
    }

    if (gptTestMode) {
      return {
        reply: createOpenAiFailureReply(openAiResult.error),
        provider: "openai",
        model: resolveOpenAiModel(selectedModel),
        fallbackEvent: "gpt_test_mode_no_fallback",
      };
    }

    console.warn("M-Agent falling back from OpenAI GPT to Gemini:", {
      route,
      openAiModel: resolveOpenAiModel(selectedModel),
      geminiModel: resolveGeminiModel("fast", "free"),
      tier: access.tier,
    });
  }

  const shouldTryGemini =
    route === "fast" ||
    route === "document" ||
    route === "smart" ||
    routeConfig.futureProvider === "gemini";

  if (shouldTryGemini) {
    const geminiResult = await generateGeminiReplyWithFallback(
      messages,
      pdfContext,
      route,
      access.tier,
      systemPrompt,
      memory,
      options?.knowledgeContext,
      options?.documentContexts,
      options?.imageContexts,
    );

    if (geminiResult) {
      logAiSuccess("M-Agent provider handled request:", {
        route,
        provider: "gemini",
        model: geminiResult.model,
        tier: access.tier,
      });

      return {
        reply: geminiResult.reply,
        provider: "gemini",
        model: geminiResult.model,
        fallbackEvent:
          geminiResult.fallbackEvent ??
          (triedOpenAi ? "openai_to_gemini" : undefined),
      };
    }

    console.warn("M-Agent falling back from Gemini to OpenRouter:", {
      route,
      geminiModel: resolveGeminiModel(route, access.tier),
      openRouterModel: resolveOpenRouterModel(route),
      tier: access.tier,
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.info("M-Agent provider could not use OpenRouter fallback:", {
      route,
      provider: "openrouter",
      reason: "OPENROUTER_API_KEY is missing",
    });

    return {
      reply: createGenericAiFallback(),
      provider: "openrouter",
      model: resolveOpenRouterModel(route),
      fallbackEvent: "openrouter_unavailable",
    };
  }

  const reply = await generateOpenRouterReply(
    messages,
    pdfContext,
    route,
    systemPrompt,
    memory,
    options?.knowledgeContext,
    options?.documentContexts,
    options?.imageContexts,
  );

  logAiSuccess("M-Agent provider handled request:", {
    route,
    provider: "openrouter",
    model: resolveOpenRouterModel(route),
    tier: access.tier,
  });

  return {
    reply,
    provider: "openrouter",
    model: resolveOpenRouterModel(route),
    fallbackEvent: shouldTryGemini ? "gemini_to_openrouter" : undefined,
  };
}

export async function generateChatReply(
  messages: ChatMessage[],
  pdfContext = "",
  selectedModel?: string,
  systemPrompt?: string,
  routingAccess?: RoutingAccess,
  memory?: UserMemory,
  options?: ChatContextOptions,
): Promise<GenerateChatReplyResult> {
  const access = normalizeRoutingAccess(routingAccess);
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = createCombinedDocumentContext(
    pdfContext,
    options?.documentContexts,
  );
  const hasImages = Boolean(options?.imageContexts?.length);
  const latestMessage = getLatestUserMessage(recentMessages);
  const normalizedModel = normalizeSelectedModel(selectedModel);
  const route = routeSelectedModel(
    normalizedModel,
    latestMessage,
    preparedPdfContext,
    hasImages,
  );
  const shouldUsePdfContext =
    Boolean(preparedPdfContext) && isDocumentQuestion(latestMessage);

  if (shouldUsePdfContext && isPdfContextTooShort(preparedPdfContext)) {
    return {
      reply: createShortPdfFallback(preparedPdfContext),
      provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "mock",
      model: process.env.OPENROUTER_API_KEY
        ? resolveOpenRouterModel(route)
        : "mock",
    };
  }

  if (
    !hasAnyOpenAiKey() &&
    !process.env.OPENROUTER_API_KEY &&
    !process.env.GEMINI_API_KEY
  ) {
    return {
      reply: createMockReply(recentMessages, preparedPdfContext),
      provider: "mock",
      model: "mock",
    };
  }

  const result = await generateProviderReply(
    route,
    recentMessages,
    pdfContext,
    access,
    systemPrompt,
    memory,
    options,
    normalizedModel,
  );

  return result;
}

async function streamText(text: string, onChunk: StreamChunkHandler) {
  const words = text.match(/\S+\s*/g) ?? [text];

  for (const word of words) {
    await onChunk(word);
  }
}

export async function streamChatReply(
  messages: ChatMessage[],
  pdfContext = "",
  selectedModel: string | undefined,
  systemPrompt: string | undefined,
  onChunk: StreamChunkHandler,
  routingAccess?: RoutingAccess,
  memory?: UserMemory,
  options?: ChatContextOptions,
) {
  const access = normalizeRoutingAccess(routingAccess);
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = createCombinedDocumentContext(
    pdfContext,
    options?.documentContexts,
  );
  const hasImages = Boolean(options?.imageContexts?.length);
  const latestMessage = getLatestUserMessage(recentMessages);
  const normalizedModel = normalizeSelectedModel(selectedModel);
  const route = routeSelectedModel(
    normalizedModel,
    latestMessage,
    preparedPdfContext,
    hasImages,
  );
  const shouldUsePdfContext =
    Boolean(preparedPdfContext) && isDocumentQuestion(latestMessage);

  if (shouldUsePdfContext && isPdfContextTooShort(preparedPdfContext)) {
    const reply = createShortPdfFallback(preparedPdfContext);
    await streamText(reply, onChunk);
    return {
      reply,
      provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "mock",
      model: process.env.OPENROUTER_API_KEY
        ? resolveOpenRouterModel(route)
        : "mock",
    };
  }

  if (
    !hasAnyOpenAiKey() &&
    !process.env.OPENROUTER_API_KEY &&
    !process.env.GEMINI_API_KEY
  ) {
    const reply = createMockReply(recentMessages, preparedPdfContext);
    await streamText(reply, onChunk);
    return { reply, provider: "mock" as const, model: "mock" };
  }

  const routeConfig = aiRouteConfig[route];
  const triedOpenAi = shouldTryOpenAiFirst(normalizedModel);
  const effortRuntime = resolveEffortRuntime(options, normalizedModel);

  if (triedOpenAi) {
    const openAiResult = await streamOpenAiGptReply(
      recentMessages,
      pdfContext,
      onChunk,
      systemPrompt,
      memory,
      options?.knowledgeContext,
      options?.documentContexts,
      options?.imageContexts,
      normalizedModel,
      effortRuntime,
    );

    if (openAiResult?.reply) {
      logAiSuccess("M-Agent provider streamed request:", {
        route,
        provider: "openai",
        model: resolveOpenAiModel(normalizedModel),
        tier: access.tier,
      });

      return {
        reply: openAiResult.reply,
        provider: "openai" as const,
        model: resolveOpenAiModel(normalizedModel),
        finishReason: openAiResult.finishReason,
      };
    }

    if (gptTestMode) {
      const reply = createOpenAiFailureReply(openAiResult?.error);

      await streamText(reply, onChunk);

      return {
        reply,
        provider: "openai" as const,
        model: resolveOpenAiModel(normalizedModel),
        fallbackEvent: "gpt_test_mode_no_fallback",
      };
    }

    console.warn("M-Agent streaming fallback from OpenAI GPT to Gemini:", {
      route,
      openAiModel: resolveOpenAiModel(normalizedModel),
      geminiModel: resolveGeminiModel("fast", "free"),
      tier: access.tier,
    });
  }

  if (
    route === "fast" ||
    route === "document" ||
    route === "smart" ||
    routeConfig.futureProvider === "gemini"
  ) {
    const geminiResult = await streamGeminiReplyWithFallback(
      recentMessages,
      pdfContext,
      onChunk,
      route,
      access.tier,
      systemPrompt,
      memory,
      options?.knowledgeContext,
      options?.documentContexts,
      options?.imageContexts,
    );

    if (geminiResult) {
      logAiSuccess("M-Agent provider streamed request:", {
        route,
        provider: "gemini",
        model: geminiResult.model,
        tier: access.tier,
      });

      return {
        reply: geminiResult.reply,
        provider: "gemini" as const,
        model: geminiResult.model,
        fallbackEvent:
          geminiResult.fallbackEvent ??
          (triedOpenAi ? "openai_to_gemini" : undefined),
        finishReason: geminiResult.finishReason,
      };
    }

    console.warn("M-Agent streaming fallback from Gemini to OpenRouter:", {
      route,
      geminiModel: resolveGeminiModel(route, access.tier),
      openRouterModel: resolveOpenRouterModel(route),
      tier: access.tier,
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    const reply = createGenericAiFallback();

    await streamText(reply, onChunk);

    return {
      reply,
      provider: "openrouter" as const,
      model: resolveOpenRouterModel(route),
      fallbackEvent: "openrouter_unavailable",
    };
  }

  const openRouterResult = await streamOpenRouterReply(
    recentMessages,
    pdfContext,
    route,
    onChunk,
    systemPrompt,
    memory,
    options?.knowledgeContext,
    options?.documentContexts,
    options?.imageContexts,
  );

  if (!openRouterResult) {
    const reply = createGenericAiFallback();
    await streamText(reply, onChunk);
    return {
      reply,
      provider: "openrouter" as const,
      model: resolveOpenRouterModel(route),
      fallbackEvent: "openrouter_empty",
    };
  }

  logAiSuccess("M-Agent provider streamed request:", {
    route,
    provider: "openrouter",
    model: resolveOpenRouterModel(route),
    tier: access.tier,
  });

  return {
    reply: openRouterResult.reply,
    provider: "openrouter" as const,
    model: resolveOpenRouterModel(route),
    fallbackEvent: "gemini_to_openrouter",
    finishReason: openRouterResult.finishReason,
  };
}
