"use client";

import { useState } from "react";
import TaskRow from "@/components/TaskRow";
import { Icon, SparkIcon } from "@/components/icons";
import { useTasks } from "@/hooks/useTasks";

interface TasksPanelProps {
  workspaceId: string | undefined;
  activeConversationId: string | null;
  activeConversationTitle: string | undefined;
  onOpenWorkspaceModal: () => void;
}

export default function TasksPanel({
  workspaceId,
  activeConversationId,
  activeConversationTitle,
  onOpenWorkspaceModal,
}: TasksPanelProps) {
  const {
    items,
    isLoading,
    isGenerating,
    savingItemIds,
    error,
    lastSkipped,
    clearLastSkipped,
    createTask,
    updateTaskStatus,
    updateTaskDetails,
    deleteTask,
    generateFromChat,
  } = useTasks(workspaceId);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // tasks.workspace_id is a NOT NULL foreign key to a real chat_workspaces
  // row — "General" (unselected) has no such row, same gap fixed for Docs.
  if (!workspaceId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Icon name="tasks" className="h-8 w-8 text-[#bec9be]" />
        <p className="max-w-sm text-sm leading-relaxed text-[#6f7a70]">
          Tasks disimpan per-workspace. Pilih atau buat workspace dulu sebelum
          membuat task di sini.
        </p>
        <button
          type="button"
          onClick={onOpenWorkspaceModal}
          className="rounded-lg bg-[#004d27] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#006837]"
        >
          Pilih workspace
        </button>
      </div>
    );
  }

  const canGenerate = Boolean(activeConversationId);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (newTaskTitle.trim()) {
                void createTask(newTaskTitle);
                setNewTaskTitle("");
              }
            }}
            className="flex min-w-[220px] flex-1 items-center gap-2"
          >
            <input
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="Tambah task baru..."
              className="min-w-0 flex-1 rounded-lg border border-[#bec9be] bg-white px-3 py-2 text-sm text-[#191c1d] outline-none transition focus:border-[#004d27]"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="shrink-0 rounded-lg bg-[#004d27] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#006837] disabled:cursor-not-allowed disabled:bg-[#004d27]/40"
            >
              Tambah
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              if (activeConversationId) {
                void generateFromChat(activeConversationId);
              }
            }}
            disabled={!canGenerate || isGenerating}
            title={
              canGenerate
                ? activeConversationTitle
                  ? `Generate dari "${activeConversationTitle}"`
                  : "Generate dari chat ini"
                : "Buka percakapan dulu untuk generate"
            }
            className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SparkIcon className="h-4 w-4" />
            {isGenerating ? "Menggenerate..." : "Generate dari chat"}
          </button>
        </div>

        {lastSkipped !== null && lastSkipped > 0 && (
          <p className="flex items-center justify-between gap-3 rounded-2xl bg-[#fdc003]/20 p-3 text-sm font-semibold text-[#6c5000]">
            <span>{lastSkipped} item dilewati, kuota harian habis.</span>
            <button
              type="button"
              onClick={clearLastSkipped}
              className="shrink-0 text-xs font-bold underline"
            >
              Tutup
            </button>
          </p>
        )}

        {error && (
          <p className="rounded-2xl bg-[#ffdad6] p-3 text-sm font-semibold text-[#93000a]">
            {error}
          </p>
        )}

        {isLoading && (
          <p className="text-sm font-semibold text-[#6f7a70]">
            Memuat tasks...
          </p>
        )}

        {!isLoading && items.length === 0 && (
          <p className="text-sm leading-relaxed text-[#6f7a70]">
            Belum ada task di workspace ini.
          </p>
        )}

        <div className="space-y-1">
          {items.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              isSaving={savingItemIds.includes(item.id)}
              onStatusChange={(status) => updateTaskStatus(item.id, status)}
              onDetailsChange={(patch) => updateTaskDetails(item.id, patch)}
              onDelete={() => deleteTask(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
