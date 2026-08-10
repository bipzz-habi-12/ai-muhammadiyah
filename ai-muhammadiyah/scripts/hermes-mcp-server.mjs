#!/usr/bin/env node
// MCP server "Otak Kedua" untuk Hermes Agent (Langkah 41).
//
// Hermes Agent adalah agen CLI yang berjalan DI MESIN PENGGUNA dan bisa
// memanggil MCP server sebagai subprocess. Skrip ini menjadikan catatan
// AI Muhammadiyah sebagai alat yang bisa dipakai Hermes: mencari, membaca,
// dan menulis catatan — sehingga Hermes benar-benar berada di pusat seperti
// pada rancangan, dengan Logseq di satu sisi dan Otak Kedua di sisi lain.
//
// Transport: stdio, JSON-RPC 2.0 dengan pesan dipisah baris baru.
//
// ATURAN MUTLAK: stdout HANYA boleh berisi pesan JSON-RPC. Satu baris log
// nyasar ke stdout akan merusak seluruh sesi karena klien mem-parse tiap baris
// sebagai pesan protokol. Semua diagnostik WAJIB ke stderr.
//
// Tanpa dependensi: Node 18+ saja.
//
// Pemasangan di ~/.hermes/config.yaml:
//
//   mcp_servers:
//     otak_kedua:
//       command: "node"
//       args: ["D:/path/ke/scripts/hermes-mcp-server.mjs"]
//       env:
//         AIMU_SYNC_TOKEN: "${env:AIMU_SYNC_TOKEN}"

import { createHash } from "node:crypto";
import { createInterface } from "node:readline";

const token = process.env.AIMU_SYNC_TOKEN?.trim();
const apiBase = (
  process.env.AIMU_SYNC_API ?? "https://aimuhammadiyah.my.id"
).replace(/\/+$/, "");

const log = (message) => process.stderr.write(`[otak-kedua] ${message}\n`);

if (!token) {
  log("AIMU_SYNC_TOKEN belum diisi. Buat token di Library > Catatan > Perangkat tersambung.");
  process.exit(1);
}

const send = (message) => {
  process.stdout.write(`${JSON.stringify(message)}\n`);
};

const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const replyError = (id, code, message) =>
  send({ jsonrpc: "2.0", id, error: { code, message } });

/** Hasil alat MCP selalu berupa blok konten; teks biasa sudah cukup di sini. */
const textResult = (text, isError = false) => ({
  content: [{ type: "text", text }],
  ...(isError ? { isError: true } : {}),
});

async function callApi(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? `Permintaan gagal (${response.status})`);
  }

  return payload;
}

const tools = [
  {
    name: "search_notes",
    description:
      "Cari catatan pribadi pengguna di Otak Kedua AI Muhammadiyah. Memakai pencarian gabungan makna dan kata kunci, jadi pertanyaan bebas pun bisa. Pakai ini SEBELUM menjawab pertanyaan yang mungkin sudah pernah dicatat pengguna.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Apa yang dicari." },
        limit: {
          type: "number",
          description: "Jumlah potongan hasil (1-20, bawaan 6).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_note",
    description:
      "Ambil satu catatan lengkap berdasarkan judul persis, beserta daftar [[tautan]] yang ada di dalamnya.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Judul catatan persis." },
      },
      required: ["title"],
    },
  },
  {
    name: "recent_notes",
    description:
      "Daftar catatan yang terakhir diperbarui. Berguna untuk mengetahui apa yang sedang dikerjakan pengguna belakangan ini.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Jumlah catatan (1-20, bawaan 6)." },
      },
    },
  },
  {
    name: "save_note",
    description:
      "Simpan catatan baru atau perbarui yang sudah ada berdasarkan judul. Tulis isinya agar tetap bermakna berbulan-bulan kemudian tanpa konteks percakapan ini. Tautkan konsep terkait dengan [[Judul Catatan Lain]] ala Logseq.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Judul singkat, spesifik, dan bisa dipakai ulang.",
        },
        content: { type: "string", description: "Isi catatan dalam Markdown." },
      },
      required: ["title", "content"],
    },
  },
];

async function runTool(name, args) {
  if (name === "search_notes") {
    const payload = await callApi("/api/notes/sync/query", {
      mode: "search",
      query: args.query,
      limit: args.limit,
    });
    const results = payload.results ?? [];

    if (!results.length) {
      return textResult("Tidak ada catatan yang cocok.");
    }

    return textResult(
      results
        .map((row) => `## ${row.note_title}\n${row.content}`)
        .join("\n\n---\n\n"),
    );
  }

  if (name === "get_note") {
    const payload = await callApi("/api/notes/sync/query", {
      mode: "get",
      title: args.title,
    });
    const links = (payload.links ?? [])
      .map((link) => link.target_title)
      .join(", ");

    return textResult(
      `# ${payload.note.title}\n\n${payload.note.content}` +
        (links ? `\n\nMenautkan ke: ${links}` : ""),
    );
  }

  if (name === "recent_notes") {
    const payload = await callApi("/api/notes/sync/query", {
      mode: "recent",
      limit: args.limit,
    });
    const notes = payload.notes ?? [];

    if (!notes.length) {
      return textResult("Belum ada catatan.");
    }

    return textResult(
      notes
        .map((note) => `- ${note.title} (diperbarui ${note.updated_at})`)
        .join("\n"),
    );
  }

  if (name === "save_note") {
    const title = String(args.title ?? "").trim();
    const content = String(args.content ?? "").trim();

    if (!title || !content) {
      return textResult("title dan content wajib diisi.", true);
    }

    // Isi dikirim MENTAH dengan properti `title::` di depan; server yang
    // menerjemahkan formatnya. Menyalin logika konversi ke sini akan membuat
    // salinan kedua yang lambat laun menyimpang dari milik server.
    const raw = `title:: ${title}\n\n${content}\n`;
    const payload = await callApi("/api/notes/sync/push", {
      // eventId diturunkan dari isi, bukan acak: kalau jaringan putus setelah
      // server menyimpan tapi sebelum balasannya sampai, percobaan ulang yang
      // identik dikenali sebagai duplikat alih-alih tersimpan dua kali.
      eventId: createHash("sha256")
        .update(`${title}\u0000${content}`, "utf8")
        .digest("hex"),
      items: [
        {
          fileName: `${title.replace(/\//g, "___")}.md`,
          raw,
          clientUpdatedAt: new Date().toISOString(),
          // Ditulis agen, bukan diimpor dari Logseq — supaya badge di Library
          // jujur menyebut asalnya.
          source: "ai",
        },
      ],
    });

    if (payload.duplicate) {
      return textResult(`Catatan "${title}" sudah tersimpan persis seperti ini.`);
    }

    if (payload.conflicts?.length) {
      return textResult(
        `Catatan "${title}" TIDAK disimpan: versi di server lebih baru. Baca dulu dengan get_note, gabungkan, lalu simpan lagi.`,
        true,
      );
    }

    return textResult(`Catatan "${title}" tersimpan.`);
  }

  return textResult(`Alat tidak dikenal: ${name}`, true);
}

async function handle(message) {
  const { id, method, params } = message;

  // Notifikasi (tanpa id) tidak boleh dibalas sama sekali.
  if (id === undefined || id === null) {
    return;
  }

  if (method === "initialize") {
    reply(id, {
      // Mengikuti versi yang diminta klien bila ada — server ini tidak memakai
      // fitur khusus versi, jadi menolak karena beda versi hanya merugikan.
      protocolVersion: params?.protocolVersion ?? "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "otak-kedua", version: "1.0.0" },
    });
    return;
  }

  if (method === "ping") {
    reply(id, {});
    return;
  }

  if (method === "tools/list") {
    reply(id, { tools });
    return;
  }

  if (method === "tools/call") {
    try {
      reply(id, await runTool(params?.name, params?.arguments ?? {}));
    } catch (error) {
      // Kegagalan alat dilaporkan sebagai HASIL ber-isError, bukan error
      // protokol: dengan begitu agen bisa membaca sebabnya dan mencoba cara
      // lain, alih-alih sesinya putus.
      reply(id, textResult(`Gagal: ${error.message}`, true));
    }
    return;
  }

  replyError(id, -32601, `Metode tidak dikenal: ${method}`);
}

const rl = createInterface({ input: process.stdin });

rl.on("line", (line) => {
  const trimmed = line.trim();

  if (!trimmed) {
    return;
  }

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    log(`baris bukan JSON, dilewati: ${trimmed.slice(0, 80)}`);
    return;
  }

  handle(message).catch((error) => {
    log(`gagal menangani pesan: ${error.message}`);

    if (message?.id !== undefined && message?.id !== null) {
      replyError(message.id, -32603, error.message);
    }
  });
});

log(`siap — ${apiBase}`);
