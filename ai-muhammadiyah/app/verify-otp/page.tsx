import AuthPage from "@/components/AuthPage";

type VerifyOtpPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function VerifyOtpPage({
  searchParams,
}: VerifyOtpPageProps) {
  const { email = "" } = await searchParams;

  return <AuthPage mode="otp" initialEmail={email} />;
}
