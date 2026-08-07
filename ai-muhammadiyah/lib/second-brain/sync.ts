import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. Autentikasi jembatan sinkronisasi lokal (Langkah 40 Tahap C).
// Jangan pernah diimpor dari komponen client.
//
// Agen lokal tidak punya browser, jadi tidak ada sesi Supabase untuk dipakai.
// Autentikasinya memakai token perangkat pada header Authorization — pola yang
// sama dengan webhook Stripe, yang juga bekerja tanpa sesi.

/**
 * Awalan yang bisa dicari. Kalau token bocor ke log, riwayat shell, atau repo
 * publik, pemindai rahasia (GitHub secret scanning dan sejenisnya) punya pola
 * yang bisa dikenali — token acak tanpa awalan tidak terlihat oleh siapa pun.
 */
const tokenPrefix = "aimu_sync_";

/** 32 byte acak = 256 bit entropi; tidak mungkin ditebak. */
const tokenBytes = 32;

/**
 * Batas kiriman per permintaan. Tiap catatan yang masuk memicu satu panggilan
 * embedding, jadi angkanya ditentukan oleh `maxDuration = 60`, bukan oleh
 * ukuran payload. 25 catatan ~ 10-15 detik; agen mengirim bergelombang.
 */
export const maxSyncPushItems = 25;
export const maxSyncPullItems = 200;

export function generateDeviceToken() {
  const token = `${tokenPrefix}${randomBytes(tokenBytes).toString("base64url")}`;

  return { token, tokenHash: hashDeviceToken(token) };
}

export function hashDeviceToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function extractBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  return token && token.startsWith(tokenPrefix) ? token : null;
}

export type SyncDevice = { deviceId: string; userId: string };

/**
 * Memvalidasi token perangkat dan mengembalikan pemiliknya.
 *
 * Pencarian dilakukan lewat HASH-nya, jadi tidak ada pembandingan rahasia
 * beruntun yang bisa dibocorkan lewat waktu. `timingSafeEqual` tetap dipakai
 * pada perbandingan terakhir sebagai kebiasaan yang benar.
 *
 * `supabase` WAJIB klien service role: tabel perangkat tertutup bagi peran
 * anon/authenticated, dan pada titik ini memang belum ada identitas pengguna
 * untuk dijadikan dasar RLS — identitas itu justru hasil dari fungsi ini.
 */
export async function authenticateSyncDevice(
  supabase: SupabaseClient,
  request: Request,
): Promise<SyncDevice | null> {
  const token = extractBearerToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = hashDeviceToken(token);

  const { data, error } = await supabase
    .from("note_sync_devices")
    .select("id,user_id,token_hash,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data || data.revoked_at) {
    return null;
  }

  const presented = Buffer.from(tokenHash, "utf8");
  const stored = Buffer.from(data.token_hash as string, "utf8");

  if (
    presented.length !== stored.length ||
    !timingSafeEqual(presented, stored)
  ) {
    return null;
  }

  // Menandai aktivitas terakhir supaya pengguna bisa mengenali perangkat mana
  // yang masih hidup saat memutuskan hendak mencabut yang mana.
  await supabase
    .from("note_sync_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);

  return { deviceId: data.id as string, userId: data.user_id as string };
}

/**
 * Kursor tarikan: `<updated_at ISO>|<id>`.
 *
 * Memakai stempel waktu saja TIDAK cukup — dua catatan bisa punya `updated_at`
 * yang sama persis (impor satu batch), dan pemotongan di tengah pasangan itu
 * akan membuat satu catatan terlewat selamanya. Pasangan (waktu, id) membuat
 * urutannya benar-benar total.
 */
export function encodeSyncCursor(updatedAt: string, id: string) {
  return `${updatedAt}|${id}`;
}

export function decodeSyncCursor(cursor: string | null) {
  if (!cursor) {
    return null;
  }

  const separator = cursor.lastIndexOf("|");

  if (separator === -1) {
    return null;
  }

  const updatedAt = cursor.slice(0, separator);
  const id = cursor.slice(separator + 1);
  const timestamp = Date.parse(updatedAt);

  if (Number.isNaN(timestamp) || !id) {
    return null;
  }

  return { updatedAt, id };
}
