import { notFound, redirect } from "next/navigation";
import { artifactTypeLabels, type ArtifactType } from "@/lib/artifacts";
import { getEmailInitials } from "@/lib/formatting/text";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import WorkspaceView, {
  type ChatItem,
  type WorkspaceSummary,
} from "./WorkspaceView";

// v2 Workspace page (design port of Workspace.dc.html). Server component: it
// gathers everything the view needs in a handful of read-only, RLS-scoped
// queries, then hands serializable props to the client shell. The active chat
// experience still lives in the SPA at "/" — cards deep-link back via
// ?conversationId=, and "New chat" via ?workspaceId= (preselects this workspace).

type WorkspacePageProps = {
  params: Promise<{ id: string }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Collapse a stored message into a one-line preview: drop artifact markers and
// the coarsest markdown noise, then squeeze whitespace. CSS handles the visual
// truncation, so a generous slice is enough to keep the payload small.
function buildPreview(content: string): string {
  return content
    .replace(/\[\[AI_MU_ARTIFACT:[^\]]*\]\]/g, " ")
    .replace(/\[\[\/AI_MU_ARTIFACT\]\]/g, " ")
    .replace(/\[\[[^\]]*\]\]/g, " ")
    .replace(/[#*_`>~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!uuidPattern.test(id)) {
    notFound();
  }

  // RLS scopes chat_workspaces to the owner, so a foreign id resolves to no row.
  const { data: workspace, error: workspaceError } = await supabase
    .from("chat_workspaces")
    .select("id,name,icon,color,system_instructions")
    .eq("id", id)
    .maybeSingle();

  if (workspaceError) {
    console.error(workspaceError);
  }

  if (!workspace) {
    notFound();
  }

  // Sidebar: every workspace the user owns, plus a per-workspace chat count.
  const [{ data: workspaceRows }, { data: countRows }] = await Promise.all([
    supabase
      .from("chat_workspaces")
      .select("id,name,icon,color")
      .order("name", { ascending: true }),
    supabase.from("conversations").select("workspace_id"),
  ]);

  const counts = new Map<string, number>();
  for (const row of (countRows ?? []) as { workspace_id: string | null }[]) {
    if (row.workspace_id) {
      counts.set(row.workspace_id, (counts.get(row.workspace_id) ?? 0) + 1);
    }
  }

  // This workspace's conversations (pinned first, then most recent).
  const { data: conversationRows, error: conversationsError } = await supabase
    .from("conversations")
    .select("id,title,created_at,updated_at,is_pinned")
    .eq("workspace_id", id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (conversationsError) {
    console.error(conversationsError);
  }

  const conversations = (conversationRows ?? []) as {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    is_pinned: boolean;
  }[];
  const conversationIds = conversations.map((conversation) => conversation.id);

  // Latest message per conversation → preview text + the most recent skill used.
  const previewByConv = new Map<string, string>();
  const skillIdByConv = new Map<string, string>();

  if (conversationIds.length > 0) {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("conversation_id,content,skill_id")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(600);

    for (const message of (messageRows ?? []) as {
      conversation_id: string;
      content: string | null;
      skill_id: string | null;
    }[]) {
      if (!previewByConv.has(message.conversation_id) && message.content) {
        const preview = buildPreview(message.content);
        if (preview) {
          previewByConv.set(message.conversation_id, preview);
        }
      }
      if (!skillIdByConv.has(message.conversation_id) && message.skill_id) {
        skillIdByConv.set(message.conversation_id, message.skill_id);
      }
    }
  }

  // Resolve skill ids to their slash command (fall back to the skill name).
  const skillLabelById = new Map<string, string>();
  const neededSkillIds = [...new Set(skillIdByConv.values())];

  if (neededSkillIds.length > 0) {
    const { data: skillRows } = await supabase
      .from("skills")
      .select("id,slash_command,name")
      .in("id", neededSkillIds);

    for (const skill of (skillRows ?? []) as {
      id: string;
      slash_command: string | null;
      name: string;
    }[]) {
      skillLabelById.set(skill.id, skill.slash_command || skill.name);
    }
  }

  // Latest artifact per conversation → the artifact badge.
  const artifactByConv = new Map<string, string>();

  if (conversationIds.length > 0) {
    const { data: artifactRows } = await supabase
      .from("artifacts")
      .select("conversation_id,type,title,updated_at")
      .in("conversation_id", conversationIds)
      .order("updated_at", { ascending: false });

    for (const artifact of (artifactRows ?? []) as {
      conversation_id: string;
      type: string;
      title: string;
    }[]) {
      if (artifactByConv.has(artifact.conversation_id)) {
        continue;
      }
      const label =
        artifactTypeLabels[artifact.type as ArtifactType] ?? "Artifact";
      artifactByConv.set(
        artifact.conversation_id,
        artifact.title && artifact.title !== "Untitled"
          ? `${label} · ${artifact.title}`
          : label,
      );
    }
  }

  const chats: ChatItem[] = conversations.map((conversation) => {
    const skillId = skillIdByConv.get(conversation.id);
    return {
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updated_at,
      isPinned: conversation.is_pinned,
      preview: previewByConv.get(conversation.id) ?? "",
      skill: skillId ? (skillLabelById.get(skillId) ?? null) : null,
      artifact: artifactByConv.get(conversation.id) ?? null,
    };
  });

  const workspaces: WorkspaceSummary[] = (
    (workspaceRows ?? []) as {
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    count: counts.get(row.id) ?? 0,
  }));

  const lastUpdatedIso = conversations.reduce<string | null>(
    (latest, conversation) => {
      if (!latest || new Date(conversation.updated_at) > new Date(latest)) {
        return conversation.updated_at;
      }
      return latest;
    },
    null,
  );

  return (
    <WorkspaceView
      workspace={{
        id: workspace.id,
        name: workspace.name,
        icon: workspace.icon ?? null,
        color: workspace.color ?? null,
        systemInstructions: workspace.system_instructions ?? null,
      }}
      workspaces={workspaces}
      chats={chats}
      lastUpdatedIso={lastUpdatedIso}
      userInitials={getEmailInitials(user.email ?? "")}
      hasError={Boolean(conversationsError)}
    />
  );
}
