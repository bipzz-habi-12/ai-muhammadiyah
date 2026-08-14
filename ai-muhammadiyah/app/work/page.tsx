import Link from "next/link";
import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import { formatRelativeTime, getEmailInitials } from "@/lib/formatting/text";
import { mapSkillRow, SKILL_COLUMNS, type SkillRow } from "@/lib/skills";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import WorkLauncher from "./WorkLauncher";

// M-Agent: Work — pekerjaan kantor/organisasi di atas infrastruktur yang sudah
// ada (skill + chat + artifact). Tidak ada tabel baru dan tidak ada backend
// baru: halaman ini adalah peluncur, dan pekerjaan sebenarnya tetap terjadi di
// chat dengan skill kategori 'Kerja' aktif.
//
// Dua bagian yang datanya NYATA, bukan mock:
//   1. Skill kerja bawaan, dibaca dari kolom skills.category = 'Kerja'
//      (di-seed migrasi 20260814000000_seed_work_skills.sql).
//   2. Pekerjaan terakhir = percakapan yang benar-benar memakai salah satu
//      skill itu (messages.skill_id), BUKAN daftar artifact generik — itu
//      sudah jadi tugas /library dan /research, dan menyebut artifact apa pun
//      sebagai "hasil kerja" akan menyesatkan.
//
// Sebelum migrasinya di-apply, bagian skill & pekerjaan terakhir kosong dengan
// sendirinya sementara template tetap berfungsi (mengirim ?ask= tanpa ?skill=).

const WORK_SKILL_CATEGORY = "Kerja";

type ConversationRow = {
  id: string;
  title: string | null;
  updated_at: string;
};

export default async function WorkPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: skillData } = await supabase
    .from("skills")
    .select(SKILL_COLUMNS)
    .is("owner_id", null)
    .eq("category", WORK_SKILL_CATEGORY)
    .order("min_tier", { ascending: true })
    .order("name", { ascending: true });

  const workSkills = ((skillData ?? []) as SkillRow[]).map(mapSkillRow);

  // Percakapan yang memakai skill kerja. Dua langkah dengan sengaja: ambil
  // pesan terbaru yang ber-skill kerja, dedupe di JS, baru ambil judulnya —
  // lebih mudah dibaca daripada join bersarang, dan RLS tetap menjaga
  // keduanya. Dilewati sepenuhnya bila belum ada skill kerja sama sekali.
  let recentConversations: ConversationRow[] = [];

  if (workSkills.length > 0) {
    const { data: messageData } = await supabase
      .from("messages")
      .select("conversation_id")
      .in(
        "skill_id",
        workSkills.map((skill) => skill.id),
      )
      .order("created_at", { ascending: false })
      .limit(80);

    const conversationIds = [
      ...new Set(
        ((messageData ?? []) as { conversation_id: string }[]).map(
          (row) => row.conversation_id,
        ),
      ),
    ].slice(0, 12);

    if (conversationIds.length > 0) {
      const { data: conversationData } = await supabase
        .from("conversations")
        .select("id,title,updated_at")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      recentConversations = (conversationData ?? []) as ConversationRow[];
    }
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--ink)]">
      <AppShellRail
        active="work"
        userInitials={getEmailInitials(user.email ?? "")}
      />

      <div className="scroll flex-1 overflow-y-auto bg-[var(--background)]">
        <div className="mx-auto max-w-[1060px] px-6 pb-20 pt-11 sm:px-12">
          <header className="mb-7">
            <div className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[var(--gold-ink)]">
              Work
            </div>
            <h1 className="font-serif text-[38px] font-normal leading-tight tracking-[-0.015em] text-[var(--ink-deep)]">
              Pekerjaan kantor, selesai dalam satu percakapan.
            </h1>
            <p className="mt-3 max-w-[620px] text-base leading-relaxed text-[var(--muted-2)]">
              Surat resmi, notulen rapat, proposal dan LPJ, sampai rencana
              kerja — mulai dari template di bawah, atau tulis sendiri apa yang
              kamu butuhkan.
            </p>
          </header>

          <WorkLauncher skills={workSkills} />

          {workSkills.length > 0 && (
            <section className="mt-11">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-[var(--muted)]">
                  Skill kerja
                </span>
                <span className="text-[13px] text-[var(--muted-3)]">
                  {workSkills.length} skill
                </span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {workSkills.map((skill) => (
                  <Link
                    key={skill.id}
                    href={`/?skill=${encodeURIComponent(skill.slashCommand ?? "")}`}
                    className="rounded-[13px] border border-[var(--brand-deep-line)]/10 bg-[var(--surface)] px-5 py-4 transition duration-150 hover:-translate-y-0.5 hover:border-[var(--brand)]/35"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[var(--c-1b2721)]">
                        {skill.name}
                      </span>
                      {skill.minTier !== "free" && (
                        <span className="rounded-full bg-[var(--gold)]/25 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--gold-ink)]">
                          Premium
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[13px] text-[var(--brand)]">
                      {skill.slashCommand}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {recentConversations.length > 0 && (
            <section className="mt-11">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-[var(--muted)]">
                  Pekerjaan terakhir
                </span>
                <span className="text-[13px] text-[var(--muted-3)]">
                  {recentConversations.length} percakapan
                </span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {recentConversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/?conversationId=${conversation.id}`}
                    className="flex items-center gap-4 rounded-[13px] border border-[var(--brand-deep-line)]/10 bg-[var(--surface)] px-5 py-4 transition duration-150 hover:-translate-y-0.5 hover:border-[var(--brand)]/35"
                  >
                    <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[var(--brand)]/10 text-lg text-[var(--brand)]">
                      ▤
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 truncate text-[15px] font-semibold text-[var(--c-1b2721)]">
                        {conversation.title || "Obrolan tanpa judul"}
                      </div>
                      <div className="text-[13px] text-[var(--muted-3)]">
                        {formatRelativeTime(conversation.updated_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
