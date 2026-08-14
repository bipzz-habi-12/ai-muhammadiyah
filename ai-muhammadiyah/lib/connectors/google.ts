import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret } from "./crypto";

// Connector Google — SERVER ONLY. Menyentuh service role dan token OAuth.
//
// SCOPE SENGAJA DIBATASI KE drive.file (diputuskan setelah memeriksa aturan
// verifikasi Google, 2026-08-14):
//   * drive.file  = NON-SENSITIF. Tanpa verifikasi, tanpa audit CASA, tanpa
//     batas 100 pengguna, dan tanpa masalah refresh token hangus 7 hari.
//     Aksesnya hanya ke berkas yang DIBUAT aplikasi ini atau yang dipilih
//     sendiri oleh pengguna — bukan seluruh isi Drive.
//   * drive.readonly / drive penuh / Gmail = RESTRICTED. Wajib asesmen
//     keamanan CASA tahunan (~$540/tahun) lewat asesor terdaftar Google.
//
// JANGAN menambah scope restricted ke daftar di bawah tanpa keputusan sadar:
// begitu satu scope restricted ikut diminta, SELURUH aplikasi jatuh ke rezim
// verifikasi itu — termasuk batas 100 pengguna dan token hangus tiap 7 hari
// selama consent screen masih berstatus Testing.

export const googleScopes = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

const googleAuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const googleRevokeEndpoint = "https://oauth2.google.com/revoke";

export type GoogleConnection = {
  accessToken: string;
  accountEmail: string | null;
};

export function isGoogleConnectorConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function getGoogleRedirectUri() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return `${base}/api/connectors/google/callback`;
}

export function buildGoogleConsentUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: googleScopes.join(" "),
    // offline + consent: tanpa keduanya Google TIDAK mengirim refresh token
    // pada otorisasi ulang, sehingga koneksi mati diam-diam setelah access
    // token pertama kedaluwarsa (±1 jam).
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `${googleAuthEndpoint}?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function requestGoogleToken(
  body: Record<string, string>,
): Promise<GoogleTokenResponse | null> {
  try {
    const response = await fetch(googleTokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

    const data = (await response.json()) as GoogleTokenResponse;

    if (!response.ok || data.error) {
      console.error("Google token request failed:", {
        status: response.status,
        error: data.error,
        description: data.error_description,
      });
      return null;
    }

    return data;
  } catch (error) {
    console.error("Google token request threw:", error);
    return null;
  }
}

async function fetchGoogleAccountEmail(accessToken: string) {
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

/** Tukar authorization code jadi token lalu simpan. Dipanggil callback OAuth. */
export async function exchangeAndStoreGoogleTokens(
  code: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tokens = await requestGoogleToken({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: getGoogleRedirectUri(),
    grant_type: "authorization_code",
  });

  if (!tokens?.access_token) {
    return { ok: false, error: "token_exchange_failed" };
  }

  if (!tokens.refresh_token) {
    // Terjadi bila pengguna pernah mengizinkan dan Google memutuskan tidak
    // perlu mengirim ulang. prompt=consent seharusnya mencegahnya, tapi kalau
    // tetap terjadi, koneksi tanpa refresh token akan mati dalam sejam —
    // lebih baik tolak sekarang daripada gagal misterius nanti.
    return { ok: false, error: "no_refresh_token" };
  }

  const accountEmail = await fetchGoogleAccountEmail(tokens.access_token);
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("user_connections").upsert(
    {
      user_id: userId,
      provider: "google",
      access_token: tokens.access_token,
      access_token_expires_at: new Date(
        Date.now() + (tokens.expires_in ?? 3600) * 1000,
      ).toISOString(),
      refresh_token_encrypted: encryptSecret(tokens.refresh_token),
      scopes: tokens.scope?.split(" ") ?? googleScopes,
      account_email: accountEmail,
    },
    { onConflict: "user_id,provider" },
  );

  if (error) {
    console.error("Storing Google connection failed:", error);
    return { ok: false, error: "storage_failed" };
  }

  return { ok: true };
}

/**
 * Access token yang dijamin masih hidup, di-refresh bila perlu.
 * Mengembalikan null bila pengguna belum terhubung atau koneksinya sudah tidak
 * bisa dipulihkan — pemanggil menampilkannya sebagai "sambungkan ulang".
 */
export async function getValidGoogleAccessToken(
  userId: string,
): Promise<GoogleConnection | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_connections")
    .select("access_token,access_token_expires_at,refresh_token_encrypted,account_email")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as {
    access_token: string | null;
    access_token_expires_at: string | null;
    refresh_token_encrypted: string | null;
    account_email: string | null;
  };

  // Margin 60 detik: token yang tersisa beberapa detik akan kedaluwarsa di
  // tengah permintaan Drive dan menghasilkan 401 yang membingungkan.
  const expiresAt = row.access_token_expires_at
    ? new Date(row.access_token_expires_at).getTime()
    : 0;

  if (row.access_token && expiresAt > Date.now() + 60_000) {
    return { accessToken: row.access_token, accountEmail: row.account_email };
  }

  if (!row.refresh_token_encrypted) {
    return null;
  }

  const refreshToken = decryptSecret(row.refresh_token_encrypted);

  if (!refreshToken) {
    console.error("Google refresh token could not be decrypted:", { userId });
    return null;
  }

  const refreshed = await requestGoogleToken({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  if (!refreshed?.access_token) {
    return null;
  }

  await supabase
    .from("user_connections")
    .update({
      access_token: refreshed.access_token,
      access_token_expires_at: new Date(
        Date.now() + (refreshed.expires_in ?? 3600) * 1000,
      ).toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "google");

  return {
    accessToken: refreshed.access_token,
    accountEmail: row.account_email,
  };
}

export async function disconnectGoogle(userId: string) {
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("user_connections")
    .select("refresh_token_encrypted")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  const encrypted = (data as { refresh_token_encrypted: string | null } | null)
    ?.refresh_token_encrypted;

  // Cabut di sisi Google lebih dulu. Menghapus baris kita saja akan
  // meninggalkan izin yang masih aktif di akun Google pengguna — mereka
  // mengira sudah memutus hubungan padahal belum.
  if (encrypted) {
    const refreshToken = decryptSecret(encrypted);

    if (refreshToken) {
      await fetch(googleRevokeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken }).toString(),
      }).catch((error) => {
        console.error("Google token revoke failed:", error);
      });
    }
  }

  await supabase
    .from("user_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "google");
}
