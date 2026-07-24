import { NextResponse } from "next/server";
import { generateChatReply } from "@/lib/ai/chat";
import {
  coerceResearchSources,
  dedupeSources,
  searchLiteratureMulti,
  type ResearchSource,
} from "@/lib/research/openalex";
import {
  SUBQUERY_SYSTEM_PROMPT,
  buildSubQueryPrompt,
  parseSubQueries,
} from "@/lib/research/planner";
import { screenSources } from "@/lib/research/screening";
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

// POST /api/research — deep research in three stages (a funnel, because a few
// hundred abstracts do not fit in one prompt):
//   1. PLAN   — the model turns the question into several complementary queries
//   2. SWEEP  — those queries run against OpenAlex in parallel -> a few hundred
//               unique real works (deduped)
//   3. SCREEN — locally rank by relevance, deep-read only the top N abstracts,
//               then synthesise with citations to exactly those
// The funnel counts are returned so the UI can report honestly how many sources
// were searched vs. actually read.
//
// mode "resynthesize" skips the sweep and re-runs step 3 over a source set the
// user curated (added/removed) on the client.

// Deep research is deliberately slow. 60s is the ceiling that works on every
// Vercel plan; raising it to 300 requires Pro.
export const maxDuration = 60;

const MAX_QUESTION_CHARS = 2000;
const PER_QUERY = 60; // x ~6 queries -> ~250-360 raw hits before dedupe
const DEEP_READ_LIMIT = 30; // abstracts actually fed to the synthesis prompt

export async function POST(request: Request) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  let body: { question?: unknown; sources?: unknown; mode?: unknown };
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

  const mode = body.mode === "resynthesize" ? "resynthesize" : "deep";
  const carriedSources = coerceResearchSources(body.sources);

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

  // ---- STAGE 1: plan the search angles -------------------------------------
  let subQueries: string[] = [];
  if (mode === "deep") {
    try {
      const plan = await generateChatReply(
        [{ role: "user", text: buildSubQueryPrompt(question) }],
        "",
        undefined,
        SUBQUERY_SYSTEM_PROMPT,
      );
      subQueries = parseSubQueries(plan.reply);
    } catch (error) {
      console.error("Research planning failed:", error);
    }
    // Planning is best-effort: without it we still sweep on the raw question.
    if (subQueries.length === 0) {
      subQueries = [question];
    }
  }

  // ---- STAGE 2: broad sweep ------------------------------------------------
  let pool: ResearchSource[] = carriedSources;
  if (mode === "deep") {
    const swept = await searchLiteratureMulti(
      [question, ...subQueries],
      PER_QUERY,
    );
    // Carried sources first so user-added ones survive dedupe.
    pool = dedupeSources([...carriedSources, ...swept]);
  }

  if (pool.length === 0) {
    // Still let the model answer from its own knowledge (aiContext).
    const emptyPrompt = buildResearchUserPrompt(question, []);
    let parsedEmpty: ResearchSynthesis | null = null;
    for (let attempt = 0; attempt < 2 && !parsedEmpty; attempt += 1) {
      try {
        const result = await generateChatReply(
          [{ role: "user", text: emptyPrompt }],
          "",
          undefined,
          RESEARCH_SYNTHESIS_SYSTEM_PROMPT,
        );
        parsedEmpty = parseResearchSynthesis(result.reply);
      } catch (error) {
        console.error("Research synthesis (no sources) failed:", error);
      }
    }

    await supabase.rpc("increment_usage", {
      p_action: "message",
      p_model_used: "auto",
      p_document_count: 0,
      p_estimated_tokens: estimateTokenUsage(emptyPrompt),
      p_metadata: { feature: "research", source_count: 0 },
    });

    return NextResponse.json({
      question,
      sources: [],
      synthesis: parsedEmpty?.synthesis ?? "",
      aiContext: parsedEmpty?.aiContext ?? "",
      keyFindings: parsedEmpty?.keyFindings ?? [],
      searchedCount: 0,
      readCount: 0,
      subQueries,
      note: "no_sources",
    });
  }

  // ---- STAGE 3: screen down to the deep-read set ---------------------------
  const { selected, screenedCount } = screenSources(
    question,
    subQueries,
    pool,
    DEEP_READ_LIMIT,
  );

  const userPrompt = buildResearchUserPrompt(question, selected);

  // LLM output is occasionally truncated mid-response; retry before giving up.
  // Still one user action, one quota.
  let parsed: ResearchSynthesis | null = null;
  let lastReply = "";
  for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
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

  const { error: usageError } = await supabase.rpc("increment_usage", {
    p_action: "message",
    p_model_used: "auto",
    p_document_count: 0,
    p_estimated_tokens: estimateTokenUsage(userPrompt, lastReply),
    p_metadata: {
      feature: "research",
      mode,
      searched: screenedCount,
      read: selected.length,
    },
  });

  if (usageError) {
    console.error("Research usage increment failed:", usageError);
  }

  return NextResponse.json({
    question,
    sources: selected,
    synthesis: parsed.synthesis,
    aiContext: parsed.aiContext,
    keyFindings: parsed.keyFindings,
    searchedCount: screenedCount,
    readCount: selected.length,
    subQueries,
  });
}
