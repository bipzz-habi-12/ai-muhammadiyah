import Link from "next/link";

// Isi halaman "segera hadir". Bukan lagi <main> sendiri: pemanggilnya yang
// memasang app shell (AppShellRail + BottomNav), supaya halaman ini tidak jadi
// jalan buntu tanpa navigasi seperti sebelumnya.
//
// Paletnya juga diperbarui ke token Design v2 — versi lama masih memakai
// #f8f9fa / #191c1d / #004d27 yang sudah usang menurut CLAUDE.md.

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-3)]">
        {eyebrow}
      </p>
      <h1 className="font-serif text-[30px] font-normal leading-tight tracking-[-0.015em] text-[var(--ink-deep)]">
        {title}
      </h1>
      <p className="max-w-[420px] text-[15px] leading-relaxed text-[var(--muted-2)]">
        {description}
      </p>
      <span className="mt-1 rounded-full border border-[var(--hairline)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--muted-2)]">
        Segera hadir
      </span>
      <Link
        href="/"
        className="mt-4 flex min-h-[44px] items-center rounded-xl bg-[var(--brand)] px-5 text-[14.5px] font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
      >
        Kembali ke chat
      </Link>
    </div>
  );
}
