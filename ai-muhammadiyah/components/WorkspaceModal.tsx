"use client";

import type { Dispatch, SetStateAction } from "react";
import { Icon } from "@/components/icons";
import type { Workspace } from "@/lib/mappers/types";

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

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#191c1d]/40 px-3 py-4 sm:items-center sm:justify-center">
      <div className="max-h-[86vh] w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-[#bec9be]">
        <div className="flex items-center justify-between border-b border-[#bec9be] px-5 py-4">
          <div>
            <p className="text-sm font-bold text-[#004d27]">Workspace</p>
            <h2 className="text-xl font-bold text-[#191c1d]">Kelola workspace</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#3f4940] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef]"
            aria-label="Tutup"
            title="Tutup"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[62vh] space-y-5 overflow-auto p-5">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#3f4940]">
              Pilih workspace aktif
            </h3>
            <div className="space-y-2">
              {options.map((option) => {
                const isActive = option.id === selectedWorkspaceId;

                return (
                  <button
                    key={option.id || "general"}
                    type="button"
                    onClick={() => {
                      setSelectedWorkspaceId(option.id);
                      onClose();
                    }}
                    className={
                      isActive
                        ? "flex w-full items-center justify-between gap-3 rounded-2xl bg-[#004d27]/10 px-4 py-3 text-left ring-1 ring-[#004d27]/30"
                        : "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-[#bec9be] transition hover:bg-[#f3f4f5]"
                    }
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon
                        name="book"
                        className="h-5 w-5 shrink-0 text-[#004d27]"
                      />
                      <span className="truncate font-bold text-[#191c1d]">
                        {option.name}
                      </span>
                    </span>
                    {isActive && (
                      <span className="shrink-0 rounded-full bg-[#004d27]/10 px-2 py-1 text-xs font-bold text-[#004d27]">
                        Aktif
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#3f4940]">
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
                className="min-w-0 flex-1 rounded-2xl border border-[#bec9be] bg-white px-4 py-3 text-sm font-semibold text-[#191c1d] outline-none transition focus:border-[#004d27]"
              />
              <button
                type="submit"
                disabled={!newWorkspaceName.trim() || isCreatingWorkspace}
                className="shrink-0 rounded-2xl bg-[#004d27] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#006837] disabled:cursor-not-allowed disabled:bg-[#004d27]/40"
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
