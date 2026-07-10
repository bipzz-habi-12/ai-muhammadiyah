import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/ai/chat";

type MessageContextRow = {
  role: "user" | "assistant";
  content: string;
};

// Shared by Docs/Tasks "generate from chat" endpoints: reconstructs the
// conversation's message history server-side (RLS-scoped through the caller's
// authed client), rather than trusting a client-sent message array.
export async function loadConversationMessagesForGenerate(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role,content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MessageContextRow[])
    .filter((row) => row.content.trim())
    .map((row) => ({
      role: row.role === "assistant" ? "ai" : "user",
      text: row.content,
    }));
}
