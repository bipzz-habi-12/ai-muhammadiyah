// Protokol sentinel untuk PERTANYAAN KLARIFIKASI — "AI bertanya balik" ala
// AskUserQuestion di Claude.
//
// Keluarga marker yang sama dengan lib/artifacts.ts, lib/second-brain/parse.ts,
// dan lib/web-search.ts: blok ikut menumpang di `messages.content`, jadi TIDAK
// perlu kolom/tabel DB baru dan membuka ulang percakapan lama tetap menampilkan
// kartu pertanyaan yang sama.
//
// Kenapa marker, bukan tool `tanya_pengguna` (keputusan arsitektur, jangan
// dibalik tanpa alasan baru):
//   1. Jalur tool hanya hidup di Gemini DAN hanya untuk pesan yang lolos
//      heuristik `needsWebSearch()` — mayoritas pesan ditangani GPT dan tidak
//      akan pernah bisa bertanya. Marker jalan di SEMUA provider dan semua
//      pesan.
//   2. Executor tool berjalan di dalam satu permintaan HTTP yang harus selesai
//      sebelum respons ditutup. Tool yang "menunggu jawaban manusia" berarti
//      menggantung stream sampai timeout Vercel, atau membangun mesin
//      suspend/resume berikut penyimpanannya. Marker menutup giliran seperti
//      biasa; jawaban pengguna datang sebagai pesan berikutnya.
//
// Beda dari [[AI_MU_SOURCES]]: blok ini ditulis MODEL, bukan server. Jadi isinya
// tidak boleh dipercaya — parser di bawah memvalidasi bentuk, memotong panjang,
// dan menolak seluruh blok kalau JSON-nya rusak (lebih baik tidak ada kartu
// daripada kartu yang setengah jadi).

export type AskOption = {
  label: string;
  description: string;
};

export type AskQuestion = {
  /** Label chip pendek, mis. "Format" atau "Bahasa". */
  header: string;
  question: string;
  multiSelect: boolean;
  options: AskOption[];
};

export const maxAskQuestions = 3;
export const minAskOptions = 2;
export const maxAskOptions = 4;

const maxHeaderLength = 24;
const maxQuestionLength = 220;
const maxOptionLabelLength = 70;
const maxOptionDescriptionLength = 160;

const askOpenMarker = "[[AI_MU_ASK]]";
const askCloseMarker = "[[/AI_MU_ASK]]";
const askBlockPattern =
  /\[\[AI_MU_ASK\]\][ \t]*\r?\n?([\s\S]*?)\[\[\/AI_MU_ASK\]\]/;

function clamp(value: unknown, limit: number): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

/**
 * Header adalah label chip, bukan kalimat. Kalau model menulisnya kepanjangan,
 * chip-nya DIBUANG, bukan dipotong: potongan di tengah kata ("Informasi
 * Tambaha") terbaca seperti UI rusak, sedangkan tanpa chip pertanyaannya tetap
 * lengkap dan rapi.
 */
function normalizeHeader(value: unknown): string {
  const header = typeof value === "string" ? value.trim() : "";

  return header.length <= maxHeaderLength ? header : "";
}

function normalizeOption(value: unknown): AskOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AskOption>;
  const label = clamp(candidate.label, maxOptionLabelLength);

  if (!label) {
    return null;
  }

  return {
    label,
    description: clamp(candidate.description, maxOptionDescriptionLength),
  };
}

function normalizeQuestion(value: unknown): AskQuestion | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AskQuestion> & { options?: unknown[] };
  const question = clamp(candidate.question, maxQuestionLength);

  if (!question) {
    return null;
  }

  const options: AskOption[] = [];
  const seenLabels = new Set<string>();

  for (const rawOption of candidate.options ?? []) {
    const option = normalizeOption(rawOption);

    if (!option) {
      continue;
    }

    // Label ganda membuat pilihan tidak bisa dibedakan di UI (dan kunci React
    // bentrok), jadi dibuang lebih awal.
    const key = option.label.toLowerCase();

    if (seenLabels.has(key)) {
      continue;
    }

    seenLabels.add(key);
    options.push(option);

    if (options.length === maxAskOptions) {
      break;
    }
  }

  // Satu pilihan bukan pertanyaan — itu pernyataan. Blok seperti itu dibuang
  // supaya model tidak "bertanya" hal yang sudah ia putuskan sendiri.
  if (options.length < minAskOptions) {
    return null;
  }

  return {
    header: normalizeHeader(candidate.header),
    question,
    multiSelect: candidate.multiSelect === true,
    options,
  };
}

export function parseAskQuestions(text: string): AskQuestion[] {
  const match = text.match(askBlockPattern);

  if (!match) {
    return [];
  }

  try {
    const parsed = JSON.parse(match[1].trim()) as { questions?: unknown[] };
    const questions: AskQuestion[] = [];

    for (const rawQuestion of parsed.questions ?? []) {
      const question = normalizeQuestion(rawQuestion);

      if (question) {
        questions.push(question);
      }

      if (questions.length === maxAskQuestions) {
        break;
      }
    }

    return questions;
  } catch {
    // JSON rusak (model memotong di tengah, atau menulis prosa di dalam blok).
    // Tidak ada kartu; teksnya tetap tersembunyi oleh formatAskTextForDisplay
    // supaya pengguna tidak pernah melihat JSON mentah.
    return [];
  }
}

// Transform saat render, pola yang sama dengan formatSourcesTextForDisplay:
// blok utuh dibuang, dan ekor marker yang baru separuh ter-stream ikut
// disembunyikan supaya JSON tidak sempat berkedip di layar. Ekor di sini bisa
// dua bentuk — marker buka yang sudah lengkap (JSON-nya masih mengalir) atau
// marker buka yang sendirinya belum selesai ("[[AI_MU_A").
export function formatAskTextForDisplay(text: string): string {
  let displayText = text.replace(askBlockPattern, "");

  // Blok selalu duduk di ujung balasan, jadi sisa baris kosong sesudahnya tidak
  // pernah bermakna — dibuang supaya jawaban tidak berakhir dengan celah.
  if (displayText !== text) {
    displayText = displayText.trimEnd();
  }

  const openMarkerStart = displayText.lastIndexOf(askOpenMarker);

  if (openMarkerStart !== -1) {
    return displayText.slice(0, openMarkerStart).trimEnd();
  }

  const partialStart = displayText.lastIndexOf("[[");

  if (partialStart !== -1) {
    const tail = displayText.slice(partialStart);

    if (!tail.includes("]]") && askOpenMarker.startsWith(tail)) {
      displayText = displayText.slice(0, partialStart).trimEnd();
    }
  }

  return displayText;
}

// Transform export/share. Beda tujuan dari render: berkas .md dibaca lepas dari
// aplikasi, jadi pertanyaannya ditulis apa adanya sebagai daftar — bukan
// dihilangkan (pembaca kehilangan konteks kenapa jawabannya bercabang) dan
// bukan JSON mentah.
export function formatAskTextForExport(text: string): string {
  return text.replace(askBlockPattern, (_match, rawJson: string) => {
    const questions = parseAskQuestions(
      `${askOpenMarker}\n${rawJson}\n${askCloseMarker}`,
    );

    if (!questions.length) {
      return "";
    }

    const body = questions
      .map((question) => {
        const options = question.options
          .map((option) => `   - ${option.label}`)
          .join("\n");

        return `1. ${question.question}\n${options}`;
      })
      .join("\n");

    return `\n\n**Pertanyaan untuk pengguna:**\n${body}`;
  });
}

/**
 * Apakah balasan ini "cuma bertanya"? Dipakai server untuk MEMBEBASKAN giliran
 * itu dari meteran kuota (lihat app/api/chat/route.ts).
 *
 * Kenapa perlu: kuota M-Agent adalah meteran TOKEN, dan biayanya dihitung dari
 * seluruh riwayat + balasan — bukan per pesan. Tanpa pembebasan ini, satu
 * pertanyaan klarifikasi menagih hampir sebesar jawaban sungguhan, lalu giliran
 * berikutnya (yang benar-benar mengerjakan) menagih riwayat yang sama sekali
 * lagi. Pengguna membayar dua kali untuk satu hasil, hanya karena AI-nya
 * bertanya lebih dulu — justru menghukum perilaku yang ingin kita dorong.
 *
 * Keputusannya diambil dari TEKS BALASAN MODEL di server, bukan dari flag yang
 * dikirim browser. Klien tidak boleh bisa menyatakan "giliran ini gratis".
 */
export function isClarifyingQuestionOnlyReply(text: string): boolean {
  return parseAskQuestions(text).length > 0;
}

/**
 * Menyusun pesan pengguna dari pilihan di kartu. Jawaban dikirim sebagai pesan
 * biasa — bukan kanal khusus — supaya ia masuk riwayat, ikut terkirim ke
 * provider mana pun, dan tetap terbaca ketika percakapan dibuka lagi nanti.
 */
export function buildAskAnswerMessage(
  questions: AskQuestion[],
  answers: string[][],
): string {
  const lines = questions
    .map((question, index) => {
      const picked = (answers[index] ?? []).filter(Boolean);

      if (!picked.length) {
        return "";
      }

      const label = question.header || question.question;

      return `- ${label}: ${picked.join(", ")}`;
    })
    .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  return [
    "Jawaban untuk pertanyaanmu:",
    ...lines,
    "",
    "Lanjutkan pekerjaannya sesuai jawaban ini, tanpa bertanya lagi soal yang sama.",
  ].join("\n");
}

/** Pesan untuk tombol "Tentukan saja untukku". */
export const askSkipMessage =
  "Tidak usah bertanya dulu — pilih sendiri opsi yang paling masuk akal, sebutkan singkat asumsimu, lalu lanjutkan pekerjaannya.";
