import { isEngineConfigured } from "@/lib/ai/model-env";
import {
  defaultModelProvider,
  getModelEngine,
  modelEngines,
  modelProviderOrder,
  type ModelProviderId,
  type PlanModelId,
} from "@/lib/subscriptions/plans";

/**
 * Ketersediaan penyedia model — SERVER-ONLY (membaca API key dari env).
 *
 * Dipakai dua tempat: `/api/usage` (memberi tahu klien penyedia mana yang boleh
 * ditawarkan di pemilih model) dan `/api/chat` (menolak pilihan yang tidak bisa
 * dijalankan, lalu jatuh ke penyedia yang ada). Klien TIDAK PERNAH memutuskan
 * ini sendiri: daftar dari server yang menentukan, jadi memalsukannya dari
 * devtools tidak membuka penyedia yang kuncinya memang kosong.
 *
 * Nama env-nya ada di `lib/ai/model-env.ts` — itu satu-satunya tempat pola
 * `<PENYEDIA>_API_KEY_<MODEL>` / `<PENYEDIA>_MODEL_<MODEL>` didefinisikan.
 */

const allModelIds = Object.keys(modelEngines) as PlanModelId[];

/**
 * Jalur panggilan Anthropic (`streamAnthropicReply` di `lib/ai/chat.ts`) sudah
 * ditulis, jadi penjaga ini dibuka. Sebelumnya ia sengaja melaporkan Anthropic
 * MATI meski kuncinya terpasang, supaya menu tidak menawarkan Claude sementara
 * server diam-diam menjawab dengan OpenAI.
 *
 * Catatan jujur: jalurnya BELUM PERNAH diuji dengan kunci beraliran dana, jadi
 * ketersediaan di sini berarti "kunci + id model ada", bukan "sudah terbukti
 * menjawab". Kegagalan apa pun jatuh ke OpenAI, jadi chat tetap hidup.
 */
const anthropicStreamingImplemented = true;

/**
 * Satu penyedia ditawarkan hanya kalau ia bisa menjalankan KEEMPAT model.
 *
 * Sengaja sekaku itu: pemilih model menampilkan baris penyedia yang sama di
 * bawah setiap nama model, jadi penyedia yang cuma terpasang separuh akan
 * menjanjikan mesin yang diam-diam dialihkan ke OpenAI. Memasang kunci bersama
 * (mis. `GEMINI_API_KEY`) sudah memenuhi keempatnya sekaligus.
 */
export function isProviderConfigured(provider: ModelProviderId) {
  if (provider === "anthropic" && !anthropicStreamingImplemented) {
    return false;
  }

  return allModelIds.every((model) => isEngineConfigured(provider, model));
}

export function listConfiguredProviders(): ModelProviderId[] {
  return modelProviderOrder.filter(isProviderConfigured);
}

/**
 * Penyedia yang benar-benar dipakai untuk satu pesan.
 *
 * Urutannya: pilihan pengguna (kalau modelnya punya mesin di sana DAN mesinnya
 * terpasang) → OpenAI → penyedia mana pun yang terkonfigurasi. Mengembalikan
 * `null` kalau tidak ada satu pun; pemanggilnya lalu memakai jalur cadangan
 * lama (OpenRouter/mock) persis seperti sebelum Langkah 54.
 */
export function resolveUsableProvider(
  model: PlanModelId,
  requested: ModelProviderId,
): ModelProviderId | null {
  const canRun = (provider: ModelProviderId) =>
    Boolean(getModelEngine(model, provider)) &&
    isProviderConfigured(provider) &&
    isEngineConfigured(provider, model);

  if (canRun(requested)) {
    return requested;
  }

  if (canRun(defaultModelProvider)) {
    return defaultModelProvider;
  }

  return modelProviderOrder.find(canRun) ?? null;
}
