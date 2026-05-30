import AuthForm from "./AuthForm";
import OtpForm from "./OtpForm";

type AuthPageProps = {
  mode: "login" | "register" | "otp";
  initialEmail?: string;
};

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3.5"
    >
      <path d="M29 5l-4.1 13.7L12 23l12.9 4.3L29 41l4.1-13.7L46 23l-12.9-4.3L29 5Z" />
      <path d="M12 6l-1.8 5.2L5 13l5.2 1.8L12 20l1.8-5.2L19 13l-5.2-1.8L12 6Z" />
      <path d="M10 35a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M40 8v7" />
      <path d="M36.5 11.5h7" />
    </svg>
  );
}

export default function AuthPage({ mode, initialEmail = "" }: AuthPageProps) {
  const isLogin = mode === "login";
  const isOtp = mode === "otp";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f7fbf8] px-4 py-10 text-[#04140b]">
      <section className="w-full max-w-md rounded-[34px] bg-[#fbfdfb] p-6 shadow-[0_22px_60px_rgba(27,77,50,0.08)] ring-1 ring-[#d3e8dc] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-[22px] bg-[#009252] text-white shadow-xl shadow-emerald-900/10">
            <SparkIcon />
          </div>
          <div>
            <p className="text-sm font-bold text-[#008d54]">AI Muhammadiyah</p>
            <h1 className="text-2xl font-bold tracking-normal text-[#05150d]">
              {isOtp
                ? "Verifikasi OTP"
                : isLogin
                  ? "Masuk dengan OTP"
                  : "Daftar akun AI-mu"}
            </h1>
          </div>
        </div>

        <p className="mt-6 text-base leading-relaxed text-[#4f665c]">
          {isOtp
            ? "Masukkan kode 6 digit dari email."
            : isLogin
              ? "Masukkan email terdaftar untuk menerima kode masuk."
              : "Masukkan email aktif untuk menerima kode pendaftaran."}
        </p>

        {isOtp ? <OtpForm initialEmail={initialEmail} /> : <AuthForm mode={mode} />}
      </section>
    </main>
  );
}
