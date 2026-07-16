import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import { getEmailInitials } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import HubDirectory from "./HubDirectory";

// Muhammadiyah Hub v2 (design port). The indexed/attachable knowledge base is
// still deferred; HubDirectory renders a curated directory of official portals
// with real client-side search + category filter. See its header comment.

export default async function HubPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-[#f5f3ec] text-[#16211c]">
      <AppShellRail active="hub" userInitials={getEmailInitials(user.email ?? "")} />
      <HubDirectory />
    </main>
  );
}
