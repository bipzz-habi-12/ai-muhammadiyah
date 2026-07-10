"use client";

import dynamic from "next/dynamic";
import CanvasList from "@/components/CanvasList";
import { Icon } from "@/components/icons";
import { useCanvases } from "@/hooks/useCanvases";

// react-flow reads window/DOM measurement APIs that don't exist server-side
// and will error/blank-render if part of the initial SSR pass.
const CanvasBoard = dynamic(() => import("@/components/CanvasBoard"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center text-sm text-[#6f7a70]">
      Memuat board...
    </div>
  ),
});

interface CanvasPanelProps {
  workspaceId: string | undefined;
  activeConversationId: string | null;
  activeConversationTitle: string | undefined;
  onOpenWorkspaceModal: () => void;
}

export default function CanvasPanel({
  workspaceId,
  activeConversationId,
  activeConversationTitle,
  onOpenWorkspaceModal,
}: CanvasPanelProps) {
  const {
    canvases,
    selectedCanvasId,
    selectedCanvas,
    isLoading,
    isSaving,
    isGenerating,
    error,
    lastTruncated,
    clearLastTruncated,
    selectCanvas,
    closeCanvas,
    createBlankCanvas,
    updateCanvasLocal,
    updateGraph,
    addNode,
    deleteCanvas,
    generateFromChat,
  } = useCanvases(workspaceId);

  // canvases.workspace_id is a NOT NULL foreign key to a real chat_workspaces
  // row — "General" (unselected) has no such row, same gap fixed for
  // Docs/Tasks/Sheets.
  if (!workspaceId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Icon name="canvas" className="h-8 w-8 text-[#bec9be]" />
        <p className="max-w-sm text-sm leading-relaxed text-[#6f7a70]">
          Canvas disimpan per-workspace. Pilih atau buat workspace dulu
          sebelum membuat canvas di sini.
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

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={selectedCanvasId ? "hidden md:flex" : "flex"}>
        <CanvasList
          canvases={canvases}
          selectedCanvasId={selectedCanvasId}
          isLoading={isLoading}
          onSelect={selectCanvas}
          onCreate={() => void createBlankCanvas()}
        />
      </div>

      <div
        className={
          selectedCanvasId
            ? "flex min-w-0 flex-1 flex-col"
            : "hidden min-w-0 flex-1 flex-col md:flex"
        }
      >
        {error && (
          <p className="mx-4 mt-4 rounded-2xl bg-[#ffdad6] p-3 text-sm font-semibold text-[#93000a]">
            {error}
          </p>
        )}

        <CanvasBoard
          canvas={selectedCanvas}
          isSaving={isSaving}
          isGenerating={isGenerating}
          canGenerate={Boolean(activeConversationId)}
          activeConversationTitle={activeConversationTitle}
          lastTruncated={lastTruncated}
          onClearTruncated={clearLastTruncated}
          onTitleChange={(title) => updateCanvasLocal({ title })}
          onGraphChange={updateGraph}
          onAddNode={addNode}
          onDelete={(id) => void deleteCanvas(id)}
          onGenerate={() => {
            if (activeConversationId) {
              void generateFromChat(activeConversationId);
            }
          }}
          onClose={closeCanvas}
        />
      </div>
    </div>
  );
}
