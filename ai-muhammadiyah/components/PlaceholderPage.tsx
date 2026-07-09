import Link from "next/link";

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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f8f9fa] px-6 text-center text-[#191c1d]">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#004d27]">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="max-w-md text-base leading-relaxed text-[#3f4940]">
        {description}
      </p>
      <p className="rounded-full bg-[#f3f4f5] px-4 py-2 text-sm font-bold text-[#6f7a70]">
        Fitur ini akan segera hadir
      </p>
      <Link
        href="/"
        className="mt-4 rounded-full bg-[#004d27] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#006837]"
      >
        Kembali ke chat
      </Link>
    </main>
  );
}
