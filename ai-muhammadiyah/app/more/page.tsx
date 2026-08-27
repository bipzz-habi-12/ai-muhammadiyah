import Link from "next/link";
import { redirect } from "next/navigation";
import AppShellRail from "@/components/AppShellRail";
import BottomNav from "@/components/BottomNav";
import { Icon } from "@/components/icons";
import { getEmailInitials } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  getTightestWindow,
  normalizeUsageSnapshot,
  tierLabels,
  usageWindowLabels,
} from "@/lib/usage/limits";
import LogoutButton from "./LogoutButton";

// "Lainnya" — rumah untuk akun, kuota, dan seluruh halaman yang tidak punya
// tab sendiri di nav bawah (Design premium Langkah 53).
//
// Sebelum ini, di HP akun & pengaturan menumpang di popover kanan-atas header
// chat, dan Hub/Research/Work/Riwayat tidak bisa dijangkau sama sekali. Halaman
// ini memakai backend yang sudah ada: RPC get_usage_snapshot yang sama dengan
// /api/usage, dibaca langsung dari server tanpa route baru.

const sections: {
  label: string;
  items: { href: string; label: string; description: string; glyph: React.ReactNode }[];
}[] = [
  {
    label: "Jelajahi",
    items: [
      {
        href: "/hub",
        label: "Muhammadiyah Hub",
        description: "Basis pengetahuan publik — gratis di semua paket",
        glyph: <Icon name="globe" className="h-5 w-5" />,
      },
      {
        href: "/research",
        label: "Research",
        description: "Riset mendalam dengan sumber yang bisa dilacak",
        glyph: (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <line x1="15.5" y1="15.5" x2="21" y2="21" />
          </svg>
        ),
      },
      {
        href: "/work",
        label: "Work",
        description: "Sambungkan Google Drive dan aplikasi lain",
        glyph: (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="7" width="19" height="13" rx="2" />
            <path d="M8.5 7V5.2A1.7 1.7 0 0 1 10.2 3.5h3.6A1.7 1.7 0 0 1 15.5 5.2V7" />
            <path d="M2.5 12.5h19" />
          </svg>
        ),
      },
      {
        href: "/history",
        label: "Riwayat",
        description: "Semua percakapan lama",
        glyph: <Icon name="history" className="h-5 w-5" />,
      },
    ],
  },
  {
    label: "Akun",
    items: [
      {
        href: "/settings/personalization",
        label: "Personalisasi",
        description: "Cara M-Agent menjawab dan mengingat kamu",
        glyph: <Icon name="user" className="h-5 w-5" />,
      },
      {
        href: "/plans",
        label: "Paket & harga",
        description: "Bandingkan paket dan ubah langganan",
        glyph: <Icon name="book" className="h-5 w-5" />,
      },
    ],
  },
];

export default async function MorePage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Gagal dibaca (mis. RPC belum ada) diperlakukan sebagai "kuota belum bisa
  // ditampilkan" — halamannya tetap terbuka, sama seperti /work.
  const { data } = await supabase.rpc("get_usage_snapshot");
  const usage = normalizeUsageSnapshot(data);
  const tightest = usage ? getTightestWindow(usage.tokens) : null;
  const email = user.email ?? "";

  return (
    <main className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--ink)]">
      <AppShellRail active="more" userInitials={getEmailInitials(email)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="scroll flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[720px] px-5 pb-10 pt-6 sm:px-8 md:pt-11">
            <h1 className="font-serif text-[28px] font-normal leading-tight tracking-[-0.015em] text-[var(--ink-deep)] md:text-[34px]">
              Lainnya
            </h1>

            <section className="mt-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand)]">
                  {getEmailInitials(email)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium text-[var(--ink)]">
                    {email || "Akun"}
                  </span>
                  <span className="truncate text-[12.5px] text-[var(--muted-3)]">
                    Paket {usage ? tierLabels[usage.tier] : "—"}
                  </span>
                </span>
              </div>

              {tightest ? (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] text-[var(--muted-2)]">
                      Kuota {usageWindowLabels[tightest.key].toLowerCase()}
                    </span>
                    <span className="text-[12.5px] font-medium text-[var(--ink-soft)]">
                      {tightest.window.percentUsed}% terpakai
                    </span>
                  </div>
                  <span
                    className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-border)]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={tightest.window.percentUsed}
                    aria-label="Kuota terpakai"
                  >
                    <span
                      className="block h-full rounded-full bg-[var(--brand)]"
                      style={{
                        width: `${Math.max(tightest.window.percentUsed, 2)}%`,
                      }}
                    />
                  </span>
                </div>
              ) : (
                <p className="mt-4 text-[12.5px] text-[var(--muted-3)]">
                  Status kuota belum bisa dimuat.
                </p>
              )}

              <Link
                href="/plans"
                className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-[14.5px] font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
              >
                Lihat paket
              </Link>
            </section>

            {sections.map((section) => (
              <section key={section.label} className="mt-7">
                <h2 className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-3)]">
                  {section.label}
                </h2>
                <div className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]">
                  {section.items.map((item, index) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        index === 0
                          ? "flex min-h-[60px] items-center gap-3.5 px-4 py-2.5 transition hover:bg-[var(--surface-alt)]"
                          : "flex min-h-[60px] items-center gap-3.5 border-t border-[var(--hairline)] px-4 py-2.5 transition hover:bg-[var(--surface-alt)]"
                      }
                    >
                      <span className="shrink-0 text-[var(--muted-2)]">
                        {item.glyph}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] text-[var(--ink)]">
                          {item.label}
                        </span>
                        <span className="truncate text-[12.5px] text-[var(--muted-3)]">
                          {item.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-[var(--muted-3)]">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}

            <div className="mt-7">
              <LogoutButton />
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
