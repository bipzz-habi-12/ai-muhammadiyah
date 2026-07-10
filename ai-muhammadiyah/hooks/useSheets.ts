"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSheetRequest,
  deleteSheetRequest,
  fetchSheets,
  generateSheetFromChat,
  updateSheetRequest,
  type Sheet,
} from "@/lib/sheets";
import { indexToColumnLetter, MAX_COLUMNS, MAX_ROWS } from "@/lib/sheets/formula";

const autosaveDelayMs = 800;

type SheetPatch = { title?: string; columns?: string[]; rows?: string[][] };

function emptyGrid(rowCount: number, colCount: number): string[][] {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => ""),
  );
}

function defaultColumns(count: number): string[] {
  return Array.from({ length: count }, (_, index) => indexToColumnLetter(index));
}

export function useSheets(workspaceId: string | undefined) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastTruncated, setLastTruncated] = useState(false);

  const pendingPatchRef = useRef<SheetPatch | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.id === selectedSheetId),
    [sheets, selectedSheetId],
  );

  const loadSheets = useCallback(async () => {
    if (!workspaceId) {
      setSheets([]);
      setSelectedSheetId(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const loaded = await fetchSheets(workspaceId);
      setSheets(loaded);
      setSelectedSheetId((current) =>
        current && loaded.some((sheet) => sheet.id === current) ? current : null,
      );
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Sheets belum bisa dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSheets();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSheets]);

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const patch = pendingPatchRef.current;
    const sheetId = selectedSheetId;

    if (!patch || !sheetId) {
      return;
    }

    pendingPatchRef.current = null;
    setIsSaving(true);

    try {
      const updated = await updateSheetRequest(sheetId, patch);
      setSheets((current) =>
        current.map((sheet) => (sheet.id === sheetId ? updated : sheet)),
      );
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Sheet belum bisa disimpan.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [selectedSheetId]);

  const selectSheet = useCallback(
    (id: string) => {
      void flushPendingSave();
      setSelectedSheetId(id);
    },
    [flushPendingSave],
  );

  const closeSheet = useCallback(() => {
    void flushPendingSave();
    setSelectedSheetId(null);
  }, [flushPendingSave]);

  const createBlankSheet = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    setError("");

    try {
      const columns = defaultColumns(6);
      const rows = emptyGrid(10, 6);
      const sheet = await createSheetRequest({
        workspaceId,
        title: "Untitled",
        columns,
        rows,
      });
      setSheets((current) => [sheet, ...current]);
      setSelectedSheetId(sheet.id);
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Sheet belum bisa dibuat.",
      );
    }
  }, [workspaceId]);

  const updateSheetLocal = useCallback(
    (patch: SheetPatch) => {
      if (!selectedSheetId) {
        return;
      }

      setSheets((current) =>
        current.map((sheet) =>
          sheet.id === selectedSheetId ? { ...sheet, ...patch } : sheet,
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
    [selectedSheetId, flushPendingSave],
  );

  const deleteSheet = useCallback(async (id: string) => {
    setError("");

    try {
      await deleteSheetRequest(id);
      setSheets((current) => current.filter((sheet) => sheet.id !== id));
      setSelectedSheetId((current) => (current === id ? null : current));
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Sheet belum bisa dihapus.",
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
        const { sheet, truncated } = await generateSheetFromChat({
          workspaceId,
          conversationId,
        });
        setSheets((current) => [sheet, ...current]);
        setSelectedSheetId(sheet.id);
        setLastTruncated(truncated);
      } catch (generateError) {
        console.error(generateError);
        setError(
          generateError instanceof Error
            ? generateError.message
            : "Sheet belum bisa digenerate.",
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [workspaceId],
  );

  const clearLastTruncated = useCallback(() => setLastTruncated(false), []);

  const updateCell = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      if (!selectedSheet) {
        return;
      }

      const rows = selectedSheet.rows.map((row, r) =>
        r === rowIndex
          ? row.map((cell, c) => (c === colIndex ? value : cell))
          : row,
      );
      updateSheetLocal({ rows });
    },
    [selectedSheet, updateSheetLocal],
  );

  const updateColumnLabel = useCallback(
    (colIndex: number, value: string) => {
      if (!selectedSheet) {
        return;
      }

      const columns = selectedSheet.columns.map((label, index) =>
        index === colIndex ? value : label,
      );
      updateSheetLocal({ columns });
    },
    [selectedSheet, updateSheetLocal],
  );

  const addRow = useCallback(() => {
    if (!selectedSheet || selectedSheet.rows.length >= MAX_ROWS) {
      return;
    }

    const newRow = Array.from({ length: selectedSheet.columns.length }, () => "");
    updateSheetLocal({ rows: [...selectedSheet.rows, newRow] });
  }, [selectedSheet, updateSheetLocal]);

  const addColumn = useCallback(() => {
    if (!selectedSheet || selectedSheet.columns.length >= MAX_COLUMNS) {
      return;
    }

    const columns = [
      ...selectedSheet.columns,
      indexToColumnLetter(selectedSheet.columns.length),
    ];
    const rows = selectedSheet.rows.map((row) => [...row, ""]);
    updateSheetLocal({ columns, rows });
  }, [selectedSheet, updateSheetLocal]);

  const deleteRow = useCallback(
    (rowIndex: number) => {
      if (!selectedSheet) {
        return;
      }

      updateSheetLocal({
        rows: selectedSheet.rows.filter((_, index) => index !== rowIndex),
      });
    },
    [selectedSheet, updateSheetLocal],
  );

  const deleteColumn = useCallback(
    (colIndex: number) => {
      if (!selectedSheet) {
        return;
      }

      updateSheetLocal({
        columns: selectedSheet.columns.filter((_, index) => index !== colIndex),
        rows: selectedSheet.rows.map((row) =>
          row.filter((_, index) => index !== colIndex),
        ),
      });
    },
    [selectedSheet, updateSheetLocal],
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    sheets,
    selectedSheetId,
    selectedSheet,
    isLoading,
    isSaving,
    isGenerating,
    error,
    lastTruncated,
    clearLastTruncated,
    loadSheets,
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
  };
}
