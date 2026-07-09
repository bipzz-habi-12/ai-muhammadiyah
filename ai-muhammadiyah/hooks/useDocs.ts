"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDocRequest,
  deleteDocRequest,
  fetchDocs,
  generateDocFromChat,
  updateDocRequest,
  type Doc,
} from "@/lib/docs";

const autosaveDelayMs = 800;

export function useDocs(workspaceId: string | undefined) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const pendingPatchRef = useRef<{ title?: string; content?: string } | null>(
    null,
  );
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedDoc = useMemo(
    () => docs.find((doc) => doc.id === selectedDocId),
    [docs, selectedDocId],
  );

  const loadDocs = useCallback(async () => {
    if (!workspaceId) {
      setDocs([]);
      setSelectedDocId(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const loaded = await fetchDocs(workspaceId);
      setDocs(loaded);
      setSelectedDocId((current) =>
        current && loaded.some((doc) => doc.id === current) ? current : null,
      );
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Dokumen belum bisa dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDocs]);

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const patch = pendingPatchRef.current;
    const docId = selectedDocId;

    if (!patch || !docId) {
      return;
    }

    pendingPatchRef.current = null;
    setIsSaving(true);

    try {
      const updated = await updateDocRequest(docId, patch);
      setDocs((current) =>
        current.map((doc) => (doc.id === docId ? updated : doc)),
      );
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Dokumen belum bisa disimpan.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [selectedDocId]);

  const selectDoc = useCallback(
    (id: string) => {
      void flushPendingSave();
      setSelectedDocId(id);
    },
    [flushPendingSave],
  );

  const closeDoc = useCallback(() => {
    void flushPendingSave();
    setSelectedDocId(null);
  }, [flushPendingSave]);

  const createBlankDoc = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    setError("");

    try {
      const doc = await createDocRequest({ workspaceId, title: "Untitled" });
      setDocs((current) => [doc, ...current]);
      setSelectedDocId(doc.id);
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Dokumen belum bisa dibuat.",
      );
    }
  }, [workspaceId]);

  const updateDocLocal = useCallback(
    (patch: { title?: string; content?: string }) => {
      if (!selectedDocId) {
        return;
      }

      setDocs((current) =>
        current.map((doc) =>
          doc.id === selectedDocId ? { ...doc, ...patch } : doc,
        ),
      );
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        void flushPendingSave();
      }, autosaveDelayMs);
    },
    [selectedDocId, flushPendingSave],
  );

  const deleteDoc = useCallback(
    async (id: string) => {
      setError("");

      try {
        await deleteDocRequest(id);
        setDocs((current) => current.filter((doc) => doc.id !== id));
        setSelectedDocId((current) => (current === id ? null : current));
      } catch (deleteError) {
        console.error(deleteError);
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Dokumen belum bisa dihapus.",
        );
      }
    },
    [],
  );

  const generateFromChat = useCallback(
    async (conversationId: string) => {
      if (!workspaceId) {
        return;
      }

      setIsGenerating(true);
      setError("");

      try {
        const doc = await generateDocFromChat({ workspaceId, conversationId });
        setDocs((current) => [doc, ...current]);
        setSelectedDocId(doc.id);
      } catch (generateError) {
        console.error(generateError);
        setError(
          generateError instanceof Error
            ? generateError.message
            : "Dokumen belum bisa digenerate.",
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    docs,
    selectedDocId,
    selectedDoc,
    isLoading,
    isSaving,
    isGenerating,
    error,
    loadDocs,
    selectDoc,
    closeDoc,
    createBlankDoc,
    updateDocLocal,
    deleteDoc,
    generateFromChat,
  };
}
