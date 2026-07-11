"use client";

import { useCallback, useState } from "react";
import type { Workspace, WorkspaceRow } from "@/lib/mappers/types";
import { mapWorkspaceRow } from "@/lib/mappers/workspace";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function useWorkspaces(setHistoryError: (message: string) => void) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("chat_workspaces")
      .select("id,name,created_at,system_instructions")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setHistoryError("Workspace belum bisa dimuat.");
      return;
    }

    setWorkspaces(((data ?? []) as WorkspaceRow[]).map(mapWorkspaceRow));
  }, [setHistoryError]);

  async function createWorkspace() {
    const name = newWorkspaceName.trim();

    if (!name || isCreatingWorkspace) {
      return;
    }

    setIsCreatingWorkspace(true);
    setHistoryError("");

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("chat_workspaces")
      .insert({ name })
      .select("id,name,created_at,system_instructions")
      .single();

    if (error) {
      console.error(error);
      setHistoryError("Workspace belum bisa dibuat.");
      setIsCreatingWorkspace(false);
      return;
    }

    const workspace = mapWorkspaceRow(data as WorkspaceRow);
    setWorkspaces((current) =>
      [...current, workspace].sort((first, second) =>
        first.name.localeCompare(second.name),
      ),
    );
    setSelectedWorkspaceId(workspace.id);
    setNewWorkspaceName("");
    setIsCreatingWorkspace(false);
  }

  // Workspace System (v2): the permanent per-workspace instruction layer injected
  // into every chat in the workspace. Persisted on chat_workspaces.system_instructions.
  async function updateWorkspaceSystemInstructions(
    workspaceId: string,
    instructions: string,
  ) {
    if (!workspaceId) {
      return;
    }

    const nextValue = instructions.trim() || null;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("chat_workspaces")
      .update({ system_instructions: nextValue })
      .eq("id", workspaceId);

    if (error) {
      console.error(error);
      setHistoryError("Workspace System belum bisa disimpan.");
      return;
    }

    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, systemInstructions: nextValue }
          : workspace,
      ),
    );
  }

  return {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    newWorkspaceName,
    setNewWorkspaceName,
    isCreatingWorkspace,
    loadWorkspaces,
    createWorkspace,
    updateWorkspaceSystemInstructions,
  };
}
