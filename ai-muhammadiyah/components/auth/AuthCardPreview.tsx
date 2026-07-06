"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Geist, Inter } from "next/font/google";
import { useState } from "react";
import { getAuthErrorMessage, logAuthError } from "@/lib/auth/errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const geist = Geist({ subsets: ["latin"], weight: ["400", "500"] });

const otpLength = 6;

type AuthCardPreviewProps = {
  mode: "login" | "register";
};

type AuthStep = "email" | "otp";

function ComingSoonBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`${geist.className} pointer-events-none whitespace-nowrap rounded-full bg-[#fdc003] px-2 py-0.5 text-[10px] font-medium leading-none text-[#6c5000] ${className}`}
    >
      Segera hadir
    </span>
  );
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className={className} aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function SunburstMotif() {
  return (
    <svg
      fill="none"
      width="800"
      height="800"
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="pointer-events-none fixed -top-[20%] -left-[20%] -z-10 animate-[spin_120s_linear_infinite] opacity-[0.03]"
    >
      <circle cx="50" cy="50" r="15" stroke="#004d27" strokeWidth="0.5" />
      <g stroke="#004d27" strokeWidth="2" strokeLinecap="round">
        <line x1="50" x2="50" y1="5" y2="25" />
        <line x1="50" x2="50" y1="75" y2="95" />
        <line x1="95" x2="75" y1="50" y2="50" />
        <line x1="25" x2="5" y1="50" y2="50" />
        <line x1="18.5" x2="32.5" y1="18.5" y2="32.5" />
        <line x1="67.5" x2="81.5" y1="67.5" y2="81.5" />
        <line x1="81.5" x2="67.5" y1="18.5" y2="32.5" />
        <line x1="32.5" x2="18.5" y1="67.5" y2="81.5" />
      </g>
    </svg>
  );
}

function StatusBanner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const toneClasses =
    tone === "error"
      ? "border-[#ffb4ab] bg-[#ffdad6] text-[#93000a]"
      : "border-[#bfe3cb] bg-[#e6f4ea] text-[#004d27]";

  return (
    <p className={`rounded-lg border px-4 py-3 text-[14px] leading-[20px] font-medium ${toneClasses}`}>
      {children}
    </p>
  );
}

export default function AuthCardPreview({ mode }: AuthCardPreviewProps) {
  const isLogin = mode === "login";
  const router = useRouter();

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  function redirectToChat(reason: string) {
    console.log("[Supabase Auth] redirect target", { reason, redirectPath: "/" });
    router.replace("/");
    router.refresh();
  }

  async function handleSendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const normalizedEmail = email.trim().toLowerCase();
      const authAction = isLogin ? "login" : "registration";
      const { data, error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: !isLogin,
        },
      });

      console.log(`[Supabase Auth] ${authAction} OTP response`, {
        userId: data.user?.id,
        userEmail: data.user?.email,
        hasSession: Boolean(data.session),
        error,
      });

      if (error) {
        logAuthError(`${authAction} OTP error`, error);
        setErrorMessage(getAuthErrorMessage(error));
        return;
      }

      if (data.session) {
        redirectToChat(`${authAction} OTP returned a session`);
        return;
      }

      setEmail(normalizedEmail);
      setSuccessMessage("Kode OTP telah dikirim ke email.");
      setStep("otp");
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsVerifying(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const cleanOtp = otp.replace(/\D/g, "");
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleanOtp,
        type: "email",
      });

      console.log("[Supabase Auth] OTP verify response", {
        userId: data.user?.id,
        userEmail: data.user?.email,
        hasSession: Boolean(data.session),
        error,
      });

      if (error) {
        logAuthError("OTP verify error", error);
        setErrorMessage("Kode OTP salah atau kedaluwarsa.");
        return;
      }

      redirectToChat("OTP verified");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResendOtp() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsResending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      console.log("[Supabase Auth] OTP resend response", {
        userId: data.user?.id,
        userEmail: data.user?.email,
        error,
      });

      if (error) {
        logAuthError("OTP resend error", error);
        setErrorMessage("Kode OTP belum bisa dikirim ulang. Silakan coba lagi.");
        return;
      }

      setSuccessMessage("Kode OTP telah dikirim ulang ke email.");
    } finally {
      setIsResending(false);
    }
  }

  function handleChangeEmail() {
    setStep("email");
    setOtp("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  return (
    <div className={`${inter.className} relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[#f8f9fa] p-4 text-[#191c1d]`}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(0,77,39,0.03)_0%,transparent_70%)]" />
      <SunburstMotif />

      <main className="flex w-full max-w-[400px] flex-col items-center">
        <div className="mb-6">
          <Image src="/logo.svg" alt="AI Muhammadiyah Logo" width={96} height={96} className="h-24 w-24 object-contain" />
        </div>

        <div className="flex w-full flex-col gap-6 rounded-lg border border-[#e9ecef] bg-white p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <header className="text-center">
            <h1 className="mb-2 text-[24px] font-semibold leading-[32px] text-[#191c1d]">
              {isLogin ? "Selamat Datang" : "Buat Akun Baru"}
            </h1>
            <p className={`${geist.className} text-[14px] leading-[20px] tracking-[0.01em] text-[#3f4940]`}>
              {step === "email"
                ? isLogin
                  ? "Masuk ke platform AI Muhammadiyah"
                  : "Daftar ke platform AI Muhammadiyah"
                : `Masukkan kode 6 digit yang dikirim ke ${email}`}
            </p>
          </header>

          {step === "email" && (
            <div className={`${geist.className} flex gap-2 rounded-full bg-[#f3f4f5] p-2`}>
              <div className="relative flex-1">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Segera hadir"
                  className="w-full cursor-not-allowed rounded-full py-2 text-[14px] leading-[20px] tracking-[0.01em] text-[#3f4940] opacity-50"
                >
                  Password
                </button>
                <ComingSoonBadge className="absolute -top-2 -right-1" />
              </div>
              <div className="flex-1 rounded-full bg-[#004d27] py-2 text-center text-[14px] leading-[20px] tracking-[0.01em] text-white">
                Kode OTP
              </div>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className={`${geist.className} px-2 text-[14px] leading-[20px] tracking-[0.01em] text-[#3f4940]`}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@domain.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-[#bec9be] bg-[#f8f9fa] px-6 py-4 text-[16px] leading-[24px] text-[#191c1d] transition-all focus:border-[#004d27] focus:outline-none focus:ring-1 focus:ring-[#004d27]"
                />
              </div>

              {errorMessage && <StatusBanner tone="error">{errorMessage}</StatusBanner>}
              {successMessage && <StatusBanner tone="success">{successMessage}</StatusBanner>}

              <button
                type="submit"
                disabled={isSending}
                className={`${geist.className} mt-2 w-full rounded-lg bg-[#004d27] py-4 text-[14px] leading-[20px] tracking-[0.01em] text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isSending ? "Mengirim kode..." : "Kirim Kode OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="otp" className={`${geist.className} px-2 text-[14px] leading-[20px] tracking-[0.01em] text-[#3f4940]`}>
                  Kode OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, otpLength))}
                  placeholder="6 digit kode"
                  autoComplete="one-time-code"
                  minLength={otpLength}
                  maxLength={otpLength}
                  required
                  className="w-full rounded-lg border border-[#bec9be] bg-[#f8f9fa] px-6 py-4 text-center text-[20px] font-bold leading-[24px] tracking-[0.3em] text-[#191c1d] transition-all focus:border-[#004d27] focus:outline-none focus:ring-1 focus:ring-[#004d27]"
                />
              </div>

              {errorMessage && <StatusBanner tone="error">{errorMessage}</StatusBanner>}
              {successMessage && <StatusBanner tone="success">{successMessage}</StatusBanner>}

              <button
                type="submit"
                disabled={isVerifying || otp.length !== otpLength}
                className={`${geist.className} mt-2 w-full rounded-lg bg-[#004d27] py-4 text-[14px] leading-[20px] tracking-[0.01em] text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isVerifying ? "Memverifikasi..." : isLogin ? "Verifikasi & Masuk" : "Verifikasi & Daftar"}
              </button>

              <div className={`${geist.className} flex items-center justify-between text-[14px] leading-[20px] tracking-[0.01em]`}>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-[#3f4940] hover:underline"
                >
                  Ganti email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-[#004d27] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResending ? "Mengirim ulang..." : "Kirim ulang kode"}
                </button>
              </div>
            </form>
          )}

          {step === "email" && (
            <>
              <div className="relative flex items-center py-2">
                <div className="grow border-t border-[#bec9be]" />
                <span className={`${geist.className} mx-6 shrink text-[14px] leading-[20px] tracking-[0.01em] text-[#3f4940]`}>
                  atau
                </span>
                <div className="grow border-t border-[#bec9be]" />
              </div>

              <div className="relative">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Segera hadir"
                  className="flex w-full cursor-not-allowed items-center justify-center gap-4 rounded-lg border border-[#bec9be] bg-white py-4 opacity-50"
                >
                  <GoogleIcon />
                  <span className={`${geist.className} text-[14px] leading-[20px] tracking-[0.01em] text-[#191c1d]`}>
                    Lanjutkan dengan Google
                  </span>
                </button>
                <ComingSoonBadge className="absolute -top-2 -right-2" />
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[16px] leading-[24px] text-[#3f4940]">
          {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
          <Link href={isLogin ? "/register" : "/login"} className="font-bold text-[#004d27] hover:underline">
            {isLogin ? "Daftar" : "Masuk"}
          </Link>
        </p>

        <div className={`${geist.className} mt-20 flex flex-wrap justify-center gap-4 text-[14px] leading-[20px] tracking-[0.01em] text-[#3f4940]/60`}>
          <a href="#" className="transition-colors hover:text-[#004d27]">
            Syarat &amp; Ketentuan
          </a>
          <span>•</span>
          <a href="#" className="transition-colors hover:text-[#004d27]">
            Kebijakan Privasi
          </a>
        </div>
      </main>
    </div>
  );
}
