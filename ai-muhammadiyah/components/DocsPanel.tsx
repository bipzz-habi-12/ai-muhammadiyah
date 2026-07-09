"use client";

import DocEditor from "@/components/DocEditor";
import DocsList from "@/components/DocsList";
import { Icon } from "@/components/icons";
import { useDocs } from "@/hooks/useDocs";

interface DocsPanelProps {
  workspaceId: string | undefined;
  activeConversationId: string | null;
  activeConversationTitle: string | undefined;
  onOpenWorkspaceModal: () => void;
}

export default function DocsPanel({
  workspaceId,
  activeConversationId,
  activeConversationTitle,
  onOpenWorkspaceModal,
}: DocsPanelProps) {
  const {
    docs,
    selectedDocId,
    selectedDoc,
    isLoading,
    isSaving,
    isGenerating,
    error,
    selectDoc,
    closeDoc,
    createBlankDoc,
    updateDocLocal,
    deleteDoc,
    generateFromChat,
  } = useDocs(workspaceId);

  // docs.workspace_id is a NOT NULL foreign key to a real chat_workspaces row.
  // "General" (the default, unselected state) is a UI-only sentinel — there is
  // no real workspace row behind it — so a doc genuinely cannot be created
  // until the user picks or creates a real workspace. Show that clearly
  // instead of letting "Dokumen baru"/"Generate dari chat" silently no-op.
  if (!workspaceId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Icon name="book" className="h-8 w-8 text-[#bec9be]" />
        <p className="max-w-sm text-sm leading-relaxed text-[#6f7a70]">
          Dokumen disimpan per-workspace. Pilih atau buat workspace dulu
          sebelum membuat dokumen di sini.
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
      <div className={selectedDocId ? "hidden md:flex" : "flex"}>
        <DocsList
          docs={docs}
          selectedDocId={selectedDocId}
          isLoading={isLoading}
          onSelect={selectDoc}
          onCreate={() => void createBlankDoc()}
        />
      </div>

      <div
        className={
          selectedDocId
            ? "flex flex-1 flex-col"
            : "hidden flex-1 flex-col md:flex"
        }
      >
        {error && (
          <p className="mx-4 mt-4 rounded-2xl bg-[#ffdad6] p-3 text-sm font-semibold text-[#93000a]">
            {error}
          </p>
        )}

        <DocEditor
          doc={selectedDoc}
          isSaving={isSaving}
          isGenerating={isGenerating}
          canGenerate={Boolean(activeConversationId)}
          activeConversationTitle={activeConversationTitle}
          onChange={updateDocLocal}
          onDelete={(id) => void deleteDoc(id)}
          onGenerate={() => {
            if (activeConversationId) {
              void generateFromChat(activeConversationId);
            }
          }}
          onClose={closeDoc}
        />
      </div>
    </div>
  );
}
