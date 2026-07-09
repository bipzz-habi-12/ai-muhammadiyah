"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTaskListRequest,
  fetchTaskLists,
  generateTasksFromChat,
  updateTaskListRequest,
  type TaskItem,
  type TaskList,
  type TaskStatus,
} from "@/lib/tasks";

const autosaveDelayMs = 800;

// v1 hides the "multiple task lists per workspace" concept the schema allows
// (see lib/tasks.ts) — always operate on a single active list per workspace,
// creating one lazily on first use.
export function useTasks(workspaceId: string | undefined) {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingItemIds, setSavingItemIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [lastSkipped, setLastSkipped] = useState<number | null>(null);

  const pendingEditsRef = useRef<
    Map<string, Partial<Pick<TaskItem, "title" | "description">>>
  >(new Map());
  const saveTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const activeList = lists[0];
  const items = useMemo(() => activeList?.items ?? [], [activeList]);

  const loadLists = useCallback(async () => {
    if (!workspaceId) {
      setLists([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const loaded = await fetchTaskLists(workspaceId);
      setLists(loaded);
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Tasks belum bisa dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLists();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadLists]);

  const persistItems = useCallback(
    async (nextItems: TaskItem[]) => {
      if (!activeList) {
        return;
      }

      try {
        const updated = await updateTaskListRequest(activeList.id, {
          items: nextItems,
        });
        setLists((current) =>
          current.map((list) => (list.id === updated.id ? updated : list)),
        );
      } catch (saveError) {
        console.error(saveError);
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Task belum bisa disimpan.",
        );
      }
    },
    [activeList],
  );

  const createTask = useCallback(
    async (title: string) => {
      if (!workspaceId || !title.trim()) {
        return;
      }

      setError("");

      const newItem: TaskItem = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: "",
        status: "todo",
      };

      try {
        if (!activeList) {
          const list = await createTaskListRequest({
            workspaceId,
            title: "To-do",
            items: [newItem],
          });
          setLists((current) => [list, ...current]);
          return;
        }

        const updated = await updateTaskListRequest(activeList.id, {
          items: [...activeList.items, newItem],
        });
        setLists((current) =>
          current.map((list) => (list.id === updated.id ? updated : list)),
        );
      } catch (createError) {
        console.error(createError);
        setError(
          createError instanceof Error
            ? createError.message
            : "Task belum bisa dibuat.",
        );
      }
    },
    [workspaceId, activeList],
  );

  const updateTaskStatus = useCallback(
    (itemId: string, status: TaskStatus) => {
      if (!activeList) {
        return;
      }

      const nextItems = activeList.items.map((item) =>
        item.id === itemId ? { ...item, status } : item,
      );

      // Optimistic local update — status changes are discrete, not keystrokes,
      // so no debounce (unlike title/description edits below).
      setLists((current) =>
        current.map((list) =>
          list.id === activeList.id ? { ...list, items: nextItems } : list,
        ),
      );
      void persistItems(nextItems);
    },
    [activeList, persistItems],
  );

  const flushItemSave = useCallback(
    (itemId: string) => {
      const timeoutId = saveTimeoutsRef.current.get(itemId);

      if (timeoutId) {
        clearTimeout(timeoutId);
        saveTimeoutsRef.current.delete(itemId);
      }

      const patch = pendingEditsRef.current.get(itemId);

      if (!patch || !activeList) {
        return;
      }

      pendingEditsRef.current.delete(itemId);

      const nextItems = activeList.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      );

      setSavingItemIds((current) => [...current, itemId]);
      void persistItems(nextItems).finally(() => {
        setSavingItemIds((current) => current.filter((id) => id !== itemId));
      });
    },
    [activeList, persistItems],
  );

  const updateTaskDetails = useCallback(
    (itemId: string, patch: { title?: string; description?: string }) => {
      if (!activeList) {
        return;
      }

      const nextItems = activeList.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      );
      setLists((current) =>
        current.map((list) =>
          list.id === activeList.id ? { ...list, items: nextItems } : list,
        ),
      );

      pendingEditsRef.current.set(itemId, {
        ...pendingEditsRef.current.get(itemId),
        ...patch,
      });

      const existingTimeout = saveTimeoutsRef.current.get(itemId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      saveTimeoutsRef.current.set(
        itemId,
        setTimeout(() => flushItemSave(itemId), autosaveDelayMs),
      );
    },
    [activeList, flushItemSave],
  );

  const deleteTask = useCallback(
    (itemId: string) => {
      if (!activeList) {
        return;
      }

      const nextItems = activeList.items.filter((item) => item.id !== itemId);
      setLists((current) =>
        current.map((list) =>
          list.id === activeList.id ? { ...list, items: nextItems } : list,
        ),
      );
      void persistItems(nextItems);
    },
    [activeList, persistItems],
  );

  const generateFromChat = useCallback(
    async (conversationId: string) => {
      if (!workspaceId) {
        return;
      }

      setIsGenerating(true);
      setError("");
      setLastSkipped(null);

      try {
        const { list, createdCount, skipped } = await generateTasksFromChat({
          workspaceId,
          conversationId,
        });

        if (list) {
          setLists((current) => {
            const exists = current.some((item) => item.id === list.id);
            return exists
              ? current.map((item) => (item.id === list.id ? list : item))
              : [list, ...current];
          });
        }

        setLastSkipped(skipped);

        if (createdCount === 0 && skipped === 0) {
          setError("Tidak ada action item yang ditemukan di percakapan ini.");
        }
      } catch (generateError) {
        console.error(generateError);
        setError(
          generateError instanceof Error
            ? generateError.message
            : "Tasks belum bisa digenerate.",
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    const timeouts = saveTimeoutsRef.current;

    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  return {
    items,
    isLoading,
    isGenerating,
    savingItemIds,
    error,
    lastSkipped,
    clearLastSkipped: () => setLastSkipped(null),
    loadLists,
    createTask,
    updateTaskStatus,
    updateTaskDetails,
    deleteTask,
    generateFromChat,
  };
}
