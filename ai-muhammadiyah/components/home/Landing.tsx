import Link from "next/link";

// Design v2 landing (Home.dc.html port). Static server component — no props,
// hooks, or client JS (the design's scroll-reveal is progressive enhancement we
// omit to keep this server-rendered). Copy is Indonesian to match the app, and
// deliberately honest: the app's chat is auth-gated, so the design's "no sign-up
// to try / no account needed" claims are dropped. All links point to real routes.

// Diamond-grid textures (inline data URIs so they need no external asset).
const greenPattern =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cg fill='none' stroke='%230F5A3D' stroke-opacity='.05' stroke-width='1'%3E%3Crect x='24' y='24' width='48' height='48'/%3E%3Crect x='24' y='24' width='48' height='48' transform='rotate(45 48 48)'/%3E%3C/g%3E%3C/svg%3E\")";
const whitePattern =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cg fill='none' stroke='%23FFFFFF' stroke-opacity='.06' stroke-width='1'%3E%3Crect x='24' y='24' width='48' height='48'/%3E%3Crect x='24' y='24' width='48' height='48' transform='rotate(45 48 48)'/%3E%3C/g%3E%3C/svg%3E\")";

const starterPrompts = [
  { icon: "✎", tint: "#B08833", text: "Susun RPP Surah Al-Ma'un untuk kelas 8" },
  { icon: "۩", tint: "#0F5A3D", text: "Apakah kripto kena zakat?" },
  { icon: "◑", tint: "#2E6E8E", text: "Ringkas riset tentang keuangan mikro syariah" },
];

const pillars = [
  {
    n: "01",
    icon: "▤",
    iconTint: "#0F5A3D",
    iconBg: "rgba(15,90,61,0.1)",
    title: "Workspace berisi banyak chat",
    body: "Satu workspace, banyak percakapan — semuanya mewarisi satu Workspace System permanen yang kamu tulis sekali.",
  },
  {
    n: "02",
    icon: "/",
    iconTint: "#0F5A3D",
    iconBg: "rgba(15,90,61,0.1)",
    title: "Skill, dipanggil dengan garis miring",
    body: "Ketik /riset atau /tarjih untuk memfokuskan satu pesan pada bidang tertentu. Kamu juga bisa membuat skill sendiri.",
  },
  {
    n: "03",
    icon: "◧",
    iconTint: "#B08833",
    iconBg: "rgba(176,136,51,0.14)",
    title: "Artifact, dibentuk oleh AI",
    body: "Dokumen, tabel, diagram, kode — muncul di panel samping dan otomatis tersimpan ke Library-mu.",
  },
  {
    n: "04",
    icon: "۩",
    iconTint: "#B08833",
    iconBg: "rgba(176,136,51,0.14)",
    title: "Muhammadiyah Hub",
    body: "Basis pengetahuan resmi yang selalu gratis — putusan tarjih, dokumen, dan rujukan untuk menopang jawaban.",
  },
];

const audiences = [
  { title: "Pelajar & guru", body: "RPP, panduan belajar, dan bantuan penilaian yang berpijak pada kurikulum." },
  { title: "Peneliti & dosen", body: "Tinjauan literatur, sintesis bukti, dan penulisan bersitasi di workspace riset." },
  { title: "Developer", body: "Artifact kode dan mini app yang berjalan langsung di panel." },
  { title: "Sekolah & kampus", body: "Basis pengetahuan bersama, dasbor admin, dan akses per-seat." },
  { title: "Rumah sakit & klinik", body: "Skill medis dengan sikap evidence-first dan sumber yang bisa dilacak." },
  { title: "Organisasi", body: "Pengetahuan seluruh organisasi, SSO, dan audit log di Enterprise." },
];

function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-[9px] bg-[#0f5a3d] font-bold text-[#f5f3ec]"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      م
    </span>
  );
}

export default function Landing() {
  return (
    <div className="min-h-dvh bg-[#f5f3ec] text-[#16211c]">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-[#0b3d2a]/[0.09] bg-[#f5f3ec]/85 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-6 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Logo />
            <span className="text-[16.5px] font-semibold tracking-[-0.01em]">
              AI Muhammadiyah
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-[14.5px] text-[#4a554f] md:flex">
            <a href="#platform" className="transition hover:text-[#0f5a3d]">Platform</a>
            <a href="#hub" className="transition hover:text-[#0f5a3d]">Knowledge Base</a>
            <a href="#audience" className="transition hover:text-[#0f5a3d]">Untuk semua</a>
          </nav>
          <div className="flex items-center gap-3.5">
            <Link href="/login" className="text-[14.5px] font-medium text-[#2b362f] transition hover:text-[#0f5a3d]">
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-[10px] bg-[#0f5a3d] px-[18px] py-2.5 text-[14.5px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a]"
            >
              Mulai
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        className="relative mx-auto max-w-[1180px] px-6 pb-10 pt-20 sm:px-8 sm:pt-24"
        style={{ backgroundImage: greenPattern, backgroundSize: "96px 96px" }}
      >
        <div className="relative max-w-[860px]">
          <div className="mb-7 inline-flex items-center gap-2.5 rounded-full bg-[#0f5a3d]/[0.08] px-3.5 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-[#0f5a3d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b08833]" />
            Islam Berkemajuan · ditopang Knowledge Base yang hidup
          </div>
          <h1 className="font-serif text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-[#12211b] sm:text-[64px]">
            AI yang bisa dikustomisasi, berpijak pada{" "}
            <em className="italic text-[#0f5a3d]">ilmu dan nilai yang abadi.</em>
          </h1>
          <p className="mt-6 max-w-[640px] text-[18px] leading-relaxed text-[#465049] sm:text-[19px]">
            Belajar, bekerja, meneliti, dan membangun dalam satu platform — dengan
            Muhammadiyah Knowledge Base di balik setiap jawaban. Terbuka untuk
            semua, bukan hanya warga Muhammadiyah.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Link
              href="/login"
              className="rounded-[11px] bg-[#0f5a3d] px-6 py-3.5 text-[15px] font-semibold text-[#f5f3ec] transition hover:-translate-y-px hover:bg-[#0a3d2a]"
            >
              Buka workspace
            </Link>
            <Link
              href="/login"
              className="rounded-[11px] border border-[#0b3d2a]/16 px-6 py-3.5 text-[15px] font-semibold text-[#16211c] transition hover:border-[#0f5a3d]"
            >
              Lihat langsung di chat →
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-[13.5px] text-[#7c857f]">
            <span className="text-[#0f5a3d]" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-2px]">
                <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
                <path d="M7.5 10.5V7.2a4.5 4.5 0 0 1 9 0v3.3" />
              </svg>
            </span>
            Privat secara bawaan · percakapanmu tidak pernah dipakai untuk melatih model
          </p>

          {/* STARTER PROMPTS */}
          <div className="mt-9">
            <div className="mb-3 text-[12.5px] font-semibold text-[#8a9089]">
              Contoh yang bisa kamu tanyakan
            </div>
            <div className="flex max-w-[720px] flex-wrap gap-2.5">
              {starterPrompts.map((prompt) => (
                <Link
                  key={prompt.text}
                  href="/login"
                  className="inline-flex items-center gap-2.5 rounded-[12px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-4 py-3 text-sm text-[#25302a] transition hover:-translate-y-px hover:border-[#0f5a3d]"
                >
                  <span style={{ color: prompt.tint }}>{prompt.icon}</span>
                  {prompt.text}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* PRODUCT PREVIEW */}
        <div className="mt-16 overflow-hidden rounded-[18px] border border-[#0b3d2a]/11 bg-[#fbfaf6] shadow-[0_24px_60px_-40px_rgba(11,61,42,0.5)]">
          <div className="flex h-11 items-center gap-2 border-b border-[#0b3d2a]/[0.08] bg-[#f3f1e9] px-5">
            <span className="h-[11px] w-[11px] rounded-full bg-[#d6d2c4]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#d6d2c4]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#d6d2c4]" />
            <span className="ml-4 text-[12.5px] text-[#8a9089]">
              aimuhammadiyah.my.id / workspace / riset
            </span>
          </div>
          <div className="grid min-h-[340px] md:grid-cols-[1.5fr_1fr]">
            <div className="border-b border-[#0b3d2a]/[0.07] px-8 py-9 md:border-b-0 md:border-r">
              <div className="mb-3.5 text-xs font-semibold uppercase tracking-[0.05em] text-[#0f5a3d]">
                Chat
              </div>
              <p className="max-w-[440px] font-serif text-[20px] leading-relaxed text-[#25302a]">
                &ldquo;Susun RPP tentang <em className="italic">Al-Ma&apos;un</em> untuk kelas 8, evidence-based, dengan aktivitas refleksi singkat.&rdquo;
              </p>
              <div className="mt-5 max-w-[460px] rounded-[12px] border border-[#0b3d2a]/[0.06] bg-[#f3f1e9] px-5 py-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <Logo size={22} />
                  <span className="text-[12.5px] text-[#7c857f]">membuat artifact dokumen…</span>
                </div>
                <div className="mb-2 h-2 w-[92%] rounded bg-[#0b3d2a]/[0.09]" />
                <div className="mb-2 h-2 w-[76%] rounded bg-[#0b3d2a]/[0.09]" />
                <div className="h-2 w-[84%] rounded bg-[#0b3d2a]/[0.09]" />
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0f5a3d]/[0.07] px-3 py-1.5 text-[13px] font-semibold text-[#0f5a3d]">
                <span>/</span> tarjih · skill Islamic Studies aktif
              </div>
            </div>
            <div className="bg-[#f7f5ee] px-7 py-6">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-[#b08833]">
                Artifact · Dokumen
              </div>
              <div className="font-serif text-[#25302a]">
                <div className="mb-3 text-[18px] font-medium">RPP — Surah Al-Ma&apos;un</div>
                <div className="mb-2.5 h-[7px] w-[88%] rounded bg-[#0b3d2a]/[0.08]" />
                <div className="mb-2.5 h-[7px] w-[70%] rounded bg-[#0b3d2a]/[0.08]" />
                <div className="mb-4 h-[7px] w-[80%] rounded bg-[#0b3d2a]/[0.08]" />
                <div className="mb-2.5 h-[7px] w-[64%] rounded bg-[#0b3d2a]/[0.08]" />
                <div className="h-[7px] w-[74%] rounded bg-[#0b3d2a]/[0.08]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="mx-auto max-w-[1180px] border-b border-[#0b3d2a]/[0.08] px-6 py-14 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <span className="text-[13px] tracking-[0.02em] text-[#8a9089]">
            Dibangun di atas model yang sudah dipercaya
          </span>
          <div className="flex flex-wrap items-center gap-x-9 gap-y-3 text-[15px] font-semibold text-[#9aa099]">
            <span>GPT-5</span>
            <span>Gemini 2.5</span>
            <span>OpenRouter</span>
            <span>Supabase</span>
            <span>Vercel</span>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section id="platform" className="mx-auto max-w-[1180px] px-6 pb-10 pt-24 sm:px-8">
        <div className="mb-14 max-w-[620px]">
          <div className="mb-4 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[#b08833]">
            Platform
          </div>
          <h2 className="font-serif text-[36px] font-normal leading-[1.1] tracking-[-0.015em] text-[#12211b] sm:text-[42px]">
            Satu bidang kerja yang fleksibel. Bukan SaaS kaku lainnya.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#4a554f]">
            Empat gagasan yang menyatukan semuanya — workspace yang mengingat,
            skill yang dipanggil inline, artifact yang dibentuk AI, dan basis
            pengetahuan yang bisa dipercaya.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {pillars.map((pillar) => (
            <div
              key={pillar.n}
              className="rounded-[16px] border border-[#0b3d2a]/11 bg-[#fbfaf6] p-8 transition hover:-translate-y-[3px] hover:border-[#0f5a3d]/40"
            >
              <div className="mb-5 flex items-start justify-between">
                <div
                  className="grid h-11 w-11 place-items-center rounded-[11px] text-xl"
                  style={{ background: pillar.iconBg, color: pillar.iconTint }}
                >
                  {pillar.icon}
                </div>
                <span className="font-serif text-base italic text-[#b08833]">{pillar.n}</span>
              </div>
              <h3 className="mb-2.5 text-[20px] font-semibold tracking-[-0.01em]">
                {pillar.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-[#4a554f]">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* KNOWLEDGE BAND */}
      <section
        id="hub"
        className="mt-16 bg-[#0b3d2a] text-[#ede9dc]"
        style={{ backgroundImage: whitePattern, backgroundSize: "96px 96px" }}
      >
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 py-20 sm:px-8 md:grid-cols-2 md:gap-16">
          <div>
            <div className="mb-4 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[#c7a560]">
              Berpijak, bukan menebak
            </div>
            <h2 className="font-serif text-[34px] font-normal leading-[1.12] tracking-[-0.015em] text-[#f3efe2] sm:text-[40px]">
              Setiap jawaban berdiri di atas basis pengetahuan yang bisa kamu sebut namanya.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-[#b9c3b7]">
              Workspace System, skill aktif, dan Muhammadiyah Hub bergabung di
              setiap pesan — agar panduan tetap evidence-based, bersitasi, dan
              setia pada Islam berkemajuan.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex rounded-[11px] bg-[#e7c77e] px-6 py-3.5 text-[15px] font-semibold text-[#0b3d2a] transition hover:brightness-[1.05]"
            >
              Jelajahi chat langsung →
            </Link>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="rounded-[13px] border border-white/10 bg-white/[0.05] px-5 py-5">
              <div className="mb-1.5 text-[12.5px] font-semibold text-[#c7a560]">
                Workspace System · permanen
              </div>
              <div className="font-serif text-base italic text-[#e4e0d2]">
                &ldquo;Selalu jawab evidence-based dan sertakan referensi jurnal.&rdquo;
              </div>
            </div>
            <div className="rounded-[13px] border border-white/10 bg-white/[0.05] px-5 py-5">
              <div className="mb-1.5 text-[12.5px] font-semibold text-[#c7a560]">
                Skill aktif · pesan ini
              </div>
              <div className="text-[15px] text-[#e4e0d2]">
                /tarjih — Islamic Studies, metodologi Majelis Tarjih
              </div>
            </div>
            <div className="rounded-[13px] border border-white/10 bg-white/[0.05] px-5 py-5">
              <div className="mb-1.5 text-[12.5px] font-semibold text-[#c7a560]">
                Muhammadiyah Hub · bersitasi
              </div>
              <div className="text-[15px] text-[#e4e0d2]">
                3 rujukan dilampirkan ke jawaban
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section id="audience" className="mx-auto max-w-[1180px] px-6 pb-10 pt-24 sm:px-8">
        <div className="mb-12 max-w-[620px]">
          <div className="mb-4 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[#b08833]">
            Untuk semua
          </div>
          <h2 className="font-serif text-[36px] font-normal leading-[1.1] tracking-[-0.015em] text-[#12211b] sm:text-[42px]">
            Satu platform, banyak panggilan.
          </h2>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((audience) => (
            <div
              key={audience.title}
              className="rounded-[14px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-6 py-6"
            >
              <div className="mb-1.5 text-base font-semibold">{audience.title}</div>
              <div className="text-sm leading-relaxed text-[#5d6862]">{audience.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1180px] px-6 pb-24 pt-14 sm:px-8">
        <div
          className="rounded-[20px] border border-[#0b3d2a]/11 bg-[#fbfaf6] px-8 py-16 text-center sm:px-14"
          style={{ backgroundImage: greenPattern, backgroundSize: "96px 96px" }}
        >
          <h2 className="mx-auto max-w-[640px] font-serif text-[34px] font-normal leading-[1.12] tracking-[-0.015em] text-[#12211b] sm:text-[40px]">
            Mulai dari sebuah workspace. Biarkan pekerjaan menemukan bentuknya sendiri.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="rounded-[11px] bg-[#0f5a3d] px-7 py-3.5 text-[15px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a]"
            >
              Mulai gratis
            </Link>
            <Link
              href="/login"
              className="rounded-[11px] border border-[#0b3d2a]/16 px-6 py-3.5 text-[15px] font-semibold text-[#16211c] transition hover:border-[#0f5a3d]"
            >
              Masuk
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#0b3d2a]/[0.08] bg-[#f1efe7]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-5 px-6 py-11 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <span className="text-[15px] font-semibold">AI Muhammadiyah</span>
          </div>
          <div className="flex flex-wrap gap-7 text-sm text-[#5d6862]">
            <a href="#platform" className="transition hover:text-[#0f5a3d]">Platform</a>
            <a href="#hub" className="transition hover:text-[#0f5a3d]">Knowledge Base</a>
            <Link href="/plans" className="transition hover:text-[#0f5a3d]">Harga</Link>
            <Link href="/login" className="transition hover:text-[#0f5a3d]">Masuk</Link>
          </div>
          <span className="text-[13px] text-[#8a9089]">
            Islam Berkemajuan · aimuhammadiyah.my.id
          </span>
        </div>
      </footer>
    </div>
  );
}
