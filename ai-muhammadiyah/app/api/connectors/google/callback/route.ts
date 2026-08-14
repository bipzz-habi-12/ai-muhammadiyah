import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { exchangeAndStoreGoogleTokens } from "@/lib/connectors/google";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const oauthStateCookie = "magent_google_oauth_state";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function redirectToWork(params: string) {
  return NextResponse.redirect(new URL(`/work${params}`, getBaseUrl()));
}

function statesMatch(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  // Panjang berbeda otomatis tidak cocok; timingSafeEqual melempar bila
  // panjangnya beda, jadi harus dicek lebih dulu.
  return (
    bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", getBaseUrl()));
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  // Pengguna menekan "Batal" di layar consent. Itu keputusan yang sah, bukan
  // kegagalan sistem — jangan tampilkan sebagai error menakutkan.
  if (error) {
    return redirectToWork("?connect=dibatalkan");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get(oauthStateCookie)?.value;

  if (!code || !state || !expectedState || !statesMatch(state, expectedState)) {
    return redirectToWork("?error=state_mismatch");
  }

  const result = await exchangeAndStoreGoogleTokens(code, user.id);

  const response = result.ok
    ? redirectToWork("?connect=berhasil")
    : redirectToWork(`?error=${encodeURIComponent(result.error)}`);

  // State sekali pakai — dihapus apa pun hasilnya supaya tidak bisa diputar ulang.
  response.cookies.delete(oauthStateCookie);

  return response;
}
