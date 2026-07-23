import { NextResponse } from "next/server";
import { generateChatReply } from "@/lib/ai/chat";
import {
  HUB_FALLBACK_RESOURCES,
  listHubResources,
  rankHubResources,
  type HubResource,
} from "@/lib/hub";
import {
  HUB_ASK_SYSTEM_PROMPT,
  type HubAnswer,
  type HubAnswerSource,
  buildHubAskUserPrompt,
  fetchSourceExcerpt,
  parseHubAnswer,
} from "@/lib/hub/ask";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// POST /api/hub/ask — "Tanya Hub". Retrieves the most relevant curated Hub
// sources for the question, fetches their REAL content, and asks the model to
// answer from the Muhammadiyah/Tarjih perspective citing only those sources.
// Grounded + fallback: if the source pages can't be fetched, the model still
// answers from its own knowledge (clearly labelled, uncited) and we return the
// matched links to read. Muhammadiyah Hub is free on every tier (CLAUDE.md), so
// this consumes NO daily message quota — only a login is required.

const MAX_QUESTION_CHARS = 1000;
const MATCH_LIMIT = 4;

export async function POST(request: Request) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  let body: { question?: unknown };
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
      { error: "Pertanyaan terlalu pendek." },
      { status: 400 },
    );
  }

  // No quota gate: the Hub (and Tanya Hub) is free on every tier.

  // 1) Retrieve the most relevant curated sources.
  let resources: HubResource[];
  try {
    const rows = await listHubResources(supabase);
    resources = rows.length > 0 ? rows : HUB_FALLBACK_RESOURCES;
  } catch {
    resources = HUB_FALLBACK_RESOURCES;
  }
  const matched = rankHubResources(question, resources, MATCH_LIMIT);

  // 2) Fetch real content for grounding (best-effort, in parallel).
  const fetched = await Promise.all(
    matched.map(async (resource) => ({
      resource,
      excerpt: await fetchSourceExcerpt(resource.url),
    })),
  );
  const sources: HubAnswerSource[] = [];
  for (const { resource, excerpt } of fetched) {
    if (excerpt) {
      sources.push({
        n: sources.length + 1,
        title: resource.title,
        url: resource.url,
        tag: resource.tag,
        excerpt,
      });
    }
  }

  // 3) Synthesis (delimiter-parsed, retry up to 3 — one truncated reply shouldn't
  //    waste the user's action). All attempts share the prompt and one quota.
  const userPrompt = buildHubAskUserPrompt(question, sources);
  let parsed: HubAnswer | null = null;
  for (let attempt = 0; attempt < 3 && !parsed; attempt += 1) {
    try {
      const result = await generateChatReply(
        [{ role: "user", text: userPrompt }],
        "",
        undefined,
        HUB_ASK_SYSTEM_PROMPT,
      );
      parsed = parseHubAnswer(result.reply);
    } catch (error) {
      console.error(`Hub ask attempt ${attempt + 1} failed:`, error);
    }
  }

  if (!parsed) {
    return NextResponse.json(
      { error: "Jawaban tidak terbaca. Coba lagi." },
      { status: 502 },
    );
  }

  // note: no_match = nothing relevant in the directory; no_fetch = matched but
  // the source pages couldn't be fetched (answer is ungrounded AI knowledge).
  const note =
    matched.length === 0
      ? "no_match"
      : sources.length === 0
        ? "no_fetch"
        : undefined;

  return NextResponse.json({
    question,
    answer: parsed.answer,
    aiContext: parsed.aiContext,
    grounded: sources.length > 0,
    sources: sources.map((source) => ({
      n: source.n,
      title: source.title,
      url: source.url,
      tag: source.tag,
    })),
    related: matched.map((resource) => ({
      title: resource.title,
      url: resource.url,
      tag: resource.tag,
      category: resource.category,
    })),
    note,
  });
}
