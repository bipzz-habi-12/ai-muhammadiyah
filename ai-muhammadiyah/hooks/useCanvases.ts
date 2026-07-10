"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCanvasRequest,
  deleteCanvasRequest,
  fetchCanvases,
  generateCanvasFromChat,
  updateCanvasRequest,
  type Canvas,
  type CanvasEdge,
  type CanvasNode,
} from "@/lib/canvas";
import { MAX_NODES } from "@/lib/canvas";

const autosaveDelayMs = 800;

type CanvasPatch = { title?: string; nodes?: CanvasNode[]; edges?: CanvasEdge[] };

export function useCanvases(workspaceId: string | undefined) {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastTruncated, setLastTruncated] = useState(false);

  const pendingPatchRef = useRef<CanvasPatch | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCanvas = useMemo(
    () => canvases.find((canvas) => canvas.id === selectedCanvasId),
    [canvases, selectedCanvasId],
  );

  const loadCanvases = useCallback(async () => {
    if (!workspaceId) {
      setCanvases([]);
      setSelectedCanvasId(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const loaded = await fetchCanvases(workspaceId);
      setCanvases(loaded);
      setSelectedCanvasId((current) =>
        current && loaded.some((canvas) => canvas.id === current) ? current : null,
      );
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Canvas belum bisa dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCanvases();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCanvases]);

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const patch = pendingPatchRef.current;
    const canvasId = selectedCanvasId;

    if (!patch || !canvasId) {
      return;
    }

    pendingPatchRef.current = null;
    setIsSaving(true);

    try {
      const updated = await updateCanvasRequest(canvasId, patch);
      setCanvases((current) =>
        current.map((canvas) => (canvas.id === canvasId ? updated : canvas)),
      );
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Canvas belum bisa disimpan.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [selectedCanvasId]);

  const selectCanvas = useCallback(
    (id: string) => {
      void flushPendingSave();
      setSelectedCanvasId(id);
    },
    [flushPendingSave],
  );

  const closeCanvas = useCallback(() => {
    void flushPendingSave();
    setSelectedCanvasId(null);
  }, [flushPendingSave]);

  const createBlankCanvas = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    setError("");

    try {
      const canvas = await createCanvasRequest({
        workspaceId,
        title: "Untitled",
        nodes: [],
        edges: [],
      });
      setCanvases((current) => [canvas, ...current]);
      setSelectedCanvasId(canvas.id);
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Canvas belum bisa dibuat.",
      );
    }
  }, [workspaceId]);

  const updateCanvasLocal = useCallback(
    (patch: CanvasPatch) => {
      if (!selectedCanvasId) {
        return;
      }

      setCanvases((current) =>
        current.map((canvas) =>
          canvas.id === selectedCanvasId ? { ...canvas, ...patch } : canvas,
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
    [selectedCanvasId, flushPendingSave],
  );

  const updateGraph = useCallback(
    (nodes: CanvasNode[], edges: CanvasEdge[]) => {
      updateCanvasLocal({ nodes, edges });
    },
    [updateCanvasLocal],
  );

  const addNode = useCallback(() => {
    if (!selectedCanvas || selectedCanvas.nodes.length >= MAX_NODES) {
      return;
    }

    const newNode: CanvasNode = {
      id: crypto.randomUUID(),
      position: { x: 100, y: 100 },
      label: "Node baru",
    };
    updateCanvasLocal({ nodes: [...selectedCanvas.nodes, newNode] });
  }, [selectedCanvas, updateCanvasLocal]);

  const deleteCanvas = useCallback(async (id: string) => {
    setError("");

    try {
      await deleteCanvasRequest(id);
      setCanvases((current) => current.filter((canvas) => canvas.id !== id));
      setSelectedCanvasId((current) => (current === id ? null : current));
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Canvas belum bisa dihapus.",
      );
    }
  }, []);

  const generateFromChat = useCallback(
    async (conversationId: string) => {
      if (!workspaceId) {
        return;
      }

      setIsGenerating(true);
      setError("");

      try {
        const { canvas, truncated } = await generateCanvasFromChat({
          workspaceId,
          conversationId,
        });
        setCanvases((current) => [canvas, ...current]);
        setSelectedCanvasId(canvas.id);
        setLastTruncated(truncated);
      } catch (generateError) {
        console.error(generateError);
        setError(
          generateError instanceof Error
            ? generateError.message
            : "Canvas belum bisa digenerate.",
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [workspaceId],
  );

  const clearLastTruncated = useCallback(() => setLastTruncated(false), []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    canvases,
    selectedCanvasId,
    selectedCanvas,
    isLoading,
    isSaving,
    isGenerating,
    error,
    lastTruncated,
    clearLastTruncated,
    loadCanvases,
    selectCanvas,
    closeCanvas,
    createBlankCanvas,
    updateCanvasLocal,
    updateGraph,
    addNode,
    deleteCanvas,
    generateFromChat,
  };
}
