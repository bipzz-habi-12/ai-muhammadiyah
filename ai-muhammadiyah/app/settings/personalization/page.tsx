import Link from "next/link";
import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import BottomNav from "@/components/BottomNav";
import { getEmailInitials } from "@/lib/formatting/text";
import { loadUserMemory } from "@/lib/memory/user-memory";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import PersonalizationForm from "./PersonalizationForm";

// Personalization page (Personalization.dc.html port). Loads the real learning
// profile (user_memory, RLS-scoped) server-side and hands it to the client form.
// Same underlying data as the Settings modal's Personalization tab.

export default async function PersonalizationPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let initial;
  try {
    initial = await loadUserMemory(supabase, user.id);
  } catch (error) {
    console.error(error);
    initial = undefined;
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--ink)]">
      <AppShellRail active="settings" userInitials={getEmailInitials(user.email ?? "")} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="scroll flex-1 overflow-y-auto bg-[var(--background)]">
        <div className="mx-auto max-w-[680px] px-6 pb-20 pt-12 sm:px-11">
          <div className="mb-8">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] transition hover:text-[var(--brand-hover-text)]"
            >
              <span aria-hidden="true">&larr;</span> Kembali ke chat
            </Link>
            <h1 className="font-serif text-[34px] font-normal tracking-[-0.01em] text-[var(--ink-deep)]">
              Personalisasi
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted-2)]">
              Cara AI menyapamu dan membentuk jawabannya, di mana pun kamu
              bekerja.
            </p>
          </div>

          {initial ? (
            <PersonalizationForm initial={initial} userId={user.id} />
          ) : (
            <p className="rounded-[13px] bg-[var(--danger-bg)] px-5 py-4 text-sm font-semibold text-[var(--danger-ink)]">
              Profil belum bisa dimuat. Coba muat ulang halaman.
            </p>
          )}
        </div>
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
