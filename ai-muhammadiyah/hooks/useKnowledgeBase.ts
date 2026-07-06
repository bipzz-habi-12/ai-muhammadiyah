"use client";

import { useCallback, useRef, useState } from "react";
import { fetchKnowledgeSources, type KnowledgeSource } from "@/lib/knowledge";

const maxDocumentUploadBytes = 25 * 1024 * 1024;

export function useKnowledgeBase() {
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [isKnowledgeAdmin, setIsKnowledgeAdmin] = useState(false);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false);
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState("kemuhammadiyahan");
  const [knowledgeMessage, setKnowledgeMessage] = useState("");
  const [knowledgeError, setKnowledgeError] = useState("");
  const hasLoadedKnowledgeRef = useRef(false);

  const loadKnowledge = useCallback(async () => {
    try {
      setIsLoadingKnowledge(true);
      setKnowledgeError("");
      const data = await fetchKnowledgeSources();
      setKnowledgeSources(data.sources);
      setIsKnowledgeAdmin(data.isAdmin);
      hasLoadedKnowledgeRef.current = true;
    } catch (error) {
      console.error(error);
      setKnowledgeError(
        error instanceof Error
          ? error.message
          : "Knowledge base belum bisa dimuat.",
      );
    } finally {
      setIsLoadingKnowledge(false);
    }
  }, []);

  async function handleKnowledgeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || isUploadingKnowledge) return;

    setKnowledgeMessage("");
    setKnowledgeError("");

    if (!isKnowledgeAdmin) {
      setKnowledgeError("Hanya admin yang bisa upload knowledge source.");
      event.target.value = "";
      return;
    }

    const fileName = file.name.toLowerCase();
    const isSupportedDocument =
      file.type === "application/pdf" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".pptx") ||
      fileName.endsWith(".xlsx");

    if (!isSupportedDocument) {
      setKnowledgeError("Format knowledge source harus PDF, DOCX, PPTX, atau XLSX.");
      event.target.value = "";
      return;
    }

    if (file.size > maxDocumentUploadBytes) {
      setKnowledgeError("Ukuran dokumen terlalu besar. Maksimal 25 MB.");
      event.target.value = "";
      return;
    }

    setIsUploadingKnowledge(true);

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("title", knowledgeTitle.trim() || file.name);
      formData.append("category", knowledgeCategory.trim() || "general");

      const response = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        chunkCount?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Knowledge source belum bisa diupload.");
      }

      setKnowledgeMessage(
        `Knowledge source tersimpan dengan ${data.chunkCount ?? 0} chunk.`,
      );
      setKnowledgeTitle("");
      await loadKnowledge();
    } catch (error) {
      console.error(error);
      setKnowledgeError(
        error instanceof Error
          ? error.message
          : "Knowledge source belum bisa diupload.",
      );
    } finally {
      setIsUploadingKnowledge(false);
      event.target.value = "";
    }
  }

  return {
    knowledgeSources,
    isKnowledgeAdmin,
    isLoadingKnowledge,
    isUploadingKnowledge,
    knowledgeTitle,
    setKnowledgeTitle,
    knowledgeCategory,
    setKnowledgeCategory,
    knowledgeMessage,
    setKnowledgeMessage,
    knowledgeError,
    setKnowledgeError,
    hasLoadedKnowledgeRef,
    loadKnowledge,
    handleKnowledgeUpload,
  };
}
