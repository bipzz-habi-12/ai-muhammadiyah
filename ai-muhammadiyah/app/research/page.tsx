import Link from "next/link";
import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import { artifactTypeLabels, type ArtifactType } from "@/lib/artifacts";
import { formatRelativeTime } from "@/lib/formatting/text";
import { getEmailInitials } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import ResearchWorkbench from "./ResearchWorkbench";

// Research v2 (Research.dc.html port) — HONEST version. The app has no research
// synthesis backend, so the design's synthesized findings + numbered journal
// citations (all invented) are NOT rendered. Instead: a real ask bar that
// launches a /riset chat, plus the user's real saved artifacts (RLS-scoped).

type ArtifactRow = {
  id: string;
  conversation_id: string;
  type: string;
  title: string;
  updated_at: string;
};

export default async function ResearchPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Real saved outputs. Documents/tables/diagrams are the research-shaped ones.
  const { data } = await supabase
    .from("artifacts")
    .select("id,conversation_id,type,title,updated_at")
    .in("type", ["document", "table", "diagram"])
    .order("updated_at", { ascending: false })
    .limit(24);

  const artifacts = (data ?? []) as ArtifactRow[];

  return (
    <main className="flex h-dvh overflow-hidden bg-[#f5f3ec] text-[#16211c]">
      <AppShellRail active="research" userInitials={getEmailInitials(user.email ?? "")} />

      <div className="scroll flex-1 overflow-y-auto bg-[#f5f3ec]">
        <div className="mx-auto max-w-[1060px] px-6 pb-20 pt-11 sm:px-12">
          <header className="mb-6">
            <div className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[#b08833]">
              Research
            </div>
            <h1 className="font-serif text-[38px] font-normal leading-tight tracking-[-0.015em] text-[#12211b]">
              Bukti, disintesis dan bisa ditelusuri.
            </h1>
            <p className="mt-3 max-w-[600px] text-base leading-relaxed text-[#5d6862]">
              Ajukan pertanyaan riset — sistem menarik literatur nyata dari
              katalog terbuka{" "}
              <span className="font-semibold text-[#0f5a3d]">OpenAlex</span> lalu
              menyusun sintesis bersitasi yang bisa kamu simpan sebagai artifact.
            </p>
          </header>

          <ResearchWorkbench />

          <div className="mb-4 flex items-center justify-between">
            <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#7c857f]">
              Riset tersimpan
            </span>
            <span className="text-[13px] text-[#8a9089]">
              {artifacts.length} artifact
            </span>
          </div>

          {artifacts.length === 0 ? (
            <div className="rounded-[13px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-6 py-10 text-center text-sm leading-relaxed text-[#6b746e]">
              Belum ada riset tersimpan. Ajukan pertanyaan di atas, lalu simpan
              hasil sintesisnya sebagai artifact — akan muncul di sini dan di
              Library.
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {artifacts.map((artifact) => (
                <Link
                  key={artifact.id}
                  href={`/?conversationId=${artifact.conversation_id}`}
                  className="flex items-center gap-4 rounded-[13px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-5 py-4 transition duration-150 hover:-translate-y-0.5 hover:border-[#0f5a3d]/35"
                >
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#0f5a3d]/10 text-lg text-[#0f5a3d]">
                    ◧
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 truncate text-[15px] font-semibold text-[#1b2721]">
                      {artifact.title}
                    </div>
                    <div className="text-[13px] text-[#8a9089]">
                      {artifactTypeLabels[artifact.type as ArtifactType] ??
                        "Artifact"}{" "}
                      · {formatRelativeTime(artifact.updated_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
