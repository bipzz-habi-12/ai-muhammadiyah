import { NextResponse } from "next/server";
import { generateChatReply } from "@/lib/ai/chat";
import { coerceResearchSources, searchLiterature } from "@/lib/research/openalex";
import {
  RESEARCH_SYNTHESIS_SYSTEM_PROMPT,
  type ResearchSynthesis,
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

  // 2) Synthesis. Runs even with zero sources — the AI still contributes an
  //    uncited "aiContext" from its own knowledge (clearly separated below).
  const userPrompt = buildResearchUserPrompt(question, sources);

  // LLM JSON output is occasionally truncated mid-response (provider hiccup),
  // which fails the parse. Retry once before giving up — still one user action,
  // one quota. Both attempts share the same prompt.
  let parsed: ResearchSynthesis | null = null;
  let lastReply = "";
  for (let attempt = 0; attempt < 3 && !parsed; attempt += 1) {
    try {
      const result = await generateChatReply(
        [{ role: "user", text: userPrompt }],
        "",
        undefined,
        RESEARCH_SYNTHESIS_SYSTEM_PROMPT,
      );
      lastReply = result.reply;
      parsed = parseResearchSynthesis(result.reply);
    } catch (error) {
      console.error(`Research synthesis attempt ${attempt + 1} failed:`, error);
    }
  }

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
    p_estimated_tokens: estimateTokenUsage(userPrompt, lastReply),
    p_metadata: { feature: "research", source_count: sources.length },
  });

  if (usageError) {
    console.error("Research usage increment failed:", usageError);
  }

  return NextResponse.json({
    question,
    sources,
    synthesis: parsed.synthesis,
    aiContext: parsed.aiContext,
    keyFindings: parsed.keyFindings,
    note: sources.length === 0 ? "no_sources" : undefined,
  });
}
