import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import { isHubAdmin } from "@/lib/admin";
import { getEmailInitials } from "@/lib/formatting/text";
import {
  HUB_FALLBACK_RESOURCES,
  listHubResources,
  type HubResource,
} from "@/lib/hub";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import HubDirectory from "./HubDirectory";

// Muhammadiyah Hub v2. The directory is now backed by the admin-curated
// public.hub_resources table (migration 20260722000000). We fetch it server-side
// (RLS-scoped, active + public rows only) and pass it to the client view for
// instant search/filter. Before the migration is applied — or if the table is
// legitimately empty — we fall back to the trusted curated defaults so the page
// never breaks and never shows invented data.

export default async function HubPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let resources: HubResource[];
  try {
    const rows = await listHubResources(supabase);
    resources = rows.length > 0 ? rows : HUB_FALLBACK_RESOURCES;
  } catch (error) {
    console.error("Hub directory load failed, using fallback:", error);
    resources = HUB_FALLBACK_RESOURCES;
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-[#f5f3ec] text-[#16211c]">
      <AppShellRail active="hub" userInitials={getEmailInitials(user.email ?? "")} />
      <HubDirectory resources={resources} isAdmin={isHubAdmin(user)} />
    </main>
  );
}
