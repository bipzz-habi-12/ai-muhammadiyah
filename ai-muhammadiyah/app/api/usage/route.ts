import { NextResponse } from "next/server";
import { listConfiguredProviders } from "@/lib/ai/providers";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { normalizeUsageSnapshot } from "@/lib/usage/limits";

export async function GET() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_usage_snapshot");

  if (error) {
    console.error("Usage snapshot failed:", error);

    return NextResponse.json(
      { error: "Status penggunaan belum bisa dimuat." },
      { status: 500 },
    );
  }

  // Ketersediaan penyedia ditempel di sini, bukan di RPC: ia diturunkan dari
  // env server (API key), bukan dari data langganan. Klien memakainya untuk
  // mematikan baris penyedia di pemilih model — dan `/api/chat` tetap
  // memvalidasi ulang, jadi daftar ini murni petunjuk tampilan.
  const snapshot = normalizeUsageSnapshot(data);

  return NextResponse.json(
    snapshot
      ? { ...snapshot, availableProviders: listConfiguredProviders() }
      : snapshot,
  );
}
