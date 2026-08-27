import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import BottomNav from "@/components/BottomNav";
import { getEmailInitials } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import LibraryTabs from "./LibraryTabs";
import { type LibraryItem } from "./LibraryView";
import { type NoteItem } from "./NotesView";

// Library v2 (design port): the full app shell + a client grid of every Artifact
// the user owns, across all workspaces. Filtering/search happen client-side over
// this server-fetched, RLS-scoped list. Mini-app types exist in the schema but
// aren't produced yet (deferred sandboxing stage) — they simply won't appear.

type ArtifactRow = {
  id: string;
  conversation_id: string;
  type: string;
  title: string;
  updated_at: string;
};

export default async function LibraryPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("artifacts")
    .select("id,conversation_id,type,title,updated_at")
    .order("updated_at", { ascending: false })
    .limit(120);

  if (error) {
    console.error(error);
  }

  const artifacts = (data ?? []) as ArtifactRow[];
  const conversationIds = [
    ...new Set(artifacts.map((artifact) => artifact.conversation_id)),
  ];

  // Resolve each artifact's workspace label: workspace name → conversation title
  // → "Umum". Two small lookups, both RLS-scoped.
  const workspaceByConv = new Map<string, string | null>();
  const titleByConv = new Map<string, string>();

  if (conversationIds.length > 0) {
    const { data: conversationRows } = await supabase
      .from("conversations")
      .select("id,workspace_id,title")
      .in("id", conversationIds);

    const workspaceIds = new Set<string>();
    for (const row of (conversationRows ?? []) as {
      id: string;
      workspace_id: string | null;
      title: string;
    }[]) {
      workspaceByConv.set(row.id, row.workspace_id);
      titleByConv.set(row.id, row.title);
      if (row.workspace_id) {
        workspaceIds.add(row.workspace_id);
      }
    }

    if (workspaceIds.size > 0) {
      const { data: workspaceRows } = await supabase
        .from("chat_workspaces")
        .select("id,name")
        .in("id", [...workspaceIds]);

      const nameById = new Map<string, string>();
      for (const row of (workspaceRows ?? []) as {
        id: string;
        name: string;
      }[]) {
        nameById.set(row.id, row.name);
      }

      // Replace the stored workspace_id with its display name for lookup below.
      for (const [convId, workspaceId] of workspaceByConv) {
        workspaceByConv.set(
          convId,
          workspaceId ? (nameById.get(workspaceId) ?? null) : null,
        );
      }
    }
  }

  const items: LibraryItem[] = artifacts.map((artifact) => ({
    id: artifact.id,
    conversationId: artifact.conversation_id,
    type: artifact.type,
    title: artifact.title,
    updatedAt: artifact.updated_at,
    workspace:
      workspaceByConv.get(artifact.conversation_id) ||
      titleByConv.get(artifact.conversation_id) ||
      "Umum",
  }));

  // Otak Kedua: catatan pengguna + tautan dua arah. Dua query RLS-scoped,
  // backlink dihitung di sini supaya NotesView tetap murni presentasi.
  const [{ data: noteRows }, { data: linkRows }] = await Promise.all([
    supabase
      .from("notes")
      .select("id,title,content,source,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase.from("note_links").select("source_note_id,target_title,target_note_id"),
  ]);

  const notesRaw = (noteRows ?? []) as {
    id: string;
    title: string;
    content: string;
    source: NoteItem["source"];
    updated_at: string;
  }[];
  const links = (linkRows ?? []) as {
    source_note_id: string;
    target_title: string;
    target_note_id: string | null;
  }[];

  const titleById = new Map(notesRaw.map((note) => [note.id, note.title]));
  const outgoingBySource = new Map<string, NoteItem["outgoingLinks"]>();
  const backlinksByTarget = new Map<string, NoteItem["backlinks"]>();

  for (const link of links) {
    const outgoing = outgoingBySource.get(link.source_note_id) ?? [];
    outgoing.push({ title: link.target_title, noteId: link.target_note_id });
    outgoingBySource.set(link.source_note_id, outgoing);

    // Tautan yang belum ter-resolve tidak punya tujuan, jadi tidak
    // menghasilkan backlink sampai catatan tujuannya dibuat.
    if (!link.target_note_id) {
      continue;
    }

    const incoming = backlinksByTarget.get(link.target_note_id) ?? [];
    incoming.push({
      title: titleById.get(link.source_note_id) ?? "Catatan",
      noteId: link.source_note_id,
    });
    backlinksByTarget.set(link.target_note_id, incoming);
  }

  const notes: NoteItem[] = notesRaw.map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    source: note.source,
    updatedAt: note.updated_at,
    outgoingLinks: outgoingBySource.get(note.id) ?? [],
    backlinks: backlinksByTarget.get(note.id) ?? [],
  }));

  return (
    <main className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--ink)]">
      <AppShellRail active="library" userInitials={getEmailInitials(user.email ?? "")} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="scroll flex-1 overflow-y-auto bg-[var(--background)]">
        <div className="mx-auto max-w-[1080px] px-6 pb-20 pt-11 sm:px-12">
          <header className="mb-7">
            <div className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[var(--gold-ink)]">
              Library
            </div>
            <h1 className="font-serif text-[38px] font-normal leading-tight tracking-[-0.015em] text-[var(--ink-deep)]">
              Semua yang dibuat AI untukmu.
            </h1>
            <p className="mt-3 max-w-[560px] text-base leading-relaxed text-[var(--muted-2)]">
              Artifact tersimpan otomatis dari setiap workspace — dokumen,
              visual, kode, dan mini app. Catatan adalah Otak Kedua-mu:
              pengetahuan yang kamu simpan sendiri dan dipakai AI di percakapan
              berikutnya.
            </p>
          </header>

          {error ? (
            <p className="rounded-[15px] bg-[var(--danger-bg)] px-5 py-4 text-sm font-semibold text-[var(--danger-ink)]">
              Artifact belum bisa dimuat. Coba muat ulang halaman.
            </p>
          ) : (
            <LibraryTabs items={items} notes={notes} />
          )}
        </div>
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
