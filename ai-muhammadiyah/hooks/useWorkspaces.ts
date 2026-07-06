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
      .select("id,name,created_at")
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
      .select("id,name,created_at")
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

  return {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    newWorkspaceName,
    setNewWorkspaceName,
    isCreatingWorkspace,
    loadWorkspaces,
    createWorkspace,
  };
}
