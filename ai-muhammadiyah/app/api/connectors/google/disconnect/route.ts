import { NextResponse } from "next/server";
import { disconnectGoogle } from "@/lib/connectors/google";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function POST() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  await disconnectGoogle(user.id);

  return NextResponse.json({ ok: true });
}
