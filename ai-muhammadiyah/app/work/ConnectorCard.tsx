"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatRelativeTime } from "@/lib/formatting/text";

// Kartu koneksi Google. Menghubungkan = navigasi penuh ke /api/connectors/
// google/start (bukan fetch) karena alurnya berakhir di domain Google.

const errorMessages: Record<string, string> = {
  google_not_configured:
    "Kredensial Google belum diisi di server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
  encryption_not_configured:
    "CONNECTION_ENCRYPTION_KEY belum diset, jadi token tidak bisa disimpan dengan aman.",
  state_mismatch:
    "Sesi penyambungan tidak cocok. Coba hubungkan ulang dari halaman ini.",
  no_refresh_token:
    "Google tidak mengirim refresh token. Cabut akses M-Agent di akun Google-mu, lalu hubungkan ulang.",
  token_exchange_failed: "Penukaran token dengan Google gagal.",
  storage_failed: "Koneksi berhasil tapi gagal disimpan.",
};

export default function ConnectorCard({
  isConfigured,
  accountEmail,
  connectedAt,
}: {
  isConfigured: boolean;
  accountEmail: string | null;
  connectedAt: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isWorking, setIsWorking] = useState(false);

  const isConnected = Boolean(connectedAt);
  const errorKey = searchParams.get("error");
  const connectState = searchParams.get("connect");

  async function disconnect() {
    setIsWorking(true);

    try {
      await fetch("/api/connectors/google/disconnect", { method: "POST" });
      router.replace("/work");
      router.refresh();
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="rounded-[15px] border border-[var(--brand-deep-line)]/10 bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-[var(--brand)]/10 text-[17px] text-[var(--brand)]">
              ▲
            </span>
            <div className="min-w-0">
              <div className="text-[16px] font-semibold text-[var(--c-1b2721)]">
                Google Drive
              </div>
              <div className="truncate text-[13px] text-[var(--muted-3)]">
                {isConnected
                  ? `${accountEmail ?? "Akun Google"} · tersambung ${formatRelativeTime(connectedAt as string)}`
                  : "Simpan hasil kerja ke Drive dan baca berkas dari Drive"}
              </div>
            </div>
          </div>
        </div>

        {isConnected ? (
          <button
            type="button"
            onClick={disconnect}
            disabled={isWorking}
            className="shrink-0 rounded-[10px] px-4 py-2.5 text-[14px] font-semibold text-[var(--danger)] ring-1 ring-[var(--danger)]/25 transition hover:bg-[var(--danger-bg)] disabled:opacity-50"
          >
            {isWorking ? "Memutus…" : "Putuskan"}
          </button>
        ) : (
          <a
            href={isConfigured ? "/api/connectors/google/start" : undefined}
            aria-disabled={!isConfigured}
            className={
              isConfigured
                ? "shrink-0 rounded-[10px] bg-[var(--brand)] px-5 py-2.5 text-[14px] font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
                : "pointer-events-none shrink-0 rounded-[10px] bg-[var(--surface-border)] px-5 py-2.5 text-[14px] font-semibold text-[var(--muted-3)]"
            }
          >
            {isConfigured ? "Hubungkan Google" : "Belum dikonfigurasi"}
          </a>
        )}
      </div>

      {connectState === "berhasil" && (
        <p className="mt-4 rounded-[10px] bg-[var(--brand)]/8 px-4 py-2.5 text-[13px] text-[var(--brand)]">
          Google Drive berhasil tersambung.
        </p>
      )}

      {connectState === "dibatalkan" && (
        <p className="mt-4 text-[13px] text-[var(--muted-3)]">
          Penyambungan dibatalkan.
        </p>
      )}

      {errorKey && (
        <p className="mt-4 rounded-[10px] bg-[var(--danger-bg)] px-4 py-2.5 text-[13px] text-[var(--danger)]">
          {errorMessages[errorKey] ?? "Penyambungan gagal."}
        </p>
      )}

      {!isConfigured && (
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted-3)]">
          Untuk mengaktifkan: buat OAuth client di Google Cloud Console, lalu
          isi <span className="font-mono">GOOGLE_CLIENT_ID</span>,{" "}
          <span className="font-mono">GOOGLE_CLIENT_SECRET</span>, dan{" "}
          <span className="font-mono">CONNECTION_ENCRYPTION_KEY</span> di
          environment server.
        </p>
      )}
    </div>
  );
}
