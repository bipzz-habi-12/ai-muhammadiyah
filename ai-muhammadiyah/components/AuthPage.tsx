import AuthForm from "./AuthForm";
import BrandLogo from "@/components/BrandLogo";
import OtpForm from "./OtpForm";

type AuthPageProps = {
  mode: "login" | "register" | "otp";
  initialEmail?: string;
};

export default function AuthPage({ mode, initialEmail = "" }: AuthPageProps) {
  const isLogin = mode === "login";
  const isOtp = mode === "otp";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--c-f7fbf8)] px-4 py-10 text-[var(--c-04140b)]">
      <section className="w-full max-w-md rounded-[34px] bg-[var(--c-fbfdfb)] p-6 shadow-[0_22px_60px_rgba(27,77,50,0.08)] ring-1 ring-[var(--c-d3e8dc)] sm:p-8">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-14 w-14" />
          <div>
            <p className="text-sm font-bold text-[var(--c-008d54)]">M-Agent</p>
            <h1 className="text-2xl font-bold tracking-normal text-[var(--c-05150d)]">
              {isOtp
                ? "Verifikasi OTP"
                : isLogin
                  ? "Masuk dengan OTP"
                  : "Daftar akun M-Agent"}
            </h1>
          </div>
        </div>

        <p className="mt-6 text-base leading-relaxed text-[var(--c-4f665c)]">
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
