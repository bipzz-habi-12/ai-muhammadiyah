import { NextResponse } from "next/server";
import { generateChatReply } from "@/lib/ai/chat";
import { coerceResearchSources, searchLiterature } from "@/lib/research/openalex";
import {
  RESEARCH_SYNTHESIS_SYSTEM_PROMPT,
  buildResearchUserPrompt,
  parseResearchSynthesis,
} from "@/lib/research/synthesis";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  estimateTokenUsage,
  getLimitErrorMessage,
} from "@/lib/usage/limits";

// POST /api/research — the synthesis engine. Retrieves real literature from
// OpenAlex, then asks the model to synthesise + cite ONLY those sources. This is
// an AI generation, so it consumes one daily message quota (same policy as chat
// and the old docs/tasks generators). The result is returned, not persisted;
// saving is a separate explicit action (POST /api/research/save).

const MAX_QUESTION_CHARS = 2000;
const SOURCE_LIMIT = 8;

export async function POST(request: Request) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  let body: { question?: unknown; sources?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const question =
    typeof body.question === "string"
      ? body.question.trim().slice(0, MAX_QUESTION_CHARS)
      : "";

  if (question.length < 8) {
    return NextResponse.json(
      { error: "Pertanyaan riset terlalu pendek." },
      { status: 400 },
    );
  }

  // Quota gate (before the expensive work).
  const { data: limitCheck, error: limitError } = await supabase.rpc(
    "check_usage_limits",
    {
      p_action: "message",
      p_model_used: "auto",
      p_estimated_tokens: estimateTokenUsage(question),
    },
  );

  if (limitError) {
    console.error("Research usage check failed:", limitError);
    return NextResponse.json(
      { error: "Limit penggunaan belum bisa dicek." },
      { status: 500 },
    );
  }

  if (!limitCheck?.allowed) {
    return NextResponse.json(
      { error: getLimitErrorMessage(limitCheck?.reason) },
      { status: 429 },
    );
  }

  // 1) Sources: either a curated set the client sends back (initial OpenAlex
  //    results the user has added to / trimmed), or a fresh OpenAlex search.
  const curatedSources = coerceResearchSources(body.sources);
  const sources =
    curatedSources.length > 0
      ? curatedSources
      : await searchLiterature(question, SOURCE_LIMIT);

  if (sources.length === 0) {
    return NextResponse.json({
      question,
      sources: [],
      synthesis: "",
      keyFindings: [],
      note: "no_sources",
    });
  }

  // 2) Grounded synthesis.
  const userPrompt = buildResearchUserPrompt(question, sources);
  let reply: string;
  try {
    const result = await generateChatReply(
      [{ role: "user", text: userPrompt }],
      "",
      undefined,
      RESEARCH_SYNTHESIS_SYSTEM_PROMPT,
    );
    reply = result.reply;
  } catch (error) {
    console.error("Research synthesis failed:", error);
    return NextResponse.json(
      { error: "Sintesis riset gagal. Coba lagi." },
      { status: 502 },
    );
  }

  const parsed = parseResearchSynthesis(reply);

  if (!parsed) {
    return NextResponse.json(
      { error: "Hasil sintesis tidak terbaca. Coba lagi." },
      { status: 502 },
    );
  }

  // 3) Count the quota now that real work happened.
  const { error: usageError } = await supabase.rpc("increment_usage", {
    p_action: "message",
    p_model_used: "auto",
    p_document_count: 0,
    p_estimated_tokens: estimateTokenUsage(userPrompt, reply),
    p_metadata: { feature: "research", source_count: sources.length },
  });

  if (usageError) {
    console.error("Research usage increment failed:", usageError);
  }

  return NextResponse.json({
    question,
    sources,
    synthesis: parsed.synthesis,
    keyFindings: parsed.keyFindings,
  });
}
