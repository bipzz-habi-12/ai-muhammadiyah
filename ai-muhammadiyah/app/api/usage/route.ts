import { NextResponse } from "next/server";
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

  return NextResponse.json(normalizeUsageSnapshot(data));
}
