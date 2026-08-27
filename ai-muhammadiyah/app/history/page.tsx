import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import BottomNav from "@/components/BottomNav";
import PlaceholderPage from "@/components/PlaceholderPage";
import { getEmailInitials } from "@/lib/formatting/text";
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
    <main className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--ink)]">
      <AppShellRail
        active="history"
        userInitials={getEmailInitials(user.email ?? "")}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="scroll flex flex-1 flex-col overflow-y-auto">
          <PlaceholderPage
            eyebrow="M-Agent"
            title="Riwayat"
            description="Riwayat percakapan lintas workspace dalam satu tampilan terpusat akan tampil di sini. Untuk sekarang, riwayatmu ada di sidebar halaman chat."
          />
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
