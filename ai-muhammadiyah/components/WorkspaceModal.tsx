"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Icon } from "@/components/icons";
import type { Workspace } from "@/lib/mappers/types";

const systemInstructionsAutosaveMs = 800;

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  selectedWorkspaceId: string;
  setSelectedWorkspaceId: Dispatch<SetStateAction<string>>;
  newWorkspaceName: string;
  setNewWorkspaceName: Dispatch<SetStateAction<string>>;
  isCreatingWorkspace: boolean;
  createWorkspace: () => Promise<void>;
  updateWorkspaceSystemInstructions: (
    workspaceId: string,
    instructions: string,
  ) => Promise<void>;
}

// Workspace System editor: permanent per-workspace instructions injected into
// every chat in the workspace. Autosaves (debounced) + flushes on blur, mirroring
// the proven autosave pattern from the (now-removed) DocEditor. Remounted per
// workspace via `key`, so the draft always seeds from the correct workspace.
function WorkspaceSystemEditor({
  workspace,
  updateWorkspaceSystemInstructions,
}: {
  workspace: Workspace;
  updateWorkspaceSystemInstructions: (
    workspaceId: string,
    instructions: string,
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState(workspace.systemInstructions ?? "");
  const [isSaved, setIsSaved] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function flush(value: string) {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void updateWorkspaceSystemInstructions(workspace.id, value);
    setIsSaved(true);
  }

  function handleChange(value: string) {
    setDraft(value);
    setIsSaved(false);

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void updateWorkspaceSystemInstructions(workspace.id, value);
      setIsSaved(true);
    }, systemInstructionsAutosaveMs);
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5d6862]">
          Workspace System
        </h3>
        {isSaved && (
          <span className="text-xs font-semibold text-[#0f5a3d]">
            Tersimpan
          </span>
        )}
      </div>
      <p className="mb-2 text-xs leading-relaxed text-[#8a9089]">
        Instruksi permanen yang berlaku ke semua chat di workspace{" "}
        <span className="font-bold text-[#5d6862]">{workspace.name}</span>.
        Contoh: &ldquo;Selalu jawab evidence-based dan sertakan referensi
        jurnal.&rdquo;
      </p>
      <textarea
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={() => flush(draft)}
        rows={4}
        placeholder="Tulis instruksi permanen untuk workspace ini..."
        className="w-full resize-y rounded-2xl border border-[#0b3d2a]/10 bg-[#fbfaf6] px-4 py-3 text-sm leading-relaxed text-[#16211c] outline-none transition focus:border-[#0f5a3d]"
      />
    </section>
  );
}

export default function WorkspaceModal({
  isOpen,
  onClose,
  workspaces,
  selectedWorkspaceId,
  setSelectedWorkspaceId,
  newWorkspaceName,
  setNewWorkspaceName,
  isCreatingWorkspace,
  createWorkspace,
  updateWorkspaceSystemInstructions,
}: WorkspaceModalProps) {
  if (!isOpen) {
    return null;
  }

  const options: { id: string; name: string }[] = [
    { id: "", name: "General workspace" },
    ...workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
    })),
  ];

  // Workspace System targets the active workspace. General (id "") has no DB row,
  // so it has no editable system instructions.
  const activeWorkspace = selectedWorkspaceId
    ? workspaces.find((workspace) => workspace.id === selectedWorkspaceId)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#16211c]/40 px-3 py-4 sm:items-center sm:justify-center">
      <div className="max-h-[86vh] w-full max-w-lg overflow-hidden rounded-[24px] bg-[#f7f5ee] shadow-2xl ring-1 ring-[#0b3d2a]/10">
        <div className="flex items-center justify-between border-b border-[#0b3d2a]/10 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-[#0f5a3d]">Workspace</p>
            <h2 className="font-serif text-[22px] font-normal text-[#12211b]">Kelola workspace</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf6] text-[#5d6862] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#ece9df]"
            aria-label="Tutup"
            title="Tutup"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[62vh] space-y-5 overflow-auto p-5">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#5d6862]">
              Pilih workspace aktif
            </h3>
            <div className="space-y-2">
              {options.map((option) => {
                const isActive = option.id === selectedWorkspaceId;

                return (
                  <div
                    key={option.id || "general"}
                    className="flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        // Select (don't close) so the Workspace System editor below
                        // switches to this workspace. Close via the X button.
                        setSelectedWorkspaceId(option.id);
                      }}
                      className={
                        isActive
                          ? "flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl bg-[#0f5a3d]/10 px-4 py-3 text-left ring-1 ring-[#0f5a3d]/30"
                          : "flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#f0eee6]"
                      }
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon
                          name="book"
                          className="h-5 w-5 shrink-0 text-[#0f5a3d]"
                        />
                        <span className="truncate font-bold text-[#16211c]">
                          {option.name}
                        </span>
                      </span>
                      {isActive && (
                        <span className="shrink-0 rounded-full bg-[#0f5a3d]/10 px-2 py-1 text-xs font-bold text-[#0f5a3d]">
                          Aktif
                        </span>
                      )}
                    </button>
                    {/* General (id "") has no chat_workspaces row, so no page. */}
                    {option.id && (
                      <Link
                        href={`/workspace/${option.id}`}
                        title="Buka halaman workspace"
                        aria-label={`Buka halaman workspace ${option.name}`}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#5d6862] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#ece9df]"
                      >
                        <Icon name="external" className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {activeWorkspace && (
            <WorkspaceSystemEditor
              key={activeWorkspace.id}
              workspace={activeWorkspace}
              updateWorkspaceSystemInstructions={
                updateWorkspaceSystemInstructions
              }
            />
          )}

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#5d6862]">
              Buat workspace baru
            </h3>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void createWorkspace();
              }}
              className="flex gap-2"
            >
              <input
                value={newWorkspaceName}
                onChange={(event) => setNewWorkspaceName(event.target.value)}
                placeholder="Nama workspace"
                className="min-w-0 flex-1 rounded-2xl border border-[#0b3d2a]/10 bg-[#fbfaf6] px-4 py-3 text-sm font-semibold text-[#16211c] outline-none transition focus:border-[#0f5a3d]"
              />
              <button
                type="submit"
                disabled={!newWorkspaceName.trim() || isCreatingWorkspace}
                className="shrink-0 rounded-2xl bg-[#0f5a3d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:bg-[#0f5a3d]/40"
              >
                {isCreatingWorkspace ? "Membuat..." : "Buat"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
