import Link from "next/link";
import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import BottomNav from "@/components/BottomNav";
import ProviderKeysPanel from "@/components/settings/ProviderKeysPanel";
import { getEmailInitials } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export default async function ProviderSettingsPage() {
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
        active="settings"
        userInitials={getEmailInitials(user.email ?? "")}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="scroll flex-1 overflow-y-auto bg-[var(--background)]">
          <div className="mx-auto max-w-[720px] px-5 pb-20 pt-8 sm:px-8 md:pt-12">
            <Link
              href="/"
              className="mb-6 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-[var(--brand)] transition hover:text-[var(--brand-hover-text)]"
            >
              <span aria-hidden="true">&larr;</span> Kembali ke chat
            </Link>
            <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-[var(--ink-deep)]">
              API key pribadi
            </h1>
            <p className="mb-7 mt-2 max-w-[600px] text-[15px] leading-relaxed text-[var(--muted-2)]">
              Hubungkan OpenAI, Google, atau Anthropic untuk memakai model dengan
              tagihan provider milikmu sendiri.
            </p>

            <ProviderKeysPanel />
          </div>
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
