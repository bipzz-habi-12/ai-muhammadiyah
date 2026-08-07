#!/usr/bin/env node
// Jembatan Otak Kedua <-> Logseq (Langkah 40 Tahap C).
//
// Dijalankan DI MESIN PENGGUNA, bukan di server. Arah koneksinya selalu KELUAR
// dari sini menuju AI Muhammadiyah — server di Vercel tidak bisa menjangkau
// localhost, dan HTTP API Logseq memblokir CORS. Skrip ini menyentuh berkas
// markdown graf secara langsung, jadi tidak butuh API Logseq sama sekali dan
// tetap bekerja walau Logseq sedang tertutup.
//
// Tanpa dependensi: hanya Node 18+ (fetch bawaan).
//
// Pemakaian:
//   node logseq-bridge.mjs --graph "C:/Users/kamu/Logseq/graf-saya"
//
// Token dibaca dari env AIMU_SYNC_TOKEN (buat di Pengaturan > Perangkat
// tersambung). JANGAN menaruh token langsung di argumen perintah — argumen
// terlihat di daftar proses dan tersimpan di riwayat shell.
//
//   Windows PowerShell : $env:AIMU_SYNC_TOKEN="aimu_sync_..."
//   macOS / Linux      : export AIMU_SYNC_TOKEN="aimu_sync_..."

import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
}

const graphPath = readArg("graph");
const apiBase = (
  readArg("api") ??
  process.env.AIMU_SYNC_API ??
  "https://aimuhammadiyah.my.id"
).replace(/\/+$/, "");
const token = process.env.AIMU_SYNC_TOKEN?.trim();
const intervalSeconds = Number(readArg("interval", "0")) || 0;
const isDryRun = args.includes("--dry-run");

if (!graphPath) {
  console.error(
    'Wajib: --graph "<path folder graf Logseq>"\n' +
      "Contoh: node logseq-bridge.mjs --graph \"C:/Users/kamu/Logseq/graf-saya\"",
  );
  process.exit(1);
}

if (!token) {
  console.error(
    "Wajib: env AIMU_SYNC_TOKEN.\n" +
      "Buat token di AI Muhammadiyah > Library > Catatan > Perangkat tersambung.",
  );
  process.exit(1);
}

const pagesDir = join(resolve(graphPath), "pages");
// Berkas status disimpan DI DALAM folder graf supaya tiap graf punya posisi
// sinkronisasinya sendiri; memakai satu berkas global akan mencampur graf yang
// berbeda dan membuat kursor saling menimpa.
const statePath = join(resolve(graphPath), ".aimu-sync.json");

function loadState() {
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return { cursor: null, hashes: {} };
  }
}

function saveState(state) {
  if (isDryRun) {
    return;
  }

  writeFileSync(statePath, JSON.stringify(state, null, 1), "utf8");
}

const hashOf = (text) => createHash("sha256").update(text, "utf8").digest("hex");

async function callApi(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `${path} -> ${response.status} ${payload.error ?? "gagal"}`,
    );
  }

  return payload;
}

function listLocalPages() {
  try {
    mkdirSync(pagesDir, { recursive: true });
  } catch {
    // Folder sudah ada.
  }

  return readdirSync(pagesDir)
    .filter((name) => name.toLowerCase().endsWith(".md"))
    // Salinan penyelamat hasil konflik adalah milik pengguna untuk dibaca dan
    // dihapus sendiri — bukan halaman baru. Tanpa pengecualian ini, tiap
    // konflik justru melahirkan catatan baru di server.
    .filter((name) => !name.toLowerCase().endsWith(".server.md"))
    .map((name) => {
      const fullPath = join(pagesDir, name);

      return {
        fileName: name,
        raw: readFileSync(fullPath, "utf8"),
        modifiedAt: statSync(fullPath).mtime.toISOString(),
      };
    });
}

/**
 * Berkas yang pernah kita kenal tapi kini hilang dari disk = dihapus pengguna
 * di Logseq.
 *
 * WAJIB dihitung SEBELUM tarikan. Kalau tidak, tarikan akan menulis ulang
 * berkas itu (server belum tahu ia dihapus), tahap kirim melihat berkasnya ada
 * dan isinya cocok, lalu penghapusannya TIDAK PERNAH terkirim — halaman yang
 * dihapus pengguna hidup kembali setiap kali sinkronisasi.
 */
function collectLocalDeletions(state) {
  const present = new Set(listLocalPages().map((file) => file.fileName));

  return new Set(
    Object.keys(state.hashes).filter((fileName) => !present.has(fileName)),
  );
}

/** Server -> berkas lokal. */
async function pull(state, locallyDeleted) {
  let cursor = state.cursor;
  let deletionCursor = state.deletionCursor ?? null;
  let written = 0;
  let removed = 0;
  const rescued = [];

  for (let page = 0; page < 50; page += 1) {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (deletionCursor) params.set("deletionCursor", deletionCursor);
    const query = params.toString() ? `?${params}` : "";
    const result = await callApi(`/api/notes/sync/pull${query}`);

    for (const note of result.notes ?? []) {
      // Dihapus pengguna di sini; penghapusannya menyusul pada tahap kirim.
      // Menulisnya kembali sekarang akan membatalkan niat pengguna.
      if (locallyDeleted.has(note.fileName)) {
        continue;
      }

      const target = join(pagesDir, note.fileName);
      const existing = (() => {
        try {
          return readFileSync(target, "utf8");
        } catch {
          return null;
        }
      })();

      if (existing === note.body) {
        // Sudah sama — catat hash-nya supaya tidak terkirim balik sebagai
        // "perubahan lokal" pada putaran berikutnya.
        state.hashes[note.fileName] = hashOf(note.body);
        continue;
      }

      // `hashes` menyimpan isi yang TERAKHIR DISEPAKATI kedua sisi, jadi satu
      // peta ini cukup untuk membedakan tiga keadaan di bawah.
      const agreed = state.hashes[note.fileName];
      const isServerChanged = agreed !== hashOf(note.body);
      const isLocallyModified = existing !== null && agreed !== hashOf(existing);

      // Server tidak benar-benar berubah — ini gema kiriman kita sendiri yang
      // kembali karena kursor tertinggal. Menimpanya di sini akan membuang
      // suntingan lokal yang belum sempat terkirim.
      if (!isServerChanged) {
        continue;
      }

      // Berubah di KEDUA sisi = konflik sungguhan. Menimpanya begitu saja akan
      // menghapus tulisan pengguna tanpa jejak, jadi versi server disimpan di
      // sebelahnya dan berkas lokal dibiarkan utuh supaya bisa dibandingkan.

      if (isLocallyModified) {
        const sidecar = note.fileName.replace(/\.md$/i, ".server.md");

        if (!isDryRun) {
          writeFileSync(join(pagesDir, sidecar), note.body, "utf8");
        }

        rescued.push({ fileName: note.fileName, sidecar });
        console.log(`  KONFLIK: ${note.fileName} -> versi server disimpan sebagai ${sidecar}`);
        continue;
      }

      if (!isDryRun) {
        mkdirSync(pagesDir, { recursive: true });
        writeFileSync(target, note.body, "utf8");
      }

      state.hashes[note.fileName] = hashOf(note.body);
      written += 1;
      console.log(`  turun: ${note.fileName}`);
    }

    for (const deletion of result.deletions ?? []) {
      const target = join(pagesDir, deletion.fileName);

      try {
        if (!isDryRun) {
          rmSync(target);
        }

        delete state.hashes[deletion.fileName];
        removed += 1;
        console.log(`  hapus lokal: ${deletion.fileName}`);
      } catch {
        // Sudah tidak ada di sini; tidak apa-apa.
      }
    }

    if (result.cursor) {
      cursor = result.cursor;
    }

    if (result.deletionCursor) {
      deletionCursor = result.deletionCursor;
    }

    if (!result.hasMore) {
      break;
    }
  }

  state.cursor = cursor;
  state.deletionCursor = deletionCursor;
  return { written, removed, rescued };
}

/** Berkas lokal -> server. */
async function push(state) {
  const local = listLocalPages();
  const seen = new Set();
  const changed = [];

  for (const file of local) {
    seen.add(file.fileName);
    const hash = hashOf(file.raw);

    if (state.hashes[file.fileName] === hash) {
      continue;
    }

    changed.push({
      fileName: file.fileName,
      raw: file.raw,
      clientUpdatedAt: file.modifiedAt,
      hash,
    });
  }

  // Berkas yang pernah kita kenal tapi kini hilang = dihapus pengguna di
  // Logseq. Tanpa bagian ini, penghapusan lokal tidak akan pernah menyebar
  // dan tarikan berikutnya menghidupkan halamannya kembali.
  const deletions = Object.keys(state.hashes)
    .filter((fileName) => !seen.has(fileName))
    .map((fileName) => ({ fileName, raw: "", deleted: true }));

  const queue = [...changed, ...deletions];

  if (!queue.length) {
    return { applied: 0, deleted: 0, conflicts: [] };
  }

  let applied = 0;
  let deleted = 0;
  const conflicts = [];
  const batchSize = 25;

  for (let start = 0; start < queue.length; start += batchSize) {
    const batch = queue.slice(start, start + batchSize);

    if (isDryRun) {
      for (const item of batch) {
        console.log(`  naik (dry-run): ${item.fileName}${item.deleted ? " [hapus]" : ""}`);
      }
      continue;
    }

    const result = await callApi("/api/notes/sync/push", {
      method: "POST",
      body: JSON.stringify({
        // eventId membuat pengiriman ulang aman: kalau jaringan putus setelah
        // server menerapkan batch tapi sebelum kita tahu, percobaan ulang
        // dengan id yang sama akan ditolak sebagai duplikat, bukan diterapkan
        // dua kali.
        eventId: randomUUID(),
        items: batch.map(({ fileName, raw, clientUpdatedAt, deleted: isDeleted }) => ({
          fileName,
          raw,
          clientUpdatedAt,
          deleted: Boolean(isDeleted),
        })),
      }),
    });

    applied += result.applied ?? 0;
    deleted += result.deleted ?? 0;
    conflicts.push(...(result.conflicts ?? []));

    // Server mengembalikan bentuk KANONIK tiap catatan yang diterima. Berkas
    // lokal ditulis ulang ke bentuk itu supaya kedua sisi menyimpan byte yang
    // sama persis — inilah yang mencegah tarikan berikutnya salah membaca
    // hasil normalisasi server sebagai "perubahan server".
    const canonicalByName = new Map(
      (result.canonical ?? []).map((entry) => [entry.fileName, entry.body]),
    );

    // Hash hanya dicatat SETELAH server mengonfirmasi. Kalau dicatat lebih
    // awal lalu pengiriman gagal, perubahan itu akan dianggap sudah terkirim
    // dan hilang diam-diam.
    for (const item of batch) {
      if (item.deleted) {
        delete state.hashes[item.fileName];
        continue;
      }

      if (conflicts.includes(item.fileName)) {
        continue;
      }

      const canonicalBody = canonicalByName.get(item.fileName);

      if (canonicalBody === undefined) {
        state.hashes[item.fileName] = item.hash;
        continue;
      }

      if (!isDryRun && canonicalBody !== item.raw) {
        writeFileSync(join(pagesDir, item.fileName), canonicalBody, "utf8");
      }

      state.hashes[item.fileName] = hashOf(canonicalBody);
    }
  }

  return { applied, deleted, conflicts };
}

async function runOnce() {
  const state = loadState();

  console.log(`\n[${new Date().toLocaleTimeString()}] sinkronisasi…`);

  // Urutannya penting: catat dulu apa yang dihapus pengguna secara lokal,
  // baru tarik (melewati berkas-berkas itu), baru kirim. Menarik lebih dulu
  // tanpa langkah pertama akan menghidupkan kembali halaman yang dihapus.
  const locallyDeleted = collectLocalDeletions(state);
  const pulled = await pull(state, locallyDeleted);
  const pushed = await push(state);

  saveState(state);

  console.log(
    `selesai — turun ${pulled.written}, hapus lokal ${pulled.removed}, ` +
      `naik ${pushed.applied}, hapus server ${pushed.deleted}`,
  );

  if (pulled.rescued.length) {
    console.log(
      `PERHATIAN: ${pulled.rescued.length} catatan berubah di kedua sisi. ` +
        `Berkas lokalmu TIDAK ditimpa; versi server disimpan berdampingan:\n` +
        pulled.rescued
          .map((item) => `  - ${item.fileName}  vs  ${item.sidecar}`)
          .join("\n") +
        `\nBandingkan keduanya, gabungkan ke berkas aslinya, lalu hapus berkas .server.md.`,
    );
  }

  if (pushed.conflicts.length) {
    console.log(
      `PERHATIAN: ${pushed.conflicts.length} catatan tidak terkirim karena ` +
        `versi di server lebih baru: ${pushed.conflicts.join(", ")}\n` +
        `Buka catatan itu di web, gabungkan manual, lalu simpan.`,
    );
  }
}

try {
  await runOnce();

  if (intervalSeconds > 0) {
    console.log(`\nMengulang tiap ${intervalSeconds} detik. Ctrl+C untuk berhenti.`);
    setInterval(() => {
      runOnce().catch((error) => console.error("gagal:", error.message));
    }, intervalSeconds * 1000);
  }
} catch (error) {
  console.error("gagal:", error.message);
  process.exit(1);
}
