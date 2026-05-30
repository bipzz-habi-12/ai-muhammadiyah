"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

type SupabaseAuthError = {
  message: string;
  status?: number;
  code?: string;
  name?: string;
};

const isDevelopment = process.env.NODE_ENV === "development";

function getFriendlyAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email atau password belum sesuai. Mohon periksa kembali.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Silakan verifikasi OTP dari email Anda.";
  }

  if (normalizedMessage.includes("already registered")) {
    return "Email ini sudah terdaftar. Silakan masuk lewat halaman login.";
  }

  if (normalizedMessage.includes("password")) {
    return "Password minimal 6 karakter dan tidak boleh kosong.";
  }

  if (normalizedMessage.includes("email")) {
    return "Format email belum benar. Mohon gunakan email aktif.";
  }

  return "Terjadi kendala. Silakan coba lagi sebentar.";
}

function getAuthErrorMessage(error: SupabaseAuthError) {
  const friendlyMessage = getFriendlyAuthError(error.message);

  if (!isDevelopment) {
    return friendlyMessage;
  }

  return `${friendlyMessage} Detail Supabase: ${error.message}`;
}

function logAuthError(context: string, error: SupabaseAuthError) {
  console.error(`[Supabase Auth] ${context}`, {
    status: error.status,
    message: error.message,
    code: error.code,
    name: error.name,
    error,
  });
}

function getRedirectPath() {
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get("redirectTo");

  if (!redirectTo || !redirectTo.startsWith("/")) {
    return "/";
  }

  return redirectTo;
}

function redirectToChat(router: ReturnType<typeof useRouter>, reason: string) {
  const redirectPath = "/";

  console.log("[Supabase Auth] redirect target", {
    reason,
    redirectPath,
  });

  console.log("[Supabase Auth] redirect response", {
    action: "router.replace",
    redirectPath,
  });

  router.replace(redirectPath);
  router.refresh();
}

function redirectToOtpVerification(
  router: ReturnType<typeof useRouter>,
  email: string,
) {
  const redirectPath = `/verify-otp?email=${encodeURIComponent(email)}`;

  console.log("[Supabase Auth] redirect target", {
    reason: "registration OTP sent",
    redirectPath,
  });

  console.log("[Supabase Auth] redirect response", {
    action: "router.replace",
    redirectPath,
  });

  router.replace(redirectPath);
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      if (isLogin) {
        const loginResponse = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        const { data, error } = loginResponse;

        console.log("[Supabase Auth] login response", {
          userId: data.user?.id,
          userEmail: data.user?.email,
          hasSession: Boolean(data.session),
          error,
        });

        if (error) {
          logAuthError("login error", error);
          setErrorMessage(getAuthErrorMessage(error));
          return;
        }

        const redirectPath = getRedirectPath();
        console.log("[Supabase Auth] redirect target", {
          reason: "login succeeded",
          redirectPath,
        });

        console.log("[Supabase Auth] redirect response", {
          action: "router.replace",
          redirectPath,
        });

        router.replace(redirectPath);
        router.refresh();
        return;
      }

      const otpResponse = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      const { data, error } = otpResponse;

      console.log("[Supabase Auth] registration OTP response", {
        userId: data.user?.id,
        userEmail: data.user?.email,
        hasSession: Boolean(data.session),
        error,
      });

      const sessionResponse = await supabase.auth.getSession();
      console.log("[Supabase Auth] session response", {
        userId: sessionResponse.data.session?.user.id,
        userEmail: sessionResponse.data.session?.user.email,
        hasSession: Boolean(sessionResponse.data.session),
        error: sessionResponse.error,
      });

      if (error) {
        logAuthError("registration OTP error", error);
        setErrorMessage(getAuthErrorMessage(error));
        return;
      }

      if (data.session) {
        redirectToChat(router, "registration OTP returned a session");
        return;
      }

      if (sessionResponse.data.session) {
        redirectToChat(router, "session exists after signup");
        return;
      }

      if (sessionResponse.error) {
        logAuthError("session error after signup", sessionResponse.error);
        setErrorMessage(getAuthErrorMessage(sessionResponse.error));
        return;
      }

      setSuccessMessage(
        "Kode OTP telah dikirim ke email.",
      );
      redirectToOtpVerification(router, email);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="text-sm font-bold text-[#18392e]">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@email.com"
          autoComplete="email"
          required
          className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-[#18392e] outline-none ring-1 ring-[#d3e8dc] transition focus:ring-2 focus:ring-[#95d6b9]"
        />
      </div>

      {isLogin && (
        <div>
          <label htmlFor="password" className="text-sm font-bold text-[#18392e]">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 6 karakter"
            autoComplete="current-password"
            minLength={6}
            required
            className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-[#18392e] outline-none ring-1 ring-[#d3e8dc] transition focus:ring-2 focus:ring-[#95d6b9]"
          />
        </div>
      )}

      {errorMessage && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="rounded-2xl bg-[#eef8f1] px-4 py-3 text-sm font-semibold text-[#008d54] ring-1 ring-[#d3e8dc]">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="h-[52px] w-full rounded-full bg-[#009252] px-6 font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#087447] disabled:cursor-not-allowed disabled:bg-[#95d6b9]"
      >
        {isLoading
          ? isLogin
            ? "Masuk..."
            : "Mengirim OTP..."
          : isLogin
            ? "Masuk"
            : "Kirim OTP"}
      </button>

      <p className="text-center text-sm text-[#4f665c]">
        {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-bold text-[#008d54] transition hover:text-[#06140d]"
        >
          {isLogin ? "Daftar di sini" : "Masuk di sini"}
        </Link>
      </p>
    </form>
  );
}
