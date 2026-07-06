import Image from "next/image";
import Link from "next/link";
import { Geist, Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const geist = Geist({ subsets: ["latin"], weight: ["400", "500"] });

const targetUsers = [
  "Pelajar",
  "Guru dan dosen",
  "Peneliti",
  "Developer",
  "Organisasi",
  "Sekolah dan kampus",
];

const features = [
  {
    icon: WorkIcon,
    iconBg: "bg-[#004d27] text-[#8ee4a6]",
    title: "Workspace + Skill",
    description:
      "AI yang beradaptasi dengan bidang Anda. Sesuaikan konteks kerja dan asisten digital pribadi yang memahami workflow unik Anda.",
  },
  {
    icon: LibraryIcon,
    iconBg: "bg-[#fdc003] text-[#6c5000]",
    title: "Muhammadiyah Hub",
    description:
      "Akses HPT, Fatwa Tarjih, dan panduan resmi organisasi. Sumber literasi tepercaya dalam satu antarmuka AI yang cerdas.",
  },
  {
    icon: SchoolIcon,
    iconBg: "bg-[#4851aa] text-[#cbceff]",
    title: "Study tools",
    description:
      "Catatan, kuis, flashcards, dan peta pikiran otomatis. Transformasi materi belajar menjadi pengetahuan terstruktur dalam hitungan detik.",
  },
];

function VerifiedIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}

function WorkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

function LibraryIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
      <path d="M8 2v15" />
    </svg>
  );
}

function SchoolIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
      <path d="m22 10-10-5-10 5 10 5 10-5Z" />
      <path d="M6 12.5V16c2.8 2 9.2 2 12 0v-3.5" />
    </svg>
  );
}

function BoltIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className={`${inter.className} bg-[#f8f9fa] text-[#191c1d]`}>
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-[#e1e3e4] bg-[#f8f9fa]">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="AI Muhammadiyah Logo" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-[24px] font-bold leading-[32px] text-[#004d27]">
              AI Muhammadiyah
            </span>
          </div>
          <div className={`${geist.className} flex items-center gap-4`}>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-[14px] leading-[20px] tracking-[0.01em] text-[#3f4940] transition-colors hover:bg-[#e7e8e9]"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#004d27] px-4 py-2 text-[14px] leading-[20px] tracking-[0.01em] text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              Daftar
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(255,193,7,0.05)_0%,rgba(255,255,255,0)_70%)] px-8 py-20 text-center">
          <div className="mx-auto flex max-w-[800px] flex-col items-center gap-6">
            <div className={`${geist.className} inline-flex items-center gap-2 rounded-full border border-[#bec9be] bg-[#e7e8e9] px-4 py-1`}>
              <VerifiedIcon className="h-[18px] w-[18px] text-[#004d27]" />
              <span className="text-[14px] leading-[20px] tracking-[0.01em] text-[#3f4940]">
                Muhammadiyah Knowledge Base
              </span>
            </div>
            <h1 className="text-[32px] font-bold leading-tight tracking-tight text-[#191c1d] md:text-[48px] md:leading-[56px] md:tracking-[-0.02em]">
              Platform AI yang dapat dikustomisasi untuk{" "}
              <span className="text-[#004d27]">belajar, bekerja, dan meneliti</span>
            </h1>
            <p className="max-w-[600px] text-[18px] leading-[28px] text-[#3f4940]">
              Berbasis nilai Islam berkemajuan dan Muhammadiyah Knowledge Base untuk mendukung produktivitas Anda.
            </p>
            <div className={`${geist.className} mt-4 flex w-full flex-col gap-4 sm:w-auto sm:flex-row`}>
              <button className="rounded-xl bg-[#004d27] px-12 py-4 text-[14px] leading-[20px] tracking-[0.01em] text-white transition-all hover:shadow-lg active:scale-95">
                Mulai gratis
              </button>
              <button className="rounded-xl border border-[#004d27] px-12 py-4 text-[14px] leading-[20px] tracking-[0.01em] text-[#004d27] transition-all hover:bg-[#004d27]/5">
                Lihat Muhammadiyah Hub
              </button>
            </div>
          </div>
        </section>

        {/* Target Users Chips */}
        <section className="border-y border-[#e1e3e4] bg-[#f8f9fa] py-6">
          <div className={`${geist.className} flex gap-4 overflow-x-auto px-8`}>
            {targetUsers.map((user) => (
              <div
                key={user}
                className="flex-none cursor-default rounded-full border border-[#bec9be] bg-[#f3f4f5] px-6 py-2 text-[14px] leading-[20px] tracking-[0.01em] text-[#191c1d] transition-colors hover:bg-[#e7e8e9]"
              >
                {user}
              </div>
            ))}
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto max-w-7xl px-8 py-20">
          <div className="grid grid-cols-1 gap-6">
            {features.map(({ icon: FeatureIcon, iconBg, title, description }) => (
              <div
                key={title}
                className="group rounded-xl border border-[#e1e3e4] bg-white p-6 transition-all hover:border-[#004d27]/30"
              >
                <div className="flex flex-col gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBg} transition-transform group-hover:scale-110`}>
                    <FeatureIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-[24px] font-semibold leading-[32px] text-[#191c1d]">
                      {title}
                    </h3>
                    <p className="text-[16px] leading-[24px] text-[#3f4940]">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Document-Centric Showcase */}
        <section className="overflow-hidden bg-[#f3f4f5] px-8 py-20">
          <div className="mx-auto max-w-[800px]">
            <div className="overflow-hidden rounded-xl border border-[#bec9be] bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-[#e1e3e4] bg-[#f8f9fa] p-4">
                <div className="h-3 w-3 rounded-full bg-[#ba1a1a]" />
                <div className="h-3 w-3 rounded-full bg-[#fdc003]" />
                <div className="h-3 w-3 rounded-full bg-[#004d27]" />
                <div className={`${geist.className} ml-4 text-[14px] leading-[20px] tracking-[0.01em] text-[#3f4940] opacity-60`}>
                  AI Assistant Stream
                </div>
              </div>
              <div className="flex flex-col gap-6 p-6">
                <div className="flex gap-4">
                  <div className="h-8 w-8 flex-none rounded bg-[#e7e8e9]" />
                  <div className="rounded-lg rounded-tl-none bg-[#f3f4f5] p-4 text-[16px] leading-[24px]">
                    Bagaimana AI dapat membantu riset saya tentang tajdid?
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded bg-[#004d27]">
                    <BoltIcon className="h-[18px] w-[18px] text-[#8ee4a6]" />
                  </div>
                  <div className="rounded-lg rounded-tl-none border border-[#004d27]/10 bg-[rgba(0,77,39,0.02)] p-4 text-[16px] leading-[24px]">
                    Berdasarkan{" "}
                    <span className="font-medium text-[#2f3891]">
                      Muhammadiyah Knowledge Base [1]
                    </span>
                    , saya dapat memetakan evolusi pemikiran Tajdid dari era KH Ahmad Dahlan hingga modern, serta merangkum literatur utama untuk Anda...
                    <div className="mt-2 cursor-pointer text-[12px] font-medium text-[#2f3891] hover:underline">
                      [1] Risalah Islam Berkemajuan
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#e1e3e4] bg-white py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="AI Muhammadiyah Logo" width={24} height={24} className="h-6 w-6 object-contain" />
              <span className="text-[24px] font-bold leading-[32px] text-[#004d27]">
                AI Muhammadiyah
              </span>
            </div>
            <p className="text-[16px] leading-[24px] text-[#3f4940] opacity-70">
              © 2026 AI Muhammadiyah. Semua hak dilindungi.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-[16px] leading-[24px] text-[#3f4940] opacity-80 transition-colors hover:text-[#004d27] hover:opacity-100" href="#">
              Tentang
            </a>
            <Link className="text-[16px] leading-[24px] text-[#3f4940] opacity-80 transition-colors hover:text-[#004d27] hover:opacity-100" href="/plans">
              Pricing
            </Link>
            <a className="text-[16px] leading-[24px] text-[#3f4940] opacity-80 transition-colors hover:text-[#004d27] hover:opacity-100" href="#">
              Kontak
            </a>
            <a className="text-[16px] leading-[24px] text-[#3f4940] opacity-80 transition-colors hover:text-[#004d27] hover:opacity-100" href="#">
              Bantuan
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
