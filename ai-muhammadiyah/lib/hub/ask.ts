// "Tanya Hub" backend. Grounds an answer in the ACTUAL content of the curated
// Tarjih/Muhammadiyah source pages (fetched at request time) rather than the
// model's memory, so citations point at real text. Output uses plain line
// delimiters (===JAWABAN=== etc.) for the same reason as lib/research/synthesis
// and the artifact sentinels: truncation-robust, and prose can't corrupt the
// parse the way a stray byte breaks JSON.

export type HubAnswerSource = {
  n: number; // citation number handed to the model
  title: string;
  url: string;
  tag: string | null;
  excerpt: string; // real fetched text (the grounding)
};

export type HubAnswer = {
  answer: string; // markdown, grounded, with [n] citations
  aiContext: string; // the model's OWN general knowledge, uncited (may be empty)
};

const MAX_EXCERPT_CHARS = 3500;
const FETCH_TIMEOUT_MS = 9000;

// Strip an HTML page down to readable article text. Best-effort: prefer the
// WordPress article region (tarjih.or.id is WordPress → .entry-content) when
// present, else fall back to the whole document; drop scripts/styles/tags,
// decode a few common entities, collapse whitespace, cap length.
export function extractReadableText(html: string): string {
  let work = html;
  const entry = work.match(
    /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<footer|<\/article|<div[^>]*class=["'][^"']*(?:entry-footer|post-tags|sharedaddy))/i,
  );
  if (entry) {
    work = entry[1];
  }
  return work
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#8217;|&#8216;|&#8211;|&#8212;|&#8220;|&#8221;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_EXCERPT_CHARS);
}

// Fetch a source page and return readable text, or null on any failure. Note:
// tarjih.or.id serves some pages with a 500 status header while still returning
// the full body — so we accept any response that yields enough text, rather than
// gating on response.ok.
export async function fetchSourceExcerpt(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AIMuhammadiyahHub/1.0; +https://aimuhammadiyah.my.id)",
      },
    });
    const html = await response.text();
    const text = extractReadableText(html);
    return text.length >= 200 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const SEC_ANSWER = "===JAWABAN===";
const SEC_AI_CONTEXT = "===KONTEKS_AI===";

export const HUB_ASK_SYSTEM_PROMPT = [
  "Anda asisten Muhammadiyah Hub: menjawab pertanyaan keislaman sesuai pandangan/manhaj Muhammadiyah (Majelis Tarjih).",
  "Anda diberi PERTANYAAN dan beberapa SUMBER NYATA bernomor (kutipan isi halaman resmi Tarjih/Muhammadiyah).",
  "",
  "Tulis DUA bagian, dipisahkan penanda baris persis di bawah (penanda ada di barisnya sendiri):",
  "",
  SEC_ANSWER,
  "Jawaban ringkas (2-4 paragraf markdown) BERDASARKAN sumber yang diberikan. Sitasi pakai nomor kurung siku, mis. [1] atau [2].",
  "Nyatakan sebagai pandangan Tarjih/Muhammadiyah HANYA bila didukung sumber; JANGAN mengarang isi fatwa, dalil, atau angka.",
  "Bila sumber tak cukup menjawab, katakan terus terang dan arahkan pembaca membaca rujukan. Bila TIDAK ADA sumber, kosongkan bagian ini.",
  "",
  SEC_AI_CONTEXT,
  "Konteks umum dari pengetahuan Anda sendiri yang membantu (1-2 paragraf markdown), DI LUAR sumber. JANGAN pakai sitasi [n] di sini.",
  "Tegaskan bahwa ini pengetahuan model yang perlu diverifikasi ke sumber resmi, bukan fatwa. Boleh kosong.",
  "",
  "Jawab dalam bahasa pertanyaan (default Bahasa Indonesia). Ringkas, santun, tidak menggurui. Jangan menambah teks di luar dua bagian ini.",
].join("\n");

export function buildHubAskUserPrompt(
  question: string,
  sources: HubAnswerSource[],
): string {
  const block = sources
    .map((source) =>
      [
        `[${source.n}] ${source.title}${source.tag ? ` (${source.tag})` : ""}`,
        `    ${source.url}`,
        `    Kutipan: ${source.excerpt}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    `PERTANYAAN:\n${question.trim()}`,
    "",
    sources.length > 0
      ? `SUMBER (${sources.length}):\n${block}`
      : "SUMBER: (tidak ada rujukan cocok yang bisa diambil) — kosongkan JAWABAN, isi KONTEKS_AI dari pengetahuan umum dan sarankan pengguna menelusuri direktori Hub.",
    "",
    "Susun jawaban sesuai dua penanda pada instruksi sistem.",
  ].join("\n");
}

// Slice the reply into its two delimited sections; a missing/truncated section
// doesn't break the other.
function sliceSections(text: string): { answer: string; aiContext: string } {
  const cleaned = text.replace(/```/g, "");
  const markers = [
    { key: "answer" as const, tag: SEC_ANSWER },
    { key: "aiContext" as const, tag: SEC_AI_CONTEXT },
  ];
  const found = markers
    .map((marker) => ({ ...marker, idx: cleaned.indexOf(marker.tag) }))
    .filter((marker) => marker.idx !== -1)
    .sort((a, b) => a.idx - b.idx);

  const result = { answer: "", aiContext: "" };
  for (let i = 0; i < found.length; i += 1) {
    const start = found[i].idx + found[i].tag.length;
    const end = i + 1 < found.length ? found[i + 1].idx : cleaned.length;
    result[found[i].key] = cleaned.slice(start, end).trim();
  }
  return result;
}

export function parseHubAnswer(raw: string): HubAnswer | null {
  const sections = sliceSections(raw);

  // Fallback: model ignored the markers but produced prose — treat it all as the
  // answer rather than dropping everything.
  if (!sections.answer && !sections.aiContext) {
    const body = raw.replace(/```/g, "").trim();
    if (body.length > 0 && !body.includes("===")) {
      return { answer: body, aiContext: "" };
    }
    return null;
  }

  return { answer: sections.answer, aiContext: sections.aiContext };
}
