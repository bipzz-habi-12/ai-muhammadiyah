"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  getFriendlyChatError,
  parseContinuationMarker,
  continuationMarker,
} from "@/lib/chat/errors";
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

const streamUiFlushMs = 48;

const welcomeMessage: Message = {
  role: "ai",
  text: "Assalamualaikum. Saya AI Muhammadiyah, siap membantu belajar Islam, Cambridge, OSN/STEM, dan coding.",
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
    setSelectedModel(
      allowedModels.includes(conversation.model) ? conversation.model : "auto",
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

  async function sendMessage(
    messageOverride?: string,
    options?: { hiddenInstruction?: boolean; appendToLastAssistant?: boolean },
  ) {
    const userText = (messageOverride ?? input).trim();
    const isHiddenInstruction = Boolean(options?.hiddenInstruction);
    const appendTarget =
      isHiddenInstruction && options?.appendToLastAssistant
        ? [...messages].reverse().find((message) => message.role === "ai")
        : undefined;
    const canAppendToAssistant = Boolean(appendTarget?.id);
    const appendBaseText = canAppendToAssistant
      ? appendTarget?.text.replace(continuationMarker, "").trimEnd() ?? ""
      : "";

    if (!userText || isSending || !hasMessageQuota) return;

    const activeSkill = resolveAllowedSkill(
      selectedSkillId,
      usageSnapshot?.tier,
      skills,
    );

    if (!activeSkill) {
      setComposerNotice("Skill masih dimuat, coba lagi sebentar.");
      return;
    }

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
    const nextMessages: Message[] = isHiddenInstruction
      ? messages
      : [...messages, visibleUserMessage];
    const aiHistory = getRecentChatHistory(
      isHiddenInstruction ? messages : nextMessages,
    );

    setMessages(nextMessages);
    if (!isHiddenInstruction) {
      setInput("");
    }
    setIsSending(true);
    setIsAwaitingFirstChunk(true);
    const requestController = new AbortController();
    let streamFlushTimer: number | null = null;
    let latestParsedReply = {
      text: "",
      needsContinuation: false,
    };
    let didReceiveFirstChunk = false;
    activeRequestRef.current?.abort();
    activeRequestRef.current = requestController;

    const applyStreamedReply = (parsedReply = latestParsedReply) => {
      setMessages((prev) => {
        const updatedMessages = [...prev];
        const lastMessage = updatedMessages.at(-1);

        if (lastMessage?.role === "ai") {
          if (canAppendToAssistant && appendTarget?.id) {
            const targetIndex = updatedMessages.findIndex(
              (message) => message.id === appendTarget.id,
            );

            if (targetIndex >= 0) {
              updatedMessages[targetIndex] = {
                ...updatedMessages[targetIndex],
                text: `${appendBaseText}\n\n${parsedReply.text}`.trim(),
                continuationSuggested: parsedReply.needsContinuation,
              };
            }
          } else {
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              text: parsedReply.text,
              continuationSuggested: parsedReply.needsContinuation,
            };
          }
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

      if (!isHiddenInstruction) {
        const { error: userMessageError } = await supabase.from("messages").insert({
          conversation_id: currentConversation.id,
          role: "user",
          content: userText,
          selected_model: selectedModel,
          study_mode: skillToLegacyStudyMode(activeSkill),
          document_metadata: documentMetadata,
        });

        if (userMessageError) {
          throw userMessageError;
        }
      }

      if (canAppendToAssistant) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === appendTarget?.id
              ? {
                  ...message,
                  continuationSuggested: false,
                }
              : message,
          ),
        );
      } else {
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
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: requestController.signal,
        body: JSON.stringify({
          history: aiHistory,
          internalInstruction: isHiddenInstruction ? userText : undefined,
          pdfContext: currentDocumentContext,
          documentContexts,
          imageContexts,
          selectedModel,
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
        latestParsedReply = parseContinuationMarker(streamedReply);

        if (!didReceiveFirstChunk) {
          didReceiveFirstChunk = true;
          setIsAwaitingFirstChunk(false);
        }

        scheduleStreamFlush();
      }

      const finalChunk = decoder.decode();

      if (finalChunk) {
        streamedReply += finalChunk;
        latestParsedReply = parseContinuationMarker(streamedReply);
        setIsAwaitingFirstChunk(false);
      }

      if (streamFlushTimer !== null) {
        window.clearTimeout(streamFlushTimer);
        streamFlushTimer = null;
      }

      applyStreamedReply(latestParsedReply);

      const finalReply = parseContinuationMarker(streamedReply);

      if (!finalReply.text.trim()) {
        throw new Error("Chat stream returned an empty reply");
      }

      const finalAssistantText = canAppendToAssistant
        ? `${appendBaseText}\n\n${finalReply.text}`.trim()
        : finalReply.text;
      const assistantWrite = canAppendToAssistant && appendTarget?.id
        ? await supabase
            .from("messages")
            .update({
              content: finalAssistantText,
              selected_model: selectedModel,
              study_mode: skillToLegacyStudyMode(activeSkill),
              document_metadata: documentMetadata,
            })
            .eq("id", appendTarget.id)
        : await supabase
            .from("messages")
            .insert({
              conversation_id: currentConversation.id,
              role: "assistant",
              content: finalAssistantText,
              selected_model: selectedModel,
              study_mode: skillToLegacyStudyMode(activeSkill),
              document_metadata: documentMetadata,
            })
            .select("id")
            .single();
      const assistantMessageError = assistantWrite.error;

      if (assistantMessageError) {
        throw assistantMessageError;
      }

      if (!canAppendToAssistant && "data" in assistantWrite && assistantWrite.data) {
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
                continuationSuggested: finalReply.needsContinuation,
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
          study_mode: skillToLegacyStudyMode(activeSkill),
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
                  skillId: activeSkill.id,
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

      await loadUsage();
      setIsAwaitingFirstChunk(false);
      setIsSending(false);
    }
  }

  function continueAnswer() {
    void sendMessage(
      "Lanjutkan jawaban sebelumnya dari bagian terakhir. Jangan ulangi dari awal, lanjutkan secara runtut sampai selesai.",
      {
        hiddenInstruction: true,
        appendToLastAssistant: true,
      },
    );
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
      lines.push(`## ${message.role === "user" ? "User" : "AI Muhammadiyah"}`);
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
    continueAnswer,
    loadConversation,
    createConversation,
    resetChatSessionState,
    exportActiveChatMarkdown,
    openSharePreview,
  };
}
