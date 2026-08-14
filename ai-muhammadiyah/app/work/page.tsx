import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import { isGoogleConnectorConfigured } from "@/lib/connectors/google";
import { getEmailInitials } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import ConnectorCard from "./ConnectorCard";

// M-Agent: Work — menghubungkan M-Agent ke aplikasi lain, lalu bekerja dengan
// aplikasi itu dari dalam chat.
//
// Halaman ini SENGAJA tidak memuat daftar skill atau template lagi: fungsi Work
// adalah konektivitas, dan aksi sesungguhnya terjadi di chat lewat tool
// (lib/ai/tools.ts). Menaruh tombol-tombol yang meniru pekerjaan di sini hanya
// akan jadi lapisan kedua yang harus dijaga sinkron dengan tool.
//
// Status koneksi dibaca lewat RPC get_my_connections (security definer) — tabel
// user_connections sendiri MENOLAK semua akses klien karena berisi token.

type ConnectionRow = {
  provider: string;
  account_email: string | null;
  connected_at: string;
};

export default async function WorkPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Gagal (mis. migrasi belum di-apply) diperlakukan sebagai "belum ada
  // koneksi" supaya halaman tetap terbuka dan menjelaskan keadaannya, bukan
  // melempar 500 ke pengguna.
  const { data, error } = await supabase.rpc("get_my_connections");

  if (error) {
    console.error("Reading connections failed:", error);
  }

  const connections = (data ?? []) as ConnectionRow[];
  const google = connections.find((row) => row.provider === "google") ?? null;

  return (
    <main className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--ink)]">
      <AppShellRail
        active="work"
        userInitials={getEmailInitials(user.email ?? "")}
      />

      <div className="scroll flex-1 overflow-y-auto bg-[var(--background)]">
        <div className="mx-auto max-w-[860px] px-6 pb-20 pt-11 sm:px-12">
          <header className="mb-9">
            <div className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[var(--gold-ink)]">
              Work
            </div>
            <h1 className="font-serif text-[38px] font-normal leading-tight tracking-[-0.015em] text-[var(--ink-deep)]">
              Hubungkan aplikasimu, lalu kerjakan dari sini.
            </h1>
            <p className="mt-3 max-w-[620px] text-base leading-relaxed text-[var(--muted-2)]">
              Setelah tersambung, kamu bisa meminta langsung di chat — misalnya
              &ldquo;simpan laporan ini ke Drive&rdquo; atau &ldquo;ringkas
              dokumen proposal dari Drive&rdquo; — dan M-Agent yang
              mengerjakannya.
            </p>
          </header>

          <ConnectorCard
            isConfigured={isGoogleConnectorConfigured()}
            accountEmail={google?.account_email ?? null}
            connectedAt={google?.connected_at ?? null}
          />

          <section className="mt-10">
            <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.05em] text-[var(--muted)]">
              Yang bisa diminta setelah tersambung
            </div>
            <ul className="space-y-2 text-[14.5px] leading-relaxed text-[var(--muted-2)]">
              <li>&ldquo;Buatkan notulen rapat ini, lalu simpan ke Drive saya.&rdquo;</li>
              <li>&ldquo;Cari berkas proposal di Drive, ringkas isinya.&rdquo;</li>
              <li>&ldquo;Susun laporan bulanan dan simpan sebagai Google Docs.&rdquo;</li>
            </ul>
          </section>

          <p className="mt-10 rounded-[13px] border border-[var(--brand-deep-line)]/10 bg-[var(--surface)] px-5 py-4 text-[13.5px] leading-relaxed text-[var(--muted-3)]">
            M-Agent memakai izin Google paling sempit yang tersedia
            (<span className="font-mono">drive.file</span>): hanya berkas yang
            dibuat lewat M-Agent atau yang kamu pilih sendiri yang bisa
            dijangkau. Seluruh isi Drive dan Gmail-mu tidak pernah terbaca. Kamu
            bisa memutus sambungan kapan saja, dan izinnya ikut dicabut di akun
            Google-mu.
          </p>
        </div>
      </div>
    </main>
  );
}
