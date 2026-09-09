"use client";

import { useEffect, useState } from "react";
import {
  credentialModeStorageKey,
  modelProviderLabels,
  normalizeCredentialMode,
  type CredentialMode,
  type ModelProviderId,
} from "@/lib/ai/model-catalog";

type CredentialStatus = {
  provider: ModelProviderId;
  keyHint: string;
  validatedAt: string | null;
  updatedAt: string;
};

const providers: {
  id: ModelProviderId;
  description: string;
  keyUrl: string;
}[] = [
  {
    id: "openai",
    description: "GPT dan model OpenAI lain yang tersedia di katalog.",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "google",
    description: "Gemini Pro dan Flash melalui Google AI Studio.",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "anthropic",
    description: "Claude Opus, Sonnet, dan Haiku dari Anthropic.",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
];

export default function ProviderKeysPanel() {
  const [credentials, setCredentials] = useState<CredentialStatus[]>([]);
  const [drafts, setDrafts] = useState<Partial<Record<ModelProviderId, string>>>(
    {},
  );
  const [pendingProvider, setPendingProvider] =
    useState<ModelProviderId | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [credentialMode, setCredentialMode] = useState<CredentialMode>(() =>
    typeof window === "undefined"
      ? "platform"
      : normalizeCredentialMode(
          window.localStorage.getItem(credentialModeStorageKey),
        ),
  );

  function toggleCredentialMode() {
    const nextMode: CredentialMode =
      credentialMode === "byok" ? "platform" : "byok";

    if (nextMode === "byok" && credentials.length === 0) {
      setError("Pasang minimal satu API key sebelum mengaktifkan mode pribadi.");
      return;
    }

    setError("");
    setMessage(
      nextMode === "byok"
        ? "Chat sekarang memakai API key pribadi."
        : "Chat sekarang memakai akses bawaan sesuai paket.",
    );
    setCredentialMode(nextMode);
    window.localStorage.setItem(credentialModeStorageKey, nextMode);
  }

  async function loadCredentials() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/settings/provider-keys", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        credentials?: CredentialStatus[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Status API key belum bisa dimuat.");
      }

      setCredentials(data.credentials ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Status API key belum bisa dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/settings/provider-keys", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          credentials?: CredentialStatus[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Status API key belum bisa dimuat.");
        }
        if (!cancelled) {
          setCredentials(data.credentials ?? []);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Status API key belum bisa dimuat.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveKey(provider: ModelProviderId) {
    const apiKey = drafts[provider]?.trim() ?? "";

    if (!apiKey) {
      setError("Masukkan API key terlebih dahulu.");
      return;
    }

    setPendingProvider(provider);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/settings/provider-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "API key belum bisa disimpan.");
      }

      setDrafts((current) => ({ ...current, [provider]: "" }));
      setMessage(`${modelProviderLabels[provider]} berhasil dihubungkan.`);
      await loadCredentials();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "API key belum bisa disimpan.",
      );
    } finally {
      setPendingProvider(null);
    }
  }

  async function deleteKey(provider: ModelProviderId) {
    setPendingProvider(provider);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/settings/provider-keys?provider=${provider}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "API key belum bisa dihapus.");
      }

      if (credentialMode === "byok" && credentials.length === 1) {
        setCredentialMode("platform");
        window.localStorage.setItem(credentialModeStorageKey, "platform");
      }
      setMessage(`${modelProviderLabels[provider]} dilepas dari akun.`);
      await loadCredentials();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "API key belum bisa dihapus.",
      );
    } finally {
      setPendingProvider(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">
              Gunakan API key pribadi
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted-2)]">
              Jika aktif, biaya dan limit ditanggung akun provider kamu. Jika
              nonaktif, chat menggunakan akses bawaan sesuai paket.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={credentialMode === "byok"}
            onClick={toggleCredentialMode}
            className={
              credentialMode === "byok"
                ? "relative h-7 w-12 shrink-0 rounded-full bg-[var(--brand)] transition"
                : "relative h-7 w-12 shrink-0 rounded-full bg-[var(--surface-border)] transition"
            }
          >
            <span
              className={
                credentialMode === "byok"
                  ? "absolute left-6 top-1 h-5 w-5 rounded-full bg-white transition"
                  : "absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition"
              }
            />
            <span className="sr-only">
              {credentialMode === "byok" ? "Nonaktifkan" : "Aktifkan"} API key
              pribadi
            </span>
          </button>
        </div>
      </div>

      {(error || message) && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-[13px] ${
            error
              ? "bg-[var(--danger-bg)] text-[var(--danger-ink)]"
              : "bg-[var(--brand-soft)] text-[var(--brand)]"
          }`}
        >
          {error || message}
        </p>
      )}

      {providers.map((provider) => {
        const credential = credentials.find(
          (item) => item.provider === provider.id,
        );
        const isPending = pendingProvider === provider.id;

        return (
          <section
            key={provider.id}
            className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--ink)]">
                  {modelProviderLabels[provider.id]}
                </h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted-2)]">
                  {provider.description}
                </p>
              </div>
              <span
                className={
                  credential
                    ? "shrink-0 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--brand)]"
                    : "shrink-0 rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--muted-3)]"
                }
              >
                {credential ? `Tersambung ····${credential.keyHint}` : "Belum tersambung"}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={drafts[provider.id] ?? ""}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [provider.id]: event.target.value,
                  }))
                }
                autoComplete="off"
                placeholder={credential ? "Masukkan key baru untuk mengganti" : "Tempel API key"}
                aria-label={`API key ${modelProviderLabels[provider.id]}`}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--hairline)] bg-[var(--surface-alt)] px-3.5 text-[13px] text-[var(--ink)] outline-none transition focus:border-[var(--brand)]"
              />
              <button
                type="button"
                onClick={() => void saveKey(provider.id)}
                disabled={isPending || isLoading}
                className="min-h-11 rounded-xl border border-[var(--hairline)] bg-[var(--surface-alt)] px-4 text-[13px] font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)] disabled:opacity-60"
              >
                {isPending ? "Memeriksa…" : credential ? "Ganti key" : "Simpan key"}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <a
                href={provider.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12.5px] font-medium text-[var(--brand)] hover:underline"
              >
                Buat key di {modelProviderLabels[provider.id]}
              </a>
              {credential && (
                <button
                  type="button"
                  onClick={() => void deleteKey(provider.id)}
                  disabled={isPending}
                  className="min-h-11 px-2 text-[12.5px] font-medium text-[var(--danger-ink)] disabled:opacity-60"
                >
                  Hapus
                </button>
              )}
            </div>
          </section>
        );
      })}

      <p className="text-[11.5px] leading-relaxed text-[var(--muted-3)]">
        Key dienkripsi sebelum disimpan dan tidak pernah ditampilkan kembali.
        Untuk mencabut akses sepenuhnya, hapus key di sini dan di dashboard
        provider.
      </p>
    </div>
  );
}
