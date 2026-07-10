"use client";

import SheetGrid from "@/components/SheetGrid";
import SheetsList from "@/components/SheetsList";
import { Icon } from "@/components/icons";
import { useSheets } from "@/hooks/useSheets";

interface SheetsPanelProps {
  workspaceId: string | undefined;
  activeConversationId: string | null;
  activeConversationTitle: string | undefined;
  onOpenWorkspaceModal: () => void;
}

export default function SheetsPanel({
  workspaceId,
  activeConversationId,
  activeConversationTitle,
  onOpenWorkspaceModal,
}: SheetsPanelProps) {
  const {
    sheets,
    selectedSheetId,
    selectedSheet,
    isLoading,
    isSaving,
    isGenerating,
    error,
    lastTruncated,
    clearLastTruncated,
    selectSheet,
    closeSheet,
    createBlankSheet,
    updateSheetLocal,
    deleteSheet,
    generateFromChat,
    updateCell,
    updateColumnLabel,
    addRow,
    addColumn,
    deleteRow,
    deleteColumn,
  } = useSheets(workspaceId);

  // sheets.workspace_id is a NOT NULL foreign key to a real chat_workspaces
  // row — "General" (unselected) has no such row, same gap fixed for Docs/Tasks.
  if (!workspaceId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Icon name="sheets" className="h-8 w-8 text-[#bec9be]" />
        <p className="max-w-sm text-sm leading-relaxed text-[#6f7a70]">
          Sheets disimpan per-workspace. Pilih atau buat workspace dulu
          sebelum membuat sheet di sini.
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
      <div className={selectedSheetId ? "hidden md:flex" : "flex"}>
        <SheetsList
          sheets={sheets}
          selectedSheetId={selectedSheetId}
          isLoading={isLoading}
          onSelect={selectSheet}
          onCreate={() => void createBlankSheet()}
        />
      </div>

      <div
        className={
          selectedSheetId
            ? "flex min-w-0 flex-1 flex-col"
            : "hidden min-w-0 flex-1 flex-col md:flex"
        }
      >
        {error && (
          <p className="mx-4 mt-4 rounded-2xl bg-[#ffdad6] p-3 text-sm font-semibold text-[#93000a]">
            {error}
          </p>
        )}

        <SheetGrid
          sheet={selectedSheet}
          isSaving={isSaving}
          isGenerating={isGenerating}
          canGenerate={Boolean(activeConversationId)}
          activeConversationTitle={activeConversationTitle}
          lastTruncated={lastTruncated}
          onClearTruncated={clearLastTruncated}
          onTitleChange={(title) => updateSheetLocal({ title })}
          onCellChange={updateCell}
          onColumnLabelChange={updateColumnLabel}
          onAddRow={addRow}
          onAddColumn={addColumn}
          onDeleteRow={deleteRow}
          onDeleteColumn={deleteColumn}
          onDelete={(id) => void deleteSheet(id)}
          onGenerate={() => {
            if (activeConversationId) {
              void generateFromChat(activeConversationId);
            }
          }}
          onClose={closeSheet}
        />
      </div>
    </div>
  );
}
