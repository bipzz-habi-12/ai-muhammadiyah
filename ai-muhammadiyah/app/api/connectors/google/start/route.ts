import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  buildGoogleConsentUrl,
  isGoogleConnectorConfigured,
} from "@/lib/connectors/google";
import { isConnectionEncryptionConfigured } from "@/lib/connectors/crypto";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export const oauthStateCookie = "magent_google_oauth_state";

export async function GET() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", getBaseUrl()));
  }

  if (!isGoogleConnectorConfigured()) {
    return NextResponse.redirect(
      new URL("/work?error=google_not_configured", getBaseUrl()),
    );
  }

  // Menolak lebih awal daripada menyimpan refresh token dalam bentuk polos:
  // tanpa kunci enkripsi, seluruh model keamanan tabel koneksi runtuh.
  if (!isConnectionEncryptionConfigured()) {
    return NextResponse.redirect(
      new URL("/work?error=encryption_not_configured", getBaseUrl()),
    );
  }

  // State anti-CSRF: tanpa ini, penyerang bisa memancing pengguna menyelesaikan
  // alur OAuth dengan `code` milik akun Google MILIK PENYERANG, sehingga akun
  // penyerang tertaut ke sesi korban.
  const state = randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(buildGoogleConsentUrl(state));

  response.cookies.set(oauthStateCookie, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
