import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

// GET /auth/callback -> tujuan redirect OAuth (Google/GitHub) dari Supabase.
//
// Supabase mengarahkan browser kembali ke sini dengan query `code` (alur
// PKCE). Route ini menukar `code` itu dengan sesi asli lewat
// exchangeCodeForSession, yang menulis cookie sesi lewat
// createSupabaseAuthServerClient (route handler boleh menulis cookie, beda
// dengan Server Component). `proxy.ts` sengaja meloloskan path ini ke sini
// saat ada `code` di query -- lihat komentar "legacy auth callback route" di
// sana.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    console.error("[Supabase Auth] OAuth provider error", { oauthError });
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  if (code) {
    const supabase = await createSupabaseAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log("[Supabase Auth] redirect target", {
        reason: "OAuth code exchanged for session",
        redirectPath: "/",
      });
      return NextResponse.redirect(`${origin}/`);
    }

    console.error("[Supabase Auth] OAuth code exchange failed", {
      message: error.message,
      status: error.status,
    });
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
