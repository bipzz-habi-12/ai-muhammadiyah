import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { artifactTypeLabels, type ArtifactType } from "@/lib/artifacts";
import { formatRelativeTime } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// Library v2: aggregates the user's Artifacts across all conversations
// (replaces the old Docs/Tasks/Sheets/Canvas aggregation). Mini-app category
// is deferred with the html_app/react_app stage.

type LibraryPageProps = {
  searchParams: Promise<{ kategori?: string }>;
};

type LibraryArtifactRow = {
  id: string;
  conversation_id: string;
  type: string;
  title: string;
  updated_at: string;
};

const categories: {
  slug: string | null;
  label: string;
  types: ArtifactType[] | null;
}[] = [
  { slug: null, label: "Semua", types: null },
  { slug: "dokumen", label: "Dokumen & data", types: ["document", "table"] },
  { slug: "visual", label: "Visual", types: ["diagram"] },
  { slug: "kode", label: "Kode", types: ["code"] },
];

const typeIcons: Record<string, string> = {
  document: "book",
  table: "sheets",
  diagram: "canvas",
  code: "tasks",
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { kategori } = await searchParams;
  const activeCategory =
    categories.find((category) => category.slug === kategori) ?? categories[0];

  let query = supabase
    .from("artifacts")
    .select("id,conversation_id,type,title,updated_at")
    .order("updated_at", { ascending: false })
    .limit(60);

  if (activeCategory.types) {
    query = query.in("type", activeCategory.types);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
  }

  const artifacts = (data ?? []) as LibraryArtifactRow[];

  return (
    <main className="min-h-dvh bg-[#f8f9fa] px-4 py-8 text-[#191c1d] sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#004d27] transition hover:text-[#006837]"
        >
          <span aria-hidden="true">&larr;</span>
          Kembali ke chat
        </Link>

        <header className="mt-4">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#004d27]">
            AI-mu
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Library</h1>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-[#3f4940]">
            Semua Artifact dari seluruh percakapanmu — dokumen, tabel, diagram,
            dan kode.
          </p>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.label}
              href={
                category.slug ? `/library?kategori=${category.slug}` : "/library"
              }
              className={
                category.slug === activeCategory.slug
                  ? "rounded-full bg-[#004d27] px-4 py-2 text-sm font-bold text-white"
                  : "rounded-full bg-white px-4 py-2 text-sm font-bold text-[#3f4940] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef]"
              }
            >
              {category.label}
            </Link>
          ))}
        </nav>

        {error ? (
          <p className="mt-6 rounded-[20px] bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">
            Artifact belum bisa dimuat. Coba muat ulang halaman.
          </p>
        ) : artifacts.length === 0 ? (
          <p className="mt-6 rounded-[20px] bg-white px-4 py-8 text-center text-sm leading-relaxed text-[#6f7a70] ring-1 ring-[#bec9be]">
            Belum ada artifact
            {activeCategory.slug ? " di kategori ini" : ""}. Minta AI membuat
            dokumen, tabel, diagram, atau kode di chat — hasilnya otomatis
            tersimpan di sini.
          </p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {artifacts.map((artifact) => (
              <li key={artifact.id}>
                <Link
                  href={`/?conversationId=${artifact.conversation_id}`}
                  className="flex h-full items-center gap-3 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#bec9be] transition hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#004d27]/10 text-[#004d27]">
                    <Icon
                      name={typeIcons[artifact.type] ?? "book"}
                      className="h-5 w-5"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-[#191c1d]">
                      {artifact.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs font-semibold text-[#6f7a70]">
                      <span className="rounded-full bg-[#004d27]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#004d27]">
                        {artifactTypeLabels[
                          artifact.type as ArtifactType
                        ] ?? artifact.type}
                      </span>
                      {formatRelativeTime(artifact.updated_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
