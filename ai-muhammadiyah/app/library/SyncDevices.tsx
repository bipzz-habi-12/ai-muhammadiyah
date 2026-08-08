"use client";

import { useCallback, useState } from "react";
import { formatRelativeTime } from "@/lib/formatting/text";

// Pengelolaan perangkat jembatan Logseq (Langkah 40 Tahap C).
//
// Token hanya bisa dilihat SEKALI, saat dibuat — server menyimpan hash-nya
// saja. Itu keputusan keamanan yang disengaja, jadi UI-nya harus jujur soal
// ini supaya pengguna menyalin tokennya sekarang, bukan mengira bisa kembali
// lagi nanti.

type Device = {
  id: string;
  name: string;
  last_seen_at: string | null;
  created_at: string;
};

type SyncLimits = {
  tier: string;
  requestsPerHour: number;
  notesPerDay: number;
};

export default function SyncDevices() {
  const [isOpen, setIsOpen] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [limits, setLimits] = useState<SyncLimits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/notes/devices");
      const payload = await response.json();

      if (response.ok) {
        setDevices(payload.devices ?? []);
        setLimits(payload.limits ?? null);
      } else {
        setError(payload.error ?? "Gagal memuat perangkat.");
      }
    } catch {
      setError("Gagal memuat perangkat.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Dimuat saat panelnya dibuka, bukan lewat useEffect: ini reaksi terhadap
  // aksi pengguna, bukan sinkronisasi dengan sistem eksternal.
  const togglePanel = () => {
    setIsOpen((previous) => {
      if (!previous) {
        void loadDevices();
      }

      return !previous;
    });
  };

  const addDevice = async () => {
    setError(null);
    setIsCopied(false);

    try {
      const response = await fetch("/api/notes/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Perangkat ${devices.length + 1}` }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Gagal mendaftarkan perangkat.");
        return;
      }

      setNewToken(payload.token);
      void loadDevices();
    } catch {
      setError("Gagal mendaftarkan perangkat.");
    }
  };

  const revokeDevice = async (id: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/notes/devices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Gagal mencabut perangkat.");
        return;
      }

      setDevices((previous) => previous.filter((device) => device.id !== id));
    } catch {
      setError("Gagal mencabut perangkat.");
    }
  };

  return (
    <div className="mb-6 rounded-[10px] border border-[rgba(20,40,30,0.1)] bg-[#f7f5ee]">
      <button
        type="button"
        onClick={togglePanel}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] text-[#5d6862] transition-colors hover:text-[#25302a]"
      >
        <span className="flex-1">
          Perangkat tersambung
          <span className="ml-1.5 text-[#8a9089]">
            — sinkronkan otomatis dengan Logseq di komputermu
          </span>
        </span>
        <span className="text-[#0f5a3d]">{isOpen ? "Tutup" : "Atur"}</span>
      </button>

      {isOpen && (
        <div className="border-t border-[rgba(20,40,30,0.1)] px-4 py-3">
          {error && (
            <p className="mb-2 text-[12.5px] text-[#93000a]">{error}</p>
          )}

          {newToken && (
            <div className="mb-3 rounded-[8px] border border-[#b08833]/40 bg-[#f6efdd] px-3 py-2.5">
              <p className="text-[12.5px] font-semibold text-[#8a6a20]">
                Salin token ini sekarang — tidak bisa dilihat lagi.
              </p>
              <code className="mt-1.5 block break-all rounded bg-[#fbfaf6] px-2 py-1.5 text-[11.5px] text-[#16211c]">
                {newToken}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(newToken);
                  setIsCopied(true);
                }}
                className="mt-2 rounded-[6px] border border-[rgba(20,40,30,0.12)] bg-[#fbfaf6] px-2.5 py-1 text-[12px] font-medium text-[#0f5a3d]"
              >
                {isCopied ? "Tersalin" : "Salin token"}
              </button>
              <p className="mt-2 text-[11.5px] leading-[1.55] text-[#7c857f]">
                <strong className="text-[#25302a]">Sinkron dengan Logseq</strong>{" "}
                — jalankan di komputermu (Logseq tidak perlu dibuka):
                <code className="mt-1 block break-all rounded bg-[#fbfaf6] px-2 py-1 text-[11px] text-[#25302a]">
                  node scripts/logseq-bridge.mjs --graph &quot;path/ke/graf&quot;
                  --interval 300
                </code>
                Token dibaca dari environment variable{" "}
                <code className="text-[11px]">AIMU_SYNC_TOKEN</code> — jangan
                ditulis langsung di perintah, karena argumen perintah terlihat
                di daftar proses.
              </p>

              <p className="mt-2.5 text-[11.5px] leading-[1.55] text-[#7c857f]">
                <strong className="text-[#25302a]">Pakai dari Hermes Agent</strong>{" "}
                — tambahkan ke <code className="text-[11px]">~/.hermes/config.yaml</code>{" "}
                supaya Hermes bisa mencari, membaca, dan menulis catatanmu:
                <code className="mt-1 block whitespace-pre rounded bg-[#fbfaf6] px-2 py-1 text-[11px] leading-[1.5] text-[#25302a]">
                  {`mcp_servers:
  otak_kedua:
    command: "node"
    args: ["path/ke/scripts/hermes-mcp-server.mjs"]
    env:
      AIMU_SYNC_TOKEN: "\${env:AIMU_SYNC_TOKEN}"`}
                </code>
                Token yang sama dipakai keduanya.
              </p>
            </div>
          )}

          {isLoading ? (
            <p className="text-[12.5px] text-[#7c857f]">Memuat…</p>
          ) : devices.length === 0 ? (
            <p className="text-[12.5px] leading-[1.6] text-[#7c857f]">
              Belum ada perangkat. Tambahkan satu untuk menyinkronkan catatan
              dua arah dengan folder graf Logseq di komputermu.
            </p>
          ) : (
            <ul className="mb-2">
              {devices.map((device) => (
                <li
                  key={device.id}
                  className="flex items-center gap-2.5 py-1.5 text-[13px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[#16211c]">{device.name}</p>
                    <p className="text-[11.5px] text-[#8a9089]">
                      {device.last_seen_at
                        ? `Aktif ${formatRelativeTime(device.last_seen_at)}`
                        : "Belum pernah tersambung"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeDevice(device.id)}
                    className="shrink-0 rounded-[6px] border border-[rgba(20,40,30,0.12)] px-2.5 py-1 text-[12px] font-medium text-[#93000a] transition-colors hover:bg-[#f5f3ec]"
                  >
                    Cabut
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={addDevice}
            className="mt-1 rounded-[6px] border border-[rgba(20,40,30,0.12)] bg-[#fbfaf6] px-2.5 py-1.5 text-[12.5px] font-medium text-[#0f5a3d] transition-colors hover:bg-[#f0eee5]"
          >
            Tambah perangkat
          </button>

          {limits && (
            <p className="mt-2.5 text-[11.5px] leading-[1.6] text-[#8a9089]">
              Batas paketmu: {limits.notesPerDay.toLocaleString("id-ID")} catatan
              tersinkron per hari, {limits.requestsPerHour.toLocaleString("id-ID")}{" "}
              permintaan per jam. Sinkronisasi tiap 5 menit hanya memakai 12
              permintaan per jam.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
