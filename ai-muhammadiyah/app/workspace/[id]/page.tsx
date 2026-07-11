import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// Additive v2 workspace page: lists this workspace's chats + shows its Workspace
// System. The active chat experience stays in the SPA at "/" — each chat links
// back there via ?conversationId=, picked up once by the SPA's deep-link effect.

type WorkspacePageProps = {
  params: Promise<{ id: string }>;
};

type ConversationListRow = {
  id: string;
  title: string;
  updated_at: string;
  is_pinned: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!uuidPattern.test(id)) {
    notFound();
  }

  // RLS scopes chat_workspaces to the owner, so a foreign workspace id resolves
  // to no row — rendered as 404, indistinguishable from a nonexistent one.
  const { data: workspace, error: workspaceError } = await supabase
    .from("chat_workspaces")
    .select("id,name,system_instructions,created_at")
    .eq("id", id)
    .maybeSingle();

  if (workspaceError) {
    console.error(workspaceError);
  }

  if (!workspace) {
    notFound();
  }

  const { data: conversationRows, error: conversationsError } = await supabase
    .from("conversations")
    .select("id,title,updated_at,is_pinned")
    .eq("workspace_id", id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (conversationsError) {
    console.error(conversationsError);
  }

  const conversations = (conversationRows ?? []) as ConversationListRow[];
  const systemInstructions = (workspace.system_instructions ?? "").trim();

  return (
    <main className="min-h-dvh bg-[#f8f9fa] px-4 py-8 text-[#191c1d] sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#004d27] transition hover:text-[#006837]"
        >
          <span aria-hidden="true">&larr;</span>
          Kembali ke chat
        </Link>

        <header className="mt-4">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#004d27]">
            Workspace
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            {workspace.name}
          </h1>
        </header>

        <section className="mt-6 rounded-[24px] bg-white p-5 ring-1 ring-[#bec9be]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#3f4940]">
            Workspace System
          </h2>
          {systemInstructions ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#191c1d]">
              {systemInstructions}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-[#6f7a70]">
              Belum ada instruksi permanen. Atur lewat tombol &ldquo;+ Workspace
              baru&rdquo; &rarr; Kelola workspace di halaman chat.
            </p>
          )}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3f4940]">
              Chat di workspace ini
            </h2>
            <span className="rounded-full bg-[#004d27]/10 px-2 py-1 text-xs font-bold text-[#004d27]">
              {conversations.length}
            </span>
          </div>

          {conversationsError ? (
            <p className="mt-3 rounded-[20px] bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">
              Daftar chat belum bisa dimuat. Coba muat ulang halaman.
            </p>
          ) : conversations.length === 0 ? (
            <p className="mt-3 rounded-[20px] bg-white px-4 py-6 text-center text-sm leading-relaxed text-[#6f7a70] ring-1 ring-[#bec9be]">
              Belum ada chat di workspace ini. Mulai obrolan baru dari halaman
              chat, atau pindahkan chat lama lewat menu &ldquo;Pindah ke
              workspace&rdquo;.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    href={`/?conversationId=${conversation.id}`}
                    className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#bec9be] transition hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#004d27]/10 text-[#004d27]">
                      <Icon name="history" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-bold text-[#191c1d]">
                          {conversation.title}
                        </span>
                        {conversation.is_pinned && (
                          <span className="shrink-0 rounded-full bg-[#fdc003] px-2 py-0.5 text-[10px] font-bold text-[#6c5000]">
                            Pinned
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-[#6f7a70]">
                        {formatRelativeTime(conversation.updated_at)}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[#6f7a70]"
                    >
                      &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
