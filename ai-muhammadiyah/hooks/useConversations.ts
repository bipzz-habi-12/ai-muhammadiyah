"use client";

import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from "react";
import {
  mapConversationRow,
  sortConversations,
} from "@/lib/mappers/conversation";
import type { Conversation, ConversationRow } from "@/lib/mappers/types";
import type { Skill } from "@/lib/skills";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function useConversations(
  skillsRef: MutableRefObject<Skill[]>,
  setHistoryError: (message: string) => void,
  resetMemory: () => void,
) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchConversations, setSearchConversations] = useState<
    Conversation[] | null
  >(null);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [renamingConversationId, setRenamingConversationId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [chatSearch, setChatSearch] = useState("");

  const loadConversations = useCallback(async () => {
    setHistoryError("");
    setIsLoadingConversations(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id,title,created_at,updated_at,selected_model,study_mode,document_metadata,workspace_id,is_pinned",
      )
      .order("updated_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error(error);
      setHistoryError("Riwayat obrolan belum bisa dimuat.");
      setIsLoadingConversations(false);
      return;
    }

    setConversations(
      sortConversations(
        ((data ?? []) as ConversationRow[]).map((row) =>
          mapConversationRow(row, skillsRef.current),
        ),
      ),
    );
    setIsLoadingConversations(false);
  }, [setHistoryError, skillsRef]);

  async function renameConversation(conversationId: string) {
    const title = renameValue.trim();

    if (!title) {
      setRenamingConversationId("");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("conversations")
      .update({ title })
      .eq("id", conversationId);

    if (error) {
      console.error(error);
      setHistoryError("Nama obrolan belum bisa diubah.");
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, title }
          : conversation,
      ),
    );
    setRenamingConversationId("");
    setRenameValue("");
  }

  async function deleteConversation(conversationId: string) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      console.error(error);
      setHistoryError("Obrolan belum bisa dihapus.");
      return;
    }

    setConversations((prev) =>
      prev.filter((conversation) => conversation.id !== conversationId),
    );

    if (activeConversationId === conversationId) {
      resetMemory();
    }
  }

  async function toggleConversationPin(conversation: Conversation) {
    const nextPinned = !conversation.isPinned;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("conversations")
      .update({ is_pinned: nextPinned })
      .eq("id", conversation.id);

    if (error) {
      console.error(error);
      setHistoryError("Status pin belum bisa diubah.");
      return;
    }

    setConversations((prev) =>
      sortConversations(
        prev.map((item) =>
          item.id === conversation.id ? { ...item, isPinned: nextPinned } : item,
        ),
      ),
    );
    setSearchConversations((prev) =>
      prev
        ? sortConversations(
            prev.map((item) =>
              item.id === conversation.id
                ? { ...item, isPinned: nextPinned }
                : item,
            ),
          )
        : prev,
    );
  }

  async function updateConversationWorkspace(
    conversationId: string,
    workspaceId: string,
  ) {
    const nextWorkspaceId = workspaceId || null;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("conversations")
      .update({ workspace_id: nextWorkspaceId })
      .eq("id", conversationId);

    if (error) {
      console.error(error);
      setHistoryError("Workspace obrolan belum bisa diubah.");
      return;
    }

    const updateItem = (conversation: Conversation) =>
      conversation.id === conversationId
        ? { ...conversation, workspaceId: nextWorkspaceId }
        : conversation;

    setConversations((prev) => prev.map(updateItem));
    setSearchConversations((prev) => (prev ? prev.map(updateItem) : prev));
  }

  useEffect(() => {
    const query = chatSearch.trim();

    if (!query) {
      window.queueMicrotask(() => setSearchConversations(null));
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setHistoryError("");

      const supabase = createSupabaseBrowserClient();
      const titleMatches = await supabase
        .from("conversations")
        .select(
          "id,title,created_at,updated_at,selected_model,study_mode,document_metadata,workspace_id,is_pinned",
        )
        .ilike("title", `%${query}%`)
        .limit(30);
      const messageMatches = await supabase
        .from("messages")
        .select("conversation_id")
        .ilike("content", `%${query}%`)
        .limit(60);

      if (titleMatches.error || messageMatches.error) {
        console.error(titleMatches.error ?? messageMatches.error);
        setHistoryError("Pencarian obrolan belum bisa dijalankan.");
        return;
      }

      const conversationIds = Array.from(
        new Set(
          ((messageMatches.data ?? []) as { conversation_id: string }[]).map(
            (row) => row.conversation_id,
          ),
        ),
      );
      const messageConversationMatches = conversationIds.length
        ? await supabase
            .from("conversations")
            .select(
              "id,title,created_at,updated_at,selected_model,study_mode,document_metadata,workspace_id,is_pinned",
            )
            .in("id", conversationIds)
        : { data: [], error: null };

      if (messageConversationMatches.error) {
        console.error(messageConversationMatches.error);
        setHistoryError("Hasil pesan belum bisa dimuat.");
        return;
      }

      const byId = new Map<string, Conversation>();
      for (const row of [
        ...((titleMatches.data ?? []) as ConversationRow[]),
        ...((messageConversationMatches.data ?? []) as ConversationRow[]),
      ]) {
        const conversation = mapConversationRow(row, skillsRef.current);
        byId.set(conversation.id, conversation);
      }

      setSearchConversations(sortConversations(Array.from(byId.values())));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [chatSearch, skillsRef, setHistoryError]);

  const visibleConversations = useMemo(
    () => searchConversations ?? conversations,
    [conversations, searchConversations],
  );
  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ),
    [activeConversationId, conversations],
  );

  return {
    conversations,
    setConversations,
    searchConversations,
    setSearchConversations,
    activeConversationId,
    setActiveConversationId,
    isLoadingConversations,
    renamingConversationId,
    setRenamingConversationId,
    renameValue,
    setRenameValue,
    chatSearch,
    setChatSearch,
    loadConversations,
    renameConversation,
    deleteConversation,
    toggleConversationPin,
    updateConversationWorkspace,
    visibleConversations,
    activeConversation,
  };
}
