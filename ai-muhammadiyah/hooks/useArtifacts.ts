"use client";

import { useCallback, useMemo, useState } from "react";
import {
  deleteArtifactRow,
  fetchConversationArtifacts,
  insertArtifacts,
  type Artifact,
  type ArtifactDraft,
} from "@/lib/artifacts";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Artifacts of the ACTIVE conversation + right-panel open state. Follows the
// established hook rules: no imports of other hooks; useChatSession receives
// saveArtifacts/loadArtifacts as constructor params, composed in page.tsx.
export function useArtifacts() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);

  // Called from loadConversation (as a param): replaces the list with the
  // opened conversation's artifacts. Panel closes on switch — predictable, and
  // the TopBar pill shows the count for reopening.
  const loadArtifacts = useCallback(async (conversationId: string) => {
    setIsArtifactPanelOpen(false);
    setIsLoadingArtifacts(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const data = await fetchConversationArtifacts(supabase, conversationId);
      setArtifacts(data);
      setActiveArtifactId(data.at(-1)?.id ?? null);
    } catch (error) {
      console.error(error);
      setArtifacts([]);
      setActiveArtifactId(null);
    } finally {
      setIsLoadingArtifacts(false);
    }
  }, []);

  // Called from sendMessage after the assistant message is persisted. Returns
  // false instead of throwing — a failed artifact save must never fail the
  // message flow itself.
  const saveArtifacts = useCallback(
    async (conversationId: string, drafts: ArtifactDraft[]) => {
      if (!drafts.length) {
        return true;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        const saved = await insertArtifacts(supabase, conversationId, drafts);
        setArtifacts((prev) => [...prev, ...saved]);
        setActiveArtifactId(saved.at(-1)?.id ?? null);
        setIsArtifactPanelOpen(true);
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [],
  );

  async function deleteArtifact(artifactId: string) {
    try {
      const supabase = createSupabaseBrowserClient();
      await deleteArtifactRow(supabase, artifactId);
    } catch (error) {
      console.error(error);
      return;
    }

    const next = artifacts.filter((artifact) => artifact.id !== artifactId);
    setArtifacts(next);

    if (activeArtifactId === artifactId) {
      setActiveArtifactId(next.at(-1)?.id ?? null);
    }

    if (!next.length) {
      setIsArtifactPanelOpen(false);
    }
  }

  const resetArtifacts = useCallback(() => {
    setArtifacts([]);
    setActiveArtifactId(null);
    setIsArtifactPanelOpen(false);
  }, []);

  const activeArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === activeArtifactId) ?? null,
    [artifacts, activeArtifactId],
  );

  return {
    artifacts,
    isLoadingArtifacts,
    activeArtifact,
    activeArtifactId,
    setActiveArtifactId,
    isArtifactPanelOpen,
    setIsArtifactPanelOpen,
    loadArtifacts,
    saveArtifacts,
    deleteArtifact,
    resetArtifacts,
  };
}
