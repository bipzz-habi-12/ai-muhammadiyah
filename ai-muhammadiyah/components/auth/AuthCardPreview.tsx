"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAuthErrorMessage, logAuthError } from "@/lib/auth/errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Design v2 auth screen (Login.dc.html port). Two-panel layout: brand panel
// left, form panel right. The REAL flow is unchanged — email → 6-digit OTP via
// Supabase; password & Google remain honestly marked "Segera hadir". Shared by
// /login and /register through the `mode` prop.

const otpLength = 6;

// Subtle diamond-grid brand-panel texture (inline data URI).
const brandPattern =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cg fill='none' stroke='%23FFFFFF' stroke-opacity='.06' stroke-width='1'%3E%3Crect x='24' y='24' width='48' height='48'/%3E%3Crect x='24' y='24' width='48' height='48' transform='rotate(45 48 48)'/%3E%3C/g%3E%3C/svg%3E\")";

type AuthCardPreviewProps = {
  mode: "login" | "register";
};

type AuthStep = "email" | "otp";

function ComingSoonBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none whitespace-nowrap rounded-full bg-[#e7c77e] px-2 py-0.5 text-[10px] font-semibold leading-none text-[#8a6a1f] ${className}`}
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

function StatusBanner({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "error"
      ? "border-[#ffb4ab] bg-[#ffdad6] text-[#93000a]"
      : "border-[#0f5a3d]/25 bg-[#0f5a3d]/[0.08] text-[#0f5a3d]";

  return (
    <p className={`rounded-[10px] border px-4 py-3 text-sm font-medium leading-[20px] ${toneClasses}`}>
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

  const inputClass =
    "h-[46px] w-full rounded-[10px] border border-[#0b3d2a]/16 bg-[#fbfaf6] px-[15px] text-[15px] text-[#16211c] outline-none transition focus:border-[#0f5a3d]";
  const labelClass =
    "mb-[7px] block text-[13px] font-semibold text-[#3a453e]";
  const primaryButtonClass =
    "flex h-12 w-full items-center justify-center rounded-[10px] bg-[#0f5a3d] text-[15px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

  const subheading =
    step === "otp"
      ? `Masukkan kode 6 digit yang dikirim ke ${email}`
      : isLogin
        ? "Masuk untuk melanjutkan ke workspace-mu."
        : "Mulai gratis — satu workspace, tanpa kartu.";

  return (
    <div className="grid min-h-dvh bg-[#f5f3ec] text-[#16211c] lg:grid-cols-[1.05fr_1fr]">
      {/* BRAND PANEL */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden bg-[#0b3d2a] px-16 py-14 text-[#ede9dc] lg:flex"
        style={{ backgroundImage: brandPattern, backgroundSize: "96px 96px" }}
      >
        <Link href="/login" className="relative flex items-center gap-3">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#e7c77e] text-[17px] font-bold text-[#0b3d2a]">
            م
          </span>
          <span className="text-[16.5px] font-semibold text-[#f3efe2]">
            AI Muhammadiyah
          </span>
        </Link>

        <div className="relative max-w-[460px]">
          <div className="mb-[22px] text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[#c7a560]">
            Islam Berkemajuan
          </div>
          <blockquote className="font-serif text-[34px] italic leading-[1.28] tracking-[-0.01em] text-[#f3efe2]">
            &ldquo;Ilmu tanpa nilai kehilangan arah. Nilai tanpa ilmu kehilangan
            daya. Platform ini dibuat untuk merangkul keduanya.&rdquo;
          </blockquote>
          <div className="mt-[34px] flex flex-col gap-3.5 text-[14.5px] text-[#b9c3b7]">
            <div className="flex items-center gap-3">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#e7c77e]" />
              Workspace, skill, dan artifact dalam satu tempat
            </div>
            <div className="flex items-center gap-3">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#e7c77e]" />
              Berlandaskan Muhammadiyah Knowledge Base
            </div>
            <div className="flex items-center gap-3">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#e7c77e]" />
              Terbuka untuk semua, gratis untuk memulai
            </div>
          </div>
        </div>

        <div className="relative text-[13px] text-[#8fa091]">
          aimuhammadiyah.my.id
        </div>
      </div>

      {/* FORM PANEL */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[400px] [animation:fade_.5s_ease]">
          {/* Brand row for small screens (brand panel is desktop-only) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#0f5a3d] text-[17px] font-bold text-[#f5f3ec]">
              م
            </span>
            <span className="text-[16.5px] font-semibold text-[#12211b]">
              AI Muhammadiyah
            </span>
          </div>

          {step === "email" && (
            <div className="mb-8 flex rounded-[12px] bg-[#ece9df] p-1">
              <Link
                href="/login"
                className={
                  isLogin
                    ? "flex-1 rounded-[9px] bg-[#fbfaf6] py-2 text-center text-sm font-semibold text-[#0f5a3d] shadow-[0_1px_3px_rgba(11,61,42,0.12)]"
                    : "flex-1 rounded-[9px] py-2 text-center text-sm font-semibold text-[#6b746e] transition hover:text-[#0f5a3d]"
                }
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className={
                  !isLogin
                    ? "flex-1 rounded-[9px] bg-[#fbfaf6] py-2 text-center text-sm font-semibold text-[#0f5a3d] shadow-[0_1px_3px_rgba(11,61,42,0.12)]"
                    : "flex-1 rounded-[9px] py-2 text-center text-sm font-semibold text-[#6b746e] transition hover:text-[#0f5a3d]"
                }
              >
                Buat akun
              </Link>
            </div>
          )}

          <h1 className="mb-2 font-serif text-[33px] font-normal tracking-[-0.01em] text-[#12211b]">
            {step === "otp"
              ? "Verifikasi kode"
              : isLogin
                ? "Selamat datang"
                : "Buat akun"}
          </h1>
          <p className="mb-7 text-[15px] leading-relaxed text-[#5d6862]">
            {subheading}
          </p>

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Alamat email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@domain.com"
                  autoComplete="email"
                  required
                  className={inputClass}
                />
              </div>

              {errorMessage && <StatusBanner tone="error">{errorMessage}</StatusBanner>}
              {successMessage && <StatusBanner tone="success">{successMessage}</StatusBanner>}

              <button type="submit" disabled={isSending} className={primaryButtonClass}>
                {isSending ? "Mengirim kode…" : "Kirim kode OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div>
                <label htmlFor="otp" className={labelClass}>
                  Kode OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, otpLength))
                  }
                  placeholder="••••••"
                  autoComplete="one-time-code"
                  minLength={otpLength}
                  maxLength={otpLength}
                  required
                  className="h-[54px] w-full rounded-[10px] border border-[#0b3d2a]/16 bg-[#fbfaf6] px-[15px] text-center text-[22px] font-bold tracking-[0.4em] text-[#16211c] outline-none transition focus:border-[#0f5a3d]"
                />
              </div>

              {errorMessage && <StatusBanner tone="error">{errorMessage}</StatusBanner>}
              {successMessage && <StatusBanner tone="success">{successMessage}</StatusBanner>}

              <button
                type="submit"
                disabled={isVerifying || otp.length !== otpLength}
                className={primaryButtonClass}
              >
                {isVerifying
                  ? "Memverifikasi…"
                  : isLogin
                    ? "Verifikasi & masuk"
                    : "Verifikasi & daftar"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-[#5d6862] transition hover:text-[#0f5a3d]"
                >
                  Ganti email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="font-semibold text-[#0f5a3d] transition hover:text-[#0a3d2a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResending ? "Mengirim ulang…" : "Kirim ulang kode"}
                </button>
              </div>
            </form>
          )}

          {step === "email" && (
            <>
              <div className="my-6 flex items-center gap-3.5">
                <span className="h-px flex-1 bg-[#0b3d2a]/10" />
                <span className="text-[12.5px] text-[#8a9089]">
                  atau lanjutkan dengan
                </span>
                <span className="h-px flex-1 bg-[#0b3d2a]/10" />
              </div>

              <div className="relative">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Segera hadir"
                  className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-[10px] border border-[#0b3d2a]/16 bg-[#fbfaf6] text-[14.5px] font-semibold text-[#25302a] opacity-60"
                >
                  <GoogleIcon className="h-5 w-5" />
                  Lanjutkan dengan Google
                </button>
                <ComingSoonBadge className="absolute -top-2 right-3" />
              </div>
            </>
          )}

          <p className="mt-8 text-center text-[13px] leading-relaxed text-[#8a9089]">
            Dengan melanjutkan, kamu menyetujui{" "}
            <a href="#" className="font-medium text-[#0f5a3d] hover:underline">
              Syarat &amp; Ketentuan
            </a>{" "}
            dan{" "}
            <a href="#" className="font-medium text-[#0f5a3d] hover:underline">
              Kebijakan Privasi
            </a>{" "}
            AI Muhammadiyah.
          </p>
        </div>
      </div>
    </div>
  );
}
