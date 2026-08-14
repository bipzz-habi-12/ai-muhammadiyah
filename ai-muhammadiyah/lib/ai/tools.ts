import type { SupabaseClient } from "@supabase/supabase-js";
import { createKnowledgePromptContext, retrieveKnowledgeChunks } from "@/lib/knowledge";
import {
  createSecondBrainPromptContext,
  retrieveRelevantNotes,
} from "@/lib/second-brain/notes";
import type { WebSource } from "@/lib/web-search";

// Tahap 1 dari 3 subsistem "Cowork-like": TOOL CALLING.
//
// Kenapa ini yang pertama, bukan connector OAuth: connector tanpa tool calling
// hanya jadi RAG biasa (model tidak bisa memutuskan apa yang diambil), dan job
// queue tanpa tool calling tidak punya apa pun untuk dijalankan. Lapisan ini
// yang membuat dua subsistem berikutnya masuk akal — dan ia tidak butuh
// dependensi eksternal sama sekali, jadi bisa hidup hari ini.
//
// BATASAN KERAS GEMINI (diuji langsung ke API, 2026-08-14):
//   "Built-in tools ({google_search}) and Function Calling cannot be combined
//    in the same request. Please choose one to continue."  → HTTP 400
//
// Itu tabrakan langsung dengan fitur web search (Langkah 48) yang memakai
// google_search bawaan. Jalan keluarnya ada di `cari_web` di bawah: web search
// TIDAK lagi dipasang sebagai built-in tool di panggilan utama, melainkan
// dijalankan sebagai panggilan Gemini TERPISAH di dalam executor. Panggilan
// dalam itu boleh memakai google_search karena ia tidak membawa
// functionDeclarations. Hasilnya: model bisa memakai web DAN tool internal di
// giliran yang sama, sesuatu yang mustahil kalau keduanya dipasang bersamaan.
//
// Efek sampingnya justru perbaikan: `needsWebSearch()` di lib/ai/chat.ts adalah
// daftar kata kunci yang rapuh. Sebagai tool, keputusan "perlu cari web atau
// tidak" pindah ke penilaian model.

export type ToolContext = {
  supabase: SupabaseClient;
  /** Dipakai untuk log; RLS-lah yang sebenarnya membatasi data per pengguna. */
  userId: string;
};

export type ToolResult = {
  /** Teks yang dikembalikan ke model sebagai hasil pemanggilan tool. */
  text: string;
  /** Hanya diisi cari_web — dialirkan ke marker [[AI_MU_SOURCES]] yang sudah ada. */
  sources?: WebSource[];
};

type ToolParameterSchema = {
  type: "object";
  properties: Record<string, { type: string; description: string }>;
  required: string[];
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (
    args: Record<string, unknown>,
    context: ToolContext,
  ) => Promise<ToolResult>;
};

/** Batas putaran tool per giliran. Model yang bingung bisa memanggil tool
 *  berulang tanpa henti; tanpa batas ini satu pesan bisa menguras kuota dan
 *  menggantung permintaan sampai timeout Vercel. */
export const MAX_TOOL_ROUNDS = 3;

function readStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

// --- Web search sebagai tool -------------------------------------------------
// Panggilan Gemini bersarang: TANPA functionDeclarations, sehingga google_search
// bawaan boleh dipakai (lihat catatan batasan di atas). Sengaja non-streaming —
// hasilnya dikonsumsi model, bukan ditampilkan langsung ke pengguna.
async function runGroundedWebSearch(query: string): Promise<ToolResult> {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return { text: "Pencarian web tidak tersedia: GEMINI_API_KEY belum diset." };
  }

  const model = process.env.GEMINI_FLASH_MODEL ?? "gemini-2.5-flash";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: query }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
        }),
      },
    );

    if (!response.ok) {
      console.error("Tool cari_web failed:", {
        status: response.status,
        model,
      });
      return { text: `Pencarian web gagal (status ${response.status}).` };
    }

    const data = (await response.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
        groundingMetadata?: {
          groundingChunks?: { web?: { uri?: string; title?: string } }[];
        };
      }[];
    };

    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    const sources = (candidate?.groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => ({
        url: chunk.web?.uri ?? "",
        title: chunk.web?.title ?? "",
      }))
      .filter((source): source is WebSource =>
        Boolean(source.url && source.title),
      );

    if (!text) {
      return { text: "Pencarian web tidak menemukan hasil yang relevan." };
    }

    return { text, sources: sources.length ? sources : undefined };
  } catch (error) {
    console.error("Tool cari_web request failed:", error);
    return { text: "Pencarian web gagal dijalankan." };
  }
}

export const toolRegistry: ToolDefinition[] = [
  {
    name: "cari_catatan",
    description:
      "Cari catatan pribadi pengguna (Otak Kedua). Gunakan ketika pengguna bertanya tentang apa yang pernah ia catat, simpan, atau pelajari sebelumnya.",
    parameters: {
      type: "object",
      properties: {
        kueri: {
          type: "string",
          description: "Kata kunci pencarian, bukan kalimat pertanyaan utuh.",
        },
      },
      required: ["kueri"],
    },
    async execute(args, context) {
      const kueri = readStringArg(args, "kueri");

      if (!kueri) {
        return { text: "Kueri kosong." };
      }

      // forceSearch: model sudah memutuskan ingin mencari, jadi gerbang
      // heuristik bawaan retrieval dilewati (lihat lib/second-brain/notes.ts).
      const chunks = await retrieveRelevantNotes(
        context.supabase,
        kueri,
        4,
        true,
      ).catch((error) => {
        console.error("Tool cari_catatan failed:", error);
        return [];
      });

      if (!chunks.length) {
        return { text: "Tidak ada catatan pengguna yang cocok dengan kueri itu." };
      }

      return { text: createSecondBrainPromptContext(chunks) };
    },
  },
  {
    name: "cari_pengetahuan",
    description:
      "Cari Muhammadiyah Knowledge Base (korpus resmi yang dikurasi: manhaj, Tarjih, pendidikan). Gunakan untuk pertanyaan yang perlu rujukan Muhammadiyah.",
    parameters: {
      type: "object",
      properties: {
        kueri: {
          type: "string",
          description: "Kata kunci pencarian, bukan kalimat pertanyaan utuh.",
        },
      },
      required: ["kueri"],
    },
    async execute(args, context) {
      const kueri = readStringArg(args, "kueri");

      if (!kueri) {
        return { text: "Kueri kosong." };
      }

      const chunks = await retrieveKnowledgeChunks(
        context.supabase,
        kueri,
        4,
        true,
      ).catch((error) => {
        console.error("Tool cari_pengetahuan failed:", error);
        return [];
      });

      if (!chunks.length) {
        return {
          text: "Tidak ada isi Knowledge Base yang cocok dengan kueri itu.",
        };
      }

      return { text: createKnowledgePromptContext(chunks) };
    },
  },
  {
    name: "cari_web",
    description:
      "Cari informasi terkini di web (berita, harga, jadwal, peristiwa terbaru, apa pun yang berubah seiring waktu). Gunakan bila jawabannya bisa jadi sudah usang di pengetahuan internalmu.",
    parameters: {
      type: "object",
      properties: {
        kueri: {
          type: "string",
          description: "Pertanyaan pencarian dalam bahasa alami.",
        },
      },
      required: ["kueri"],
    },
    async execute(args) {
      const kueri = readStringArg(args, "kueri");

      if (!kueri) {
        return { text: "Kueri kosong." };
      }

      return runGroundedWebSearch(kueri);
    },
  },
];

export function findTool(name: string): ToolDefinition | undefined {
  return toolRegistry.find((tool) => tool.name === name);
}

/** Bentuk `tools` untuk Gemini generateContent/streamGenerateContent. */
export function toGeminiToolDeclarations() {
  return [
    {
      functionDeclarations: toolRegistry.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    },
  ];
}

/**
 * Jalankan satu panggilan tool dengan aman. TIDAK PERNAH melempar: kegagalan
 * tool harus kembali ke model sebagai teks hasil supaya model bisa menjelaskan
 * atau mencoba jalan lain — melempar akan mematikan seluruh jawaban.
 */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const tool = findTool(name);

  if (!tool) {
    return { text: `Tool "${name}" tidak dikenal.` };
  }

  try {
    return await tool.execute(args, context);
  } catch (error) {
    console.error("Tool execution failed:", { name, error });
    return { text: `Tool "${name}" gagal dijalankan.` };
  }
}
