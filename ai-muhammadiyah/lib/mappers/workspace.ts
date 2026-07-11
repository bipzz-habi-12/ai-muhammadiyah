import type { Workspace, WorkspaceRow } from "./types";

export function mapWorkspaceRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    systemInstructions: row.system_instructions ?? null,
  };
}
