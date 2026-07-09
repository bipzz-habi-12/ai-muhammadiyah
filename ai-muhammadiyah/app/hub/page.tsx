import { redirect } from "next/navigation";
import PlaceholderPage from "@/components/PlaceholderPage";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export default async function HubPage() {
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
      title="Muhammadiyah Hub"
      description="Knowledge base terpusat (HPT, Tarjih, ISMUBA, Pedoman Muhammadiyah) yang bisa disambungkan ke workspace mana pun akan tampil di sini."
    />
  );
}
