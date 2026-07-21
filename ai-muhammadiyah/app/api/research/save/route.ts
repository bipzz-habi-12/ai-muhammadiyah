import { NextResponse } from "next/server";
import { insertArtifacts } from "@/lib/artifacts";
import { createConversationTitle } from "@/lib/mappers/conversation";
import { coerceResearchSources } from "@/lib/research/openalex";
import { formatReferenceList } from "@/lib/research/synthesis";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// POST /api/research/save — persist a research result as a real conversation +
// document artifact. Reusing the conversation/artifact model means the saved
// review shows up in Library and on the Research page, and can be reopened and
// continued in chat via /?conversationId=. RLS scopes every insert to the user.

type SavePayload = {
  question?: unknown;
  synthesis?: unknown;
  sources?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  let body: SavePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const question =
    typeof body.question === "string" ? body.question.trim().slice(0, 2000) : "";
  const synthesis =
    typeof body.synthesis === "string" ? body.synthesis.trim() : "";
  const sources = coerceResearchSources(body.sources);

  if (!question || !synthesis) {
    return NextResponse.json(
      { error: "Data riset tidak lengkap." },
      { status: 400 },
    );
  }

  const references = formatReferenceList(sources);
  const artifactText = references
    ? `${synthesis}\n\n## Referensi\n\n${references}`
    : synthesis;
  const title = createConversationTitle(question);

  // 1) Conversation shell (mirrors the columns useChatSession writes).
  const { data: conversationRow, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      title,
      selected_model: "auto",
      study_mode: null,
      document_metadata: null,
      workspace_id: null,
    })
    .select("id")
    .single();

  if (conversationError || !conversationRow) {
    console.error("Research save: conversation insert failed:", conversationError);
    return NextResponse.json(
      { error: "Gagal menyimpan riset." },
      { status: 500 },
    );
  }

  const conversationId = (conversationRow as { id: string }).id;

  // 2) The question + synthesis as chat messages, so the conversation reads
  //    naturally if reopened.
  const { error: messagesError } = await supabase.from("messages").insert([
    {
      conversation_id: conversationId,
      role: "user",
      content: question,
      selected_model: "auto",
      study_mode: null,
      skill_id: null,
      document_metadata: null,
    },
    {
      conversation_id: conversationId,
      role: "assistant",
      content: artifactText,
      selected_model: "auto",
      study_mode: null,
      skill_id: null,
      document_metadata: null,
    },
  ]);

  if (messagesError) {
    console.error("Research save: messages insert failed:", messagesError);
  }

  // 3) The saved review itself, as a document artifact.
  try {
    await insertArtifacts(supabase, conversationId, [
      {
        type: "document",
        title,
        content: { text: artifactText, language: null },
      },
    ]);
  } catch (error) {
    console.error("Research save: artifact insert failed:", error);
    return NextResponse.json(
      { error: "Riset tersimpan sebagian. Coba lagi." },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversationId });
}
