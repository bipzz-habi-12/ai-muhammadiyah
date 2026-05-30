"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const otpLength = 6;

type OtpFormProps = {
  initialEmail?: string;
};

export default function OtpForm({ initialEmail = "" }: OtpFormProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    "Kode OTP telah dikirim ke email.",
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsVerifying(true);

    try {
      const cleanOtp = otp.replace(/\D/g, "");
      const verifyResponse = await supabase.auth.verifyOtp({
        email,
        token: cleanOtp,
        type: "email",
      });

      console.log("[Supabase Auth] OTP verify response", {
        userId: verifyResponse.data.user?.id,
        userEmail: verifyResponse.data.user?.email,
        hasSession: Boolean(verifyResponse.data.session),
        error: verifyResponse.error,
      });

      if (verifyResponse.error) {
        console.error("[Supabase Auth] OTP verify error", {
          status: verifyResponse.error.status,
          message: verifyResponse.error.message,
          code: verifyResponse.error.code,
          name: verifyResponse.error.name,
          error: verifyResponse.error,
        });

        setErrorMessage("Kode OTP salah atau kedaluwarsa.");
        return;
      }

      console.log("[Supabase Auth] redirect target", {
        reason: "OTP verified",
        redirectPath: "/",
      });

      router.replace("/");
      router.refresh();
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResendOtp() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsResending(true);

    try {
      const resendResponse = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      console.log("[Supabase Auth] OTP resend response", {
        userId: resendResponse.data.user?.id,
        userEmail: resendResponse.data.user?.email,
        error: resendResponse.error,
      });

      if (resendResponse.error) {
        console.error("[Supabase Auth] OTP resend error", {
          status: resendResponse.error.status,
          message: resendResponse.error.message,
          code: resendResponse.error.code,
          name: resendResponse.error.name,
          error: resendResponse.error,
        });

        setErrorMessage("Kode OTP belum bisa dikirim ulang. Silakan coba lagi.");
        return;
      }

      setSuccessMessage("Kode OTP telah dikirim ke email.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form onSubmit={handleVerify} className="mt-8 space-y-5">
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

      <div>
        <label htmlFor="otp" className="text-sm font-bold text-[#18392e]">
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
          placeholder="6 digit kode"
          autoComplete="one-time-code"
          minLength={otpLength}
          maxLength={otpLength}
          required
          className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-center text-xl font-bold tracking-[0.2em] text-[#18392e] outline-none ring-1 ring-[#d3e8dc] transition focus:ring-2 focus:ring-[#95d6b9]"
        />
      </div>

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
        disabled={isVerifying || otp.length !== otpLength}
        className="h-[52px] w-full rounded-full bg-[#009252] px-6 font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#087447] disabled:cursor-not-allowed disabled:bg-[#95d6b9]"
      >
        {isVerifying ? "Memverifikasi..." : "Verifikasi OTP"}
      </button>

      <button
        type="button"
        onClick={handleResendOtp}
        disabled={isResending || !email}
        className="h-[48px] w-full rounded-full bg-white px-6 font-bold text-[#18392e] ring-1 ring-[#d3e8dc] transition hover:bg-[#eef8f1] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isResending ? "Mengirim ulang..." : "Kirim ulang OTP"}
      </button>

      <p className="text-center text-sm text-[#4f665c]">
        Sudah terverifikasi?{" "}
        <Link
          href="/login"
          className="font-bold text-[#008d54] transition hover:text-[#06140d]"
        >
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
