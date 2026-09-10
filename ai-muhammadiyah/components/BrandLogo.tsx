import Image from "next/image";

// Mark pusaran M-Agent. Satu aset PNG transparan dipakai di setiap
// kemunculan logo. Animasi "berpikir" hanya memutar transform (compositor /
// GPU) — tidak ada filter, layout, atau box-shadow, supaya halaman tetap
// stabil meski logo berputar selama streaming.

type BrandLogoProps = {
  className?: string;
  spinning?: boolean;
  alt?: string;
  title?: string;
};

export default function BrandLogo({
  className = "h-8 w-8",
  spinning = false,
  alt = "",
  title,
}: BrandLogoProps) {
  const img = (
    <Image
      src="/logo-mark.png"
      alt={alt}
      title={title}
      width={256}
      height={256}
      draggable={false}
      sizes="72px"
      className={spinning ? "block h-full w-full" : `block ${className}`}
    />
  );

  if (!spinning) {
    return img;
  }

  return (
    <span className={`brand-logo-spin inline-block ${className}`}>{img}</span>
  );
}
