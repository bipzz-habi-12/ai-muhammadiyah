// Anggaran context window bersama untuk client & server.
//
// Sebelum ini riwayat dipotong keras di 10 pesan terakhir & 2000 karakter per
// pesan — percakapan panjang jadi "pikun". Sekarang riwayat dipotong berdasarkan
// ANGGARAN TOKEN: kirim sebanyak mungkin pesan terbaru sampai anggaran habis.
//
// Angka token di sini adalah ESTIMASI (≈4 karakter per token), bukan hasil
// tokenizer asli — cukup akurat untuk memilih apa yang dikirim dan untuk
// indikator di UI, tapi jangan diperlakukan sebagai angka tagihan.

export const contextWindowTokens = 200_000;

// Sisakan ruang untuk jawaban model + ~7 lapis system prompt (identitas,
// prioritas konteks, penyelesaian, gaya, artifact, skill, memori).
const responseTokenReserve = 8_000;
const systemPromptTokenReserve = 4_000;

export const contextUsableTokens =
  contextWindowTokens - responseTokenReserve - systemPromptTokenReserve;

// Dokumen & knowledge base boleh memakai sebagian besar ruang, tapi jangan
// sampai menyisakan nol untuk riwayat percakapan.
export const historyTokenBudget = Math.floor(contextUsableTokens * 0.55);
export const documentTokenBudget = Math.floor(contextUsableTokens * 0.4);

// Satu pesan raksasa (mis. hasil tempel ribuan baris) tidak boleh menghabiskan
// seluruh anggaran riwayat sendirian.
export const maxSingleMessageTokens = 16_000;

const charsPerToken = 4;

export function estimateTokens(...parts: string[]) {
  const characters = parts.reduce((total, part) => total + part.length, 0);

  return Math.ceil(characters / charsPerToken);
}

export function tokensToChars(tokens: number) {
  return tokens * charsPerToken;
}

export function truncateToTokens(text: string, maxTokens: number) {
  const trimmedText = text.trim();

  if (estimateTokens(trimmedText) <= maxTokens) {
    return trimmedText;
  }

  return `${trimmedText.slice(0, tokensToChars(maxTokens))}\n[Pesan dipotong karena melebihi anggaran konteks.]`;
}

type HistoryMessage = { role: string; text: string };

/**
 * Ambil pesan TERBARU sebanyak mungkin selama masih muat di anggaran token.
 * Pesan paling baru selalu ikut walau sendirian sudah melebihi anggaran —
 * kalau tidak, permintaan user yang sedang berjalan justru hilang.
 */
export function trimHistoryToTokenBudget<T extends HistoryMessage>(
  messages: T[],
  budget = historyTokenBudget,
): T[] {
  const usable = messages.filter((message) => message.text.trim());
  const kept: T[] = [];
  let usedTokens = 0;

  for (let index = usable.length - 1; index >= 0; index -= 1) {
    const message = usable[index];
    const text = truncateToTokens(message.text, maxSingleMessageTokens);
    const messageTokens = estimateTokens(text);

    if (kept.length && usedTokens + messageTokens > budget) {
      break;
    }

    usedTokens += messageTokens;
    kept.unshift({ ...message, text });
  }

  return kept;
}

export type ContextUsage = {
  usedTokens: number;
  windowTokens: number;
  percentUsed: number;
  isNearLimit: boolean;
};

export function measureContextUsage(parts: {
  history?: HistoryMessage[];
  documentText?: string;
  knowledgeText?: string;
}): ContextUsage {
  const historyTokens = (parts.history ?? []).reduce(
    (total, message) => total + estimateTokens(message.text),
    0,
  );
  const documentTokens = estimateTokens(parts.documentText ?? "");
  const knowledgeTokens = estimateTokens(parts.knowledgeText ?? "");
  const usedTokens = historyTokens + documentTokens + knowledgeTokens;
  const percentUsed = Math.min(
    100,
    Math.round((usedTokens / contextUsableTokens) * 100),
  );

  return {
    usedTokens,
    windowTokens: contextUsableTokens,
    percentUsed,
    isNearLimit: percentUsed >= 80,
  };
}

export function formatTokenCount(tokens: number) {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}jt`;
  }

  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}rb`;
  }

  return String(tokens);
}
