import { redirect } from "next/navigation";
import PlaceholderPage from "@/components/PlaceholderPage";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export default async function LibraryPage() {
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
      title="Library"
      description="Agregasi semua Docs, Tasks, Sheets, dan Canvas dari seluruh workspace kamu akan tampil di sini."
    />
  );
}
