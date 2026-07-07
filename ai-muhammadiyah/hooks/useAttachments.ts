"use client";

import { useEffect, useRef, useState } from "react";
import {
  extractDocumentFromLocalUpload,
  getAttachmentKind,
  getAttachmentStatus,
  getLoadedDocumentText,
  getUploadedDocumentType,
  isSupportedUpload,
  sanitizeRecentAttachment,
} from "@/lib/chat/attachments";
import type {
  DocumentMetadata,
  DocumentStatus,
  UploadedAttachment,
} from "@/lib/mappers/types";
import type { UsageSnapshot } from "@/lib/usage/limits";

const maxDocumentUploadBytes = 25 * 1024 * 1024;
const maxRecentFiles = 6;

export function useAttachments(
  userId: string,
  hasUploadQuota: boolean,
  loadUsage: () => Promise<UsageSnapshot | null>,
) {
  const [uploadedAttachments, setUploadedAttachments] = useState<
    UploadedAttachment[]
  >([]);
  const [recentAttachments, setRecentAttachments] = useState<
    UploadedAttachment[]
  >([]);
  const [documentText, setDocumentText] = useState("");
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>("idle");
  const [documentError, setDocumentError] = useState("");
  const [composerNotice, setComposerNotice] = useState("");
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const documentTextRef = useRef("");
  const uploadKeysInFlightRef = useRef(new Set<string>());
  const uploadFilesByAttachmentIdRef = useRef(new Map<string, File>());

  useEffect(() => {
    if (!userId) {
      return;
    }

    const storedRecentFiles = window.localStorage.getItem(
      `ai-mu-recent-files-${userId}`,
    );

    if (!storedRecentFiles) {
      return;
    }

    try {
      const parsedFiles = JSON.parse(storedRecentFiles) as UploadedAttachment[];
      window.queueMicrotask(() => {
        setRecentAttachments(
          parsedFiles.filter(
            (attachment) =>
              typeof attachment.id === "string" &&
              typeof attachment.fileName === "string" &&
              attachment.status === "loaded",
          ),
        );
      });
    } catch {
      window.localStorage.removeItem(`ai-mu-recent-files-${userId}`);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    window.localStorage.setItem(
      `ai-mu-recent-files-${userId}`,
      JSON.stringify(
        recentAttachments
          .slice(0, maxRecentFiles)
          .map(sanitizeRecentAttachment),
      ),
    );
  }, [recentAttachments, userId]);

  function getCurrentDocumentMetadata(): DocumentMetadata | null {
    if (!uploadedAttachments.length) {
      return null;
    }

    const primaryAttachment = uploadedAttachments[0];

    return {
      fileName:
        uploadedAttachments.length > 1
          ? `${uploadedAttachments.length} files uploaded`
          : primaryAttachment.fileName,
      fileType:
        uploadedAttachments.length > 1 ? "Dokumen" : primaryAttachment.fileType,
      status: uploadedAttachments.some((attachment) => attachment.status === "error")
        ? "error"
        : uploadedAttachments.some((attachment) => attachment.status === "loading")
          ? "loading"
          : "loaded",
      files: uploadedAttachments.map((attachment) => ({
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        status: attachment.status,
        kind: attachment.kind,
      })),
    };
  }

  function resetDocumentState() {
    setUploadedAttachments([]);
    documentTextRef.current = "";
    setDocumentText("");
    setDocumentStatus("idle");
    setDocumentError("");
    setComposerNotice("");
  }

  function rememberLoadedAttachments(attachments: UploadedAttachment[]) {
    const reusableAttachments = attachments
      .filter(
        (attachment) =>
          attachment.status === "loaded" &&
          attachment.kind === "document" &&
          attachment.text,
      )
      .map((attachment) => ({
        ...sanitizeRecentAttachment(attachment),
        id: `${attachment.fileName}-${crypto.randomUUID()}`,
      }));

    if (!reusableAttachments.length) {
      return;
    }

    setRecentAttachments((current) => {
      const next = [...reusableAttachments, ...current].filter(
        (attachment, index, allAttachments) =>
          allAttachments.findIndex(
            (candidate) => candidate.fileName === attachment.fileName,
          ) === index,
      );

      return next.slice(0, maxRecentFiles);
    });
  }

  function reuseRecentAttachment(attachment: UploadedAttachment) {
    const nextAttachment = {
      ...attachment,
      id: `${attachment.fileName}-${crypto.randomUUID()}`,
    };

    setUploadedAttachments((current) => [...current, nextAttachment]);

    if (nextAttachment.kind === "document" && nextAttachment.text) {
      documentTextRef.current = getLoadedDocumentText([
        ...uploadedAttachments,
        nextAttachment,
      ]);
      setDocumentText(documentTextRef.current);
    }

    setDocumentStatus("loaded");
    setDocumentError("");
    setComposerNotice(`${attachment.fileName} dipakai lagi di chat ini.`);
    setIsAttachMenuOpen(false);
  }

  function removeAttachment(attachmentId: string) {
    uploadFilesByAttachmentIdRef.current.delete(attachmentId);
    setUploadedAttachments((current) => {
      const nextAttachments = current.filter(
        (attachment) => attachment.id !== attachmentId,
      );

      documentTextRef.current = getLoadedDocumentText(nextAttachments);
      setDocumentText(documentTextRef.current);
      setDocumentStatus(getAttachmentStatus(nextAttachments));
      setDocumentError(
        nextAttachments.find((attachment) => attachment.status === "error")
          ?.error ?? "",
      );

      return nextAttachments;
    });
  }

  function syncAttachmentState(attachments: UploadedAttachment[]) {
    documentTextRef.current = getLoadedDocumentText(attachments);
    setDocumentText(documentTextRef.current);
    setDocumentStatus(getAttachmentStatus(attachments));
    setDocumentError(
      attachments.find((attachment) => attachment.status === "error")?.error ?? "",
    );
    rememberLoadedAttachments(attachments);
  }

  async function readUploadedAttachment(file: File, attachmentId: string) {
    if (!isSupportedUpload(file)) {
      setUploadedAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                status: "error",
                error:
                  "Format belum didukung. Gunakan PDF, DOCX, PPTX, XLSX, PNG, JPG, JPEG, atau WEBP.",
              }
            : attachment,
        ),
      );
      return;
    }

    if (file.size > maxDocumentUploadBytes) {
      setUploadedAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                status: "error",
                error: "Ukuran file terlalu besar. Maksimal 25 MB per file.",
              }
            : attachment,
        ),
      );
      return;
    }

    try {
      const data = await extractDocumentFromLocalUpload(file);
      const normalizedType =
        data.kind === "image"
          ? "Image"
          : data.fileType === "docx"
            ? "Word"
            : data.fileType === "pptx"
              ? "PowerPoint"
              : data.fileType === "xlsx"
                ? "Excel"
                : "PDF";

      setUploadedAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                fileName: data.fileName ?? file.name,
                fileType: normalizedType,
                kind: data.kind ?? attachment.kind,
                status: "loaded",
                text: data.text,
                mimeType: data.mimeType,
                data: data.data,
                error: "",
              }
            : attachment,
        ),
      );
      uploadFilesByAttachmentIdRef.current.delete(attachmentId);
    } catch (error) {
      console.error(error);
      setUploadedAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "File belum bisa dibaca. Silakan coba file lain.",
              }
            : attachment,
        ),
      );
    }
  }

  async function retryAttachment(attachmentId: string) {
    const file = uploadFilesByAttachmentIdRef.current.get(attachmentId);

    if (!file) {
      setUploadedAttachments((current) => {
        const nextAttachments = current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                status: "error" as const,
                error:
                  "File asli tidak tersedia lagi. Hapus lalu upload ulang file ini.",
              }
            : attachment,
        );
        syncAttachmentState(nextAttachments);
        return nextAttachments;
      });
      return;
    }

    const key = `${file.name}:${file.size}:${file.lastModified}`;

    if (uploadKeysInFlightRef.current.has(key)) {
      return;
    }

    uploadKeysInFlightRef.current.add(key);
    setDocumentError("");
    setDocumentStatus("loading");
    setUploadedAttachments((current) =>
      current.map((attachment) =>
        attachment.id === attachmentId
          ? { ...attachment, status: "loading", error: "" }
          : attachment,
      ),
    );

    try {
      await readUploadedAttachment(file, attachmentId);
    } finally {
      uploadKeysInFlightRef.current.delete(key);
    }

    setUploadedAttachments((current) => {
      syncAttachmentState(current);
      return current;
    });
  }

  function showComposerNotice(message: string) {
    setComposerNotice(message);
    setIsAttachMenuOpen(false);
  }

  async function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const seenKeys = new Set<string>();
    const files = selectedFiles.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;

      if (seenKeys.has(key) || uploadKeysInFlightRef.current.has(key)) {
        return false;
      }

      seenKeys.add(key);
      uploadKeysInFlightRef.current.add(key);
      return true;
    });

    if (!files.length) {
      event.target.value = "";
      return;
    }

    if (!hasUploadQuota) {
      for (const file of files) {
        uploadKeysInFlightRef.current.delete(
          `${file.name}:${file.size}:${file.lastModified}`,
        );
      }
      setDocumentStatus("error");
      setDocumentError(
        "Limit upload dokumen harian paket kamu sudah habis. Silakan coba lagi besok atau upgrade paket.",
      );
      event.target.value = "";
      return;
    }

    const pendingAttachments = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      fileName: file.name,
      fileType: getUploadedDocumentType(file.name.toLowerCase()),
      kind: getAttachmentKind(file),
      status: "loading" as const,
    }));
    pendingAttachments.forEach((attachment, index) => {
      uploadFilesByAttachmentIdRef.current.set(attachment.id, files[index]);
    });

    setUploadedAttachments((current) => [...current, ...pendingAttachments]);
    setDocumentError("");
    setDocumentStatus("loading");
    setComposerNotice("");

    try {
      await Promise.all(
        files.map(async (file, index) => {
          const attachmentId = pendingAttachments[index].id;
          await readUploadedAttachment(file, attachmentId);
        }),
      );
    } finally {
      for (const file of files) {
        uploadKeysInFlightRef.current.delete(
          `${file.name}:${file.size}:${file.lastModified}`,
        );
      }
    }

    setUploadedAttachments((current) => {
      syncAttachmentState(current);
      return current;
    });

    await loadUsage();
    setIsAttachMenuOpen(false);
    // Allows uploading the same files again after an error or update.
    event.target.value = "";
  }

  return {
    uploadedAttachments,
    setUploadedAttachments,
    recentAttachments,
    documentText,
    setDocumentText,
    documentStatus,
    setDocumentStatus,
    documentError,
    setDocumentError,
    composerNotice,
    setComposerNotice,
    isAttachMenuOpen,
    setIsAttachMenuOpen,
    documentTextRef,
    uploadKeysInFlightRef,
    uploadFilesByAttachmentIdRef,
    getCurrentDocumentMetadata,
    resetDocumentState,
    rememberLoadedAttachments,
    reuseRecentAttachment,
    removeAttachment,
    syncAttachmentState,
    readUploadedAttachment,
    retryAttachment,
    handleDocumentUpload,
    showComposerNotice,
  };
}
