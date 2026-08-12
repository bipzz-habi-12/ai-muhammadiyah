"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { parseArtifactBlocks, type ArtifactDraft } from "@/lib/artifacts";
import { getFriendlyChatError } from "@/lib/chat/errors";
import {
  createConversationTitle,
  mapConversationRow,
  sortConversations,
} from "@/lib/mappers/conversation";
import { skillToLegacyStudyMode } from "@/lib/mappers/legacy-study-mode";
import { getRecentChatHistory, mapMessageRow } from "@/lib/mappers/message";
import type {
  Conversation,
  ConversationRow,
  DocumentMetadata,
  DocumentStatus,
  Message,
  MessageRow,
  UploadedAttachment,
  Workspace,
} from "@/lib/mappers/types";
import { resolveAllowedSkill, type Skill } from "@/lib/skills";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PlanModelId } from "@/lib/subscriptions/plans";
import type { UsageSnapshot } from "@/lib/usage/limits";
import {
  defaultModelId,
  type EffortLevel,
} from "@/lib/subscriptions/plans";

const streamUiFlushMs = 48;

const welcomeMessage: Message = {
  role: "ai",
  text: "Assalamualaikum. Saya M-Agent, siap membantu belajar, meneliti, menulis, dan bekerja.",
};

export function useChatSession(
  userId: string,
  setHistoryError: (message: string) => void,
  selectedWorkspaceId: string,
  setSelectedWorkspaceId: Dispatch<SetStateAction<string>>,
  workspaces: Workspace[],
  usageSnapshot: UsageSnapshot | null,
  hasMessageQuota: boolean,
  allowedModels: string[],
  loadUsage: () => Promise<UsageSnapshot | null>,
  skills: Skill[],
  selectedSkillId: string | null,
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>,
  selectedSkill: Skill | null,
  selectedModel: PlanModelId,
  setSelectedModel: Dispatch<SetStateAction<PlanModelId>>,
  effort: EffortLevel,
  isThinkingEnabled: boolean,
  uploadedAttachments: UploadedAttachment[],
  setUploadedAttachments: Dispatch<SetStateAction<UploadedAttachment[]>>,
  documentText: string,
  setDocumentText: Dispatch<SetStateAction<string>>,
  setDocumentStatus: Dispatch<SetStateAction<DocumentStatus>>,
  setDocumentError: Dispatch<SetStateAction<string>>,
  documentTextRef: MutableRefObject<string>,
  getCurrentDocumentMetadata: () => DocumentMetadata | null,
  resetDocumentState: () => void,
  setComposerNotice: Dispatch<SetStateAction<string>>,
  setConversations: Dispatch<SetStateAction<Conversation[]>>,
  activeConversation: Conversation | undefined,
  setActiveConversationId: Dispatch<SetStateAction<string>>,
  messageSkillOverrideId: string | null,
  setMessageSkillOverrideId: Dispatch<SetStateAction<string | null>>,
  saveArtifacts: (
    conversationId: string,
    drafts: ArtifactDraft[],
  ) => Promise<boolean>,
  loadArtifacts: (conversationId: string) => Promise<void>,
) {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [sharePreview, setSharePreview] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAwaitingFirstChunk, setIsAwaitingFirstChunk] = useState(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: isSending ? "auto" : "smooth",
        block: "end",
      });
      scrollFrameRef.current = null;
    });

    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [messages.length, isSending]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  function resetChatSessionState() {
    setMessages([welcomeMessage]);
    setInput("");
    setSharePreview("");
  }

  async function loadConversation(conversation: Conversation) {
    if (isSending) return;

    setHistoryError("");
    setActiveConversationId(conversation.id);
    void loadArtifacts(conversation.id);
    setSelectedModel(
      allowedModels.includes(conversation.model)
        ? conversation.model
        : defaultModelId,
    );
    setSelectedSkillId(
      resolveAllowedSkill(conversation.skillId, usageSnapshot?.tier, skills)?.id ??
        null,
    );
    setSelectedWorkspaceId(conversation.workspaceId ?? "");

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id,conversation_id,role,content,created_at,selected_model,study_mode,document_metadata",
      )
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setHistoryError("Pesan obrolan belum bisa dimuat.");
      return;
    }

    const loadedMessages = ((data ?? []) as MessageRow[]).map((row) =>
      mapMessageRow(row, skills),
    );
    setMessages(loadedMessages.length ? loadedMessages : [welcomeMessage]);

    const latestDocumentMetadata =
      [...loadedMessages].reverse().find((message) => message.documentMetadata)
        ?.documentMetadata ?? conversation.documentMetadata;

    if (latestDocumentMetadata) {
      setUploadedAttachments(
        latestDocumentMetadata.files?.length
          ? latestDocumentMetadata.files.map((file, index) => ({
              id: `${file.fileName}-${index}`,
              fileName: file.fileName,
              fileType: file.fileType,
              kind: file.kind ?? (file.fileType === "Image" ? "image" : "document"),
              status: file.status,
            }))
          : [
              {
                id: latestDocumentMetadata.fileName,
                fileName: latestDocumentMetadata.fileName,
                fileType: latestDocumentMetadata.fileType,
                kind:
                  latestDocumentMetadata.fileType === "Image"
                    ? "image"
                    : "document",
                status: latestDocumentMetadata.status,
              },
            ],
      );
      setDocumentStatus(latestDocumentMetadata.status);
      setDocumentError("");
      documentTextRef.current = "";
      setDocumentText("");
    } else {
      resetDocumentState();
    }
  }

  async function createConversation(userText: string) {
    const title = createConversationTitle(userText);
    const documentMetadata = getCurrentDocumentMetadata();
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        title,
        selected_model: selectedModel,
        study_mode: skillToLegacyStudyMode(selectedSkill),
        document_metadata: documentMetadata,
        workspace_id: selectedWorkspaceId || null,
      })
      .select(
        "id,title,created_at,updated_at,selected_model,study_mode,document_metadata,workspace_id,is_pinned",
      )
      .single();

    if (error) {
      throw error;
    }

    const conversation = mapConversationRow(data as ConversationRow, skills);
    setConversations((prev) => sortConversations([conversation, ...prev]));
    setActiveConversationId(conversation.id);

    return conversation;
  }

  async function sendMessage(messageOverride?: string) {
    const userText = (messageOverride ?? input).trim();

    if (!userText || isSending || !hasMessageQuota) return;

    // A "/" slash override applies to this one visible message only.
    const activeSkill = resolveAllowedSkill(
      messageSkillOverrideId ?? selectedSkillId,
      usageSnapshot?.tier,
      skills,
    );

    if (!activeSkill) {
      setComposerNotice("Skill masih dimuat, coba lagi sebentar.");
      return;
    }

    // The conversation's persistent skill tracks the SESSION selection, never the
    // one-shot "/" override — otherwise the override would leak into the stored
    // conversation and reappear as the default on the next reload.
    const sessionSkill =
      messageSkillOverrideId
        ? (resolveAllowedSkill(selectedSkillId, usageSnapshot?.tier, skills) ??
          activeSkill)
        : activeSkill;

    const currentDocumentContext = documentTextRef.current || documentText;
    const documentContexts = uploadedAttachments
      .filter(
        (attachment) =>
          attachment.kind === "document" &&
          attachment.status === "loaded" &&
          attachment.text,
      )
      .map((attachment) => ({
        fileName: attachment.fileName,
        fileType: attachment.fileType.toLowerCase(),
        text: attachment.text ?? "",
      }));
    const imageContexts = uploadedAttachments
      .filter(
        (attachment) =>
          attachment.kind === "image" &&
          attachment.status === "loaded" &&
          attachment.data &&
          attachment.mimeType,
      )
      .map((attachment) => ({
        fileName: attachment.fileName,
        mimeType: attachment.mimeType ?? "image/jpeg",
        data: attachment.data ?? "",
      }));
    const documentMetadata = getCurrentDocumentMetadata();
    // Workspace System (v2): permanent per-workspace instructions injected into
    // every chat in the workspace. Follow the conversation's own workspace when it
    // has one, else the workspace a new chat will be created under.
    const activeWorkspaceId =
      activeConversation?.workspaceId ?? selectedWorkspaceId;
    const workspaceSystemInstructions =
      workspaces.find((workspace) => workspace.id === activeWorkspaceId)
        ?.systemInstructions ?? "";
    let conversation = activeConversation;
    const visibleUserMessage: Message = {
      role: "user",
      text: userText,
      model: selectedModel,
      skillId: activeSkill.id,
      documentMetadata,
    };
    const nextMessages: Message[] = [...messages, visibleUserMessage];
    const aiHistory = getRecentChatHistory(nextMessages);

    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setIsAwaitingFirstChunk(true);
    const requestController = new AbortController();
    let streamFlushTimer: number | null = null;
    let latestReplyText = "";
    let didReceiveFirstChunk = false;
    activeRequestRef.current?.abort();
    activeRequestRef.current = requestController;

    const applyStreamedReply = (replyText = latestReplyText) => {
      setMessages((prev) => {
        const updatedMessages = [...prev];
        const lastMessage = updatedMessages.at(-1);

        if (lastMessage?.role === "ai") {
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            text: replyText,
          };
        }

        return updatedMessages;
      });
    };

    const scheduleStreamFlush = () => {
      if (streamFlushTimer !== null) {
        return;
      }

      streamFlushTimer = window.setTimeout(() => {
        streamFlushTimer = null;
        applyStreamedReply();
      }, streamUiFlushMs);
    };

    const supabase = createSupabaseBrowserClient();

    try {
      conversation ??= await createConversation(userText);
      const currentConversation = conversation;

      const { error: userMessageError } = await supabase.from("messages").insert({
        conversation_id: currentConversation.id,
        role: "user",
        content: userText,
        selected_model: selectedModel,
        study_mode: skillToLegacyStudyMode(activeSkill),
        skill_id: activeSkill.id,
        document_metadata: documentMetadata,
      });

      if (userMessageError) {
        throw userMessageError;
      }

      setMessages([
        ...nextMessages,
        {
          role: "ai",
          text: "",
          model: selectedModel,
          skillId: activeSkill.id,
          documentMetadata,
        },
      ]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: requestController.signal,
        body: JSON.stringify({
          history: aiHistory,
          pdfContext: currentDocumentContext,
          documentContexts,
          imageContexts,
          selectedModel,
          effort,
          thinking: isThinkingEnabled,
          skillId: activeSkill.id,
          workspaceSystemInstructions,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(errorData?.error ?? "Chat API request failed");
      }

      if (!response.body) {
        throw new Error("Chat stream is unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedReply = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        if (!chunk) {
          continue;
        }

        streamedReply += chunk;
        latestReplyText = streamedReply;

        if (!didReceiveFirstChunk) {
          didReceiveFirstChunk = true;
          setIsAwaitingFirstChunk(false);
        }

        scheduleStreamFlush();
      }

      const finalChunk = decoder.decode();

      if (finalChunk) {
        streamedReply += finalChunk;
        latestReplyText = streamedReply;
        setIsAwaitingFirstChunk(false);
      }

      if (streamFlushTimer !== null) {
        window.clearTimeout(streamFlushTimer);
        streamFlushTimer = null;
      }

      applyStreamedReply(latestReplyText);

      const finalAssistantText = streamedReply.trimEnd();

      if (!finalAssistantText.trim()) {
        throw new Error("Chat stream returned an empty reply");
      }

      const assistantWrite = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversation.id,
          role: "assistant",
          content: finalAssistantText,
          selected_model: selectedModel,
          study_mode: skillToLegacyStudyMode(activeSkill),
          skill_id: activeSkill.id,
          document_metadata: documentMetadata,
        })
        .select("id")
        .single();
      const assistantMessageError = assistantWrite.error;

      if (assistantMessageError) {
        throw assistantMessageError;
      }

      if (assistantWrite.data) {
        const assistantRow = assistantWrite.data as { id?: string };
        if (assistantRow.id) {
          setMessages((prev) => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages.at(-1);

            if (lastMessage?.role === "ai") {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                id: assistantRow.id,
                text: finalAssistantText,
              };
            }

            return updatedMessages;
          });
        }
      }

      const updatedAt = new Date().toISOString();
      await supabase
        .from("conversations")
        .update({
          selected_model: selectedModel,
          study_mode: skillToLegacyStudyMode(sessionSkill),
          document_metadata: documentMetadata,
          workspace_id:
            currentConversation.workspaceId ?? (selectedWorkspaceId || null),
          updated_at: updatedAt,
        })
        .eq("id", currentConversation.id);

      setConversations((prev) =>
        prev
          .map((item) =>
            item.id === currentConversation.id
              ? {
                  ...item,
                  model: selectedModel,
                  skillId: sessionSkill.id,
                  documentMetadata,
                  workspaceId:
                    currentConversation.workspaceId ??
                    (selectedWorkspaceId || null),
                  updatedAt,
                }
              : item,
          )
          .sort(
            (first, second) =>
              new Date(second.updatedAt).getTime() -
              new Date(first.updatedAt).getTime(),
          ),
      );

      const artifactDrafts = parseArtifactBlocks(finalAssistantText);

      if (artifactDrafts.length) {
        const artifactsSaved = await saveArtifacts(
          currentConversation.id,
          artifactDrafts,
        );

        if (!artifactsSaved) {
          setComposerNotice(
            "Artifact belum bisa disimpan. Isi lengkapnya tetap ada di balasan ini.",
          );
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error(error);
      const errorText = getFriendlyChatError(error);

      if (conversation?.id) {
        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: errorText,
          selected_model: selectedModel,
          study_mode: skillToLegacyStudyMode(activeSkill),
          skill_id: activeSkill.id,
          document_metadata: documentMetadata,
        });
      }

      setMessages((prev) =>
        prev.at(-1)?.role === "ai"
          ? [
              ...prev.slice(0, -1),
              {
                role: "ai",
                text: errorText,
                model: selectedModel,
                skillId: activeSkill.id,
                documentMetadata,
              },
            ]
          : [
              ...prev,
              {
                role: "ai",
                text: errorText,
                model: selectedModel,
                skillId: activeSkill.id,
                documentMetadata,
              },
            ],
      );
    } finally {
      if (streamFlushTimer !== null) {
        window.clearTimeout(streamFlushTimer);
      }

      if (activeRequestRef.current === requestController) {
        activeRequestRef.current = null;
      }

      // The one-shot "/" override is consumed by this message; clear it so the
      // next message reverts to the session's selected skill.
      setMessageSkillOverrideId(null);

      await loadUsage();
      setIsAwaitingFirstChunk(false);
      setIsSending(false);
    }
  }

  function getActiveChatMarkdown() {
    const title = activeConversation?.title ?? "Obrolan baru";
    const workspaceName =
      workspaces.find((workspace) => workspace.id === activeConversation?.workspaceId)
        ?.name ?? "General";
    const lines = [
      `# ${title}`,
      "",
      `Workspace: ${workspaceName}`,
      `Exported: ${new Date().toISOString()}`,
      "",
    ];

    for (const message of messages.filter((item) => item.text.trim())) {
      lines.push(`## ${message.role === "user" ? "User" : "M-Agent"}`);
      lines.push("");
      lines.push(message.text.trim());
      lines.push("");
    }

    return lines.join("\n");
  }

  function exportActiveChatMarkdown() {
    if (messages.length <= 1) {
      setHistoryError("Belum ada isi obrolan untuk diexport.");
      return;
    }

    const markdown = getActiveChatMarkdown();
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(activeConversation?.title ?? "ai-mu-chat")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ai-mu-chat"}.md`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function openSharePreview() {
    if (messages.length <= 1) {
      setHistoryError("Belum ada isi obrolan untuk dibuat preview.");
      return;
    }

    const previewMessages = messages
      .filter((message) => message.text.trim())
      .slice(0, 6)
      .map(
        (message) =>
          `${message.role === "user" ? "User" : "AI"}: ${message.text
            .trim()
            .slice(0, 360)}`,
      )
      .join("\n\n");

    setSharePreview(
      [
        `Local share preview: ${activeConversation?.title ?? "Obrolan baru"}`,
        "",
        previewMessages,
        "",
        "Public link sharing belum diaktifkan. Preview ini disiapkan untuk alur share link berikutnya.",
      ].join("\n"),
    );
  }

  return {
    messages,
    setMessages,
    input,
    setInput,
    isSending,
    isAwaitingFirstChunk,
    sharePreview,
    setSharePreview,
    messagesEndRef,
    sendMessage,
    loadConversation,
    createConversation,
    resetChatSessionState,
    exportActiveChatMarkdown,
    openSharePreview,
  };
}
