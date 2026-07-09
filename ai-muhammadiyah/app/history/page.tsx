import { redirect } from "next/navigation";
import PlaceholderPage from "@/components/PlaceholderPage";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export default async function HistoryPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PlaceholderPage
      eyebrow="AI-mu"
      title="History"
      description="Riwayat percakapan lintas workspace dalam tampilan terpusat akan tampil di sini."
    />
  );
}
