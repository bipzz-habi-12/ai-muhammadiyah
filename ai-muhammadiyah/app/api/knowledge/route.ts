import { NextResponse } from "next/server";
import { isKnowledgeAdmin } from "@/lib/admin";
import { listKnowledgeSources } from "@/lib/knowledge";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function GET() {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const sources = await listKnowledgeSources(supabase);

    return NextResponse.json({
      isAdmin: isKnowledgeAdmin(user),
      sources,
    });
  } catch (error) {
    console.error("Knowledge sources load failed:", error);

    return NextResponse.json(
      { error: "Knowledge base belum bisa dimuat." },
      { status: 500 },
    );
  }
}
