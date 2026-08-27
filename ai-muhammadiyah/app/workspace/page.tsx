import Link from "next/link";
import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import BottomNav from "@/components/BottomNav";
import { getEmailInitials } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// /workspace index — the "Workspaces" destination from the icon rail. There is
// no single workspace id in the URL here, so this server component picks the
// most sensible one (the workspace of the most recently active chat, else the
// earliest-created workspace) and redirects to /workspace/[id], whose sidebar
// then lets the user switch between all of them. Brand-new users with no
// workspace yet get an honest empty state pointing back to chat.

export default async function WorkspaceIndexPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // All workspaces the user owns (RLS-scoped), oldest first as the stable base.
  const { data: workspaceRows } = await supabase
    .from("chat_workspaces")
    .select("id,created_at")
    .order("created_at", { ascending: true });

  const workspaces = (workspaceRows ?? []) as { id: string }[];

  if (workspaces.length === 0) {
    return (
      <main className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--ink)]">
        <AppShellRail
          active="workspaces"
          userInitials={getEmailInitials(user.email ?? "")}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-[440px] text-center">
            <h1 className="font-serif text-[30px] font-normal tracking-[-0.01em] text-[var(--ink-deep)]">
              Belum ada workspace
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted-2)]">
              Workspace menampung banyak chat sekaligus satu instruksi permanen.
              Buat workspace pertamamu dari halaman chat.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-[11px] bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
            >
              Ke chat
            </Link>
            </div>
          </div>

          <BottomNav />
        </div>
      </main>
    );
  }

  // Prefer the workspace of the most recently updated conversation, so the user
  // lands where they last worked. Falls back to the earliest workspace.
  const validIds = new Set(workspaces.map((workspace) => workspace.id));
  const { data: recentConversation } = await supabase
    .from("conversations")
    .select("workspace_id")
    .not("workspace_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const recentWorkspaceId = (recentConversation?.workspace_id ?? null) as
    | string
    | null;

  const target =
    recentWorkspaceId && validIds.has(recentWorkspaceId)
      ? recentWorkspaceId
      : workspaces[0].id;

  redirect(`/workspace/${target}`);
}
