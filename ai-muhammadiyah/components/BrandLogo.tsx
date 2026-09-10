// Mark pusaran M-Agent. Selalu di dalam kotak 1:1 supaya ukuran ikut
// className (fleksibel) dan object-fit contain — tidak terpotong saat
// skala atau saat berputar. Animasi berpikir: putaran linear terus-menerus
// (gaya Claude), hanya transform/compositor.

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
  return (
    <span
      className={["brand-logo", spinning ? "brand-logo-spin" : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={alt === "" ? true : undefined}
    >
      {/* Raster mark with transparent pad; next/image wrappers can clip
          rotation. A plain img + object-fit scales in any box. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt={alt}
        title={title}
        width={512}
        height={512}
        draggable={false}
        decoding="async"
      />
    </span>
  );
}
