import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "./lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/register" ||
    request.nextUrl.pathname === "/verify-otp";

  const isOAuthCodeExchange =
    request.nextUrl.pathname === "/auth/callback" &&
    request.nextUrl.searchParams.has("code");

  if (request.nextUrl.pathname === "/auth/callback" && !isOAuthCodeExchange) {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/" : "/login";
    url.search = "";

    console.log("[Supabase Auth] redirect target", {
      reason: "legacy auth callback route",
      redirectPath: url.pathname,
    });

    return NextResponse.redirect(url);
  }

  // isOAuthCodeExchange: biarkan lolos ke app/auth/callback/route.ts, yang
  // menukar `code` jadi sesi (exchangeCodeForSession). response di bawah
  // sudah bawa cookie sesi ter-refresh dari supabase.auth.getUser() di atas.

  if (!user && request.nextUrl.pathname === "/") {
    // Tanpa sesi: tampilkan halaman Home/marketing (bukan langsung dorong ke
    // /login). REWRITE, bukan redirect — address bar tetap "/", kontennya
    // saja yang datang dari app/home/page.tsx. CTA "Masuk"/"Buat akun" di
    // Landing sendiri yang mengarahkan ke /login atau /register.
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.rewrite(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
