"use client";

import DocEditor from "@/components/DocEditor";
import DocsList from "@/components/DocsList";
import { useDocs } from "@/hooks/useDocs";

interface DocsPanelProps {
  workspaceId: string | undefined;
  activeConversationId: string | null;
  activeConversationTitle: string | undefined;
}

export default function DocsPanel({
  workspaceId,
  activeConversationId,
  activeConversationTitle,
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
