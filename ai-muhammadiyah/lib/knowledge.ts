import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateTokenUsage } from "./usage/limits";

export type KnowledgeSource = {
  id: string;
  title: string;
  category: string;
  fileType: string;
  originalFileName: string | null;
  status: "active" | "draft" | "archived";
  chunkCount: number;
  createdAt: string;
};

export type KnowledgeChunk = {
  sourceId: string;
  sourceTitle: string;
  category: string;
  chunkOrder: number;
  content: string;
};

type KnowledgeSourceRow = {
  id: string;
  title: string;
  category: string;
  file_type: string;
  original_file_name: string | null;
  status: "active" | "draft" | "archived";
  chunk_count: number | null;
  created_at: string;
};

type KnowledgeSearchRow = {
  source_id: string;
  source_title: string;
  category: string;
  chunk_order: number;
  content: string;
};

const maxChunkCharacters = 1200;
const chunkOverlapCharacters = 160;
const maxKnowledgeContextCharacters = 4200;

const knowledgeIntentWords = [
  "muhammadiyah",
  "aisyiyah",
  "persyarikatan",
  "tarjih",
  "himpunan putusan tarjih",
  "hpt",
  "al islam",
  "kemuhammadiyahan",
  "ismuba",
  "pendidikan muhammadiyah",
  "sekolah muhammadiyah",
  "madrasah",
  "kurikulum",
  "pendidikan",
  "akhlak",
  "fiqh",
  "fikih",
  "ibadah",
  "fatwa",
  "dakwah",
  "organisasi otonom",
  "ortom",
  "ipm",
  "tapak suci",
  "hizbul wathan",
];

function mapKnowledgeSource(row: KnowledgeSourceRow): KnowledgeSource {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    fileType: row.file_type,
    originalFileName: row.original_file_name,
    status: row.status,
    chunkCount: row.chunk_count ?? 0,
    createdAt: row.created_at,
  };
}

export function isKnowledgeQuestion(question: string) {
  const normalizedQuestion = question.toLowerCase();

  return knowledgeIntentWords.some((word) => normalizedQuestion.includes(word));
}

export function splitTextIntoKnowledgeChunks(text: string) {
  const paragraphs = text
    .replace(/\r/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const candidate = currentChunk
      ? `${currentChunk}\n\n${paragraph}`
      : paragraph;

    if (candidate.length <= maxChunkCharacters) {
      currentChunk = candidate;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    if (paragraph.length <= maxChunkCharacters) {
      currentChunk = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += maxChunkCharacters) {
      const piece = paragraph.slice(index, index + maxChunkCharacters).trim();

      if (piece) {
        chunks.push(piece);
      }
    }

    currentChunk = "";
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.map((chunk, index) => {
    if (index === 0) {
      return chunk;
    }

    const previousTail = chunks[index - 1].slice(-chunkOverlapCharacters).trim();

    return previousTail ? `${previousTail}\n\n${chunk}` : chunk;
  });
}

export async function listKnowledgeSources(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("knowledge_sources")
    .select(
      "id,title,category,file_type,original_file_name,status,chunk_count,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as KnowledgeSourceRow[]).map(mapKnowledgeSource);
}

export async function retrieveKnowledgeChunks(
  supabase: SupabaseClient,
  question: string,
  limit = 4,
) {
  if (!isKnowledgeQuestion(question)) {
    return [];
  }

  const { data, error } = await supabase.rpc("search_knowledge_chunks", {
    p_query: question,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as KnowledgeSearchRow[]).map((row) => ({
    sourceId: row.source_id,
    sourceTitle: row.source_title,
    category: row.category,
    chunkOrder: row.chunk_order,
    content: row.content,
  }));
}

export function createKnowledgePromptContext(chunks: KnowledgeChunk[]) {
  if (!chunks.length) {
    return "";
  }

  const context = chunks
    .map((chunk) =>
      [
        `[${chunk.sourceTitle}, chunk ${chunk.chunkOrder + 1}, category: ${chunk.category}]`,
        chunk.content,
      ].join("\n"),
    )
    .join("\n\n---\n\n")
    .slice(0, maxKnowledgeContextCharacters);

  return [
    "KNOWLEDGE BASE CONTEXT:",
    "Use this internal Muhammadiyah/education context when it is relevant to the user's question.",
    "If you use it, include concise citations in the answer as source title + chunk number, for example: (Source: Pedoman ISMUBA, chunk 2).",
    "If the answer is not supported by this context, say what is not found and answer cautiously from general knowledge only when appropriate.",
    "",
    context,
  ].join("\n");
}

export function estimateKnowledgeUploadTokens(text: string) {
  return estimateTokenUsage(text);
}
