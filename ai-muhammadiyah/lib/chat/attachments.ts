import type {
  DocumentStatus,
  UploadedAttachment,
  UploadedAttachmentKind,
  UploadedDocumentType,
} from "@/lib/mappers/types";

const documentExtractionTimeoutMs = 60_000;

export function getLoadedDocumentText(attachments: UploadedAttachment[]) {
  return attachments
    .filter(
      (attachment) =>
        attachment.kind === "document" &&
        attachment.status === "loaded" &&
        attachment.text,
    )
    .map(
      (attachment) =>
        `FILE: ${attachment.fileName} (${attachment.fileType})\n${attachment.text}`,
    )
    .join("\n\n---\n\n");
}

export function getAttachmentStatus(
  attachments: UploadedAttachment[],
): DocumentStatus {
  if (attachments.some((attachment) => attachment.status === "error")) {
    return "error";
  }

  if (attachments.some((attachment) => attachment.status === "loading")) {
    return "loading";
  }

  return attachments.length ? "loaded" : "idle";
}

export function sanitizeRecentAttachment(attachment: UploadedAttachment) {
  const compactAttachment = { ...attachment };

  if (compactAttachment.kind === "image") {
    delete compactAttachment.data;
  }

  return compactAttachment;
}

export function getUploadedDocumentType(fileName: string): UploadedDocumentType {
  if (
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".webp")
  ) {
    return "Image";
  }

  if (fileName.endsWith(".docx")) {
    return "Word";
  }

  if (fileName.endsWith(".pptx")) {
    return "PowerPoint";
  }

  if (fileName.endsWith(".xlsx")) {
    return "Excel";
  }

  return "PDF";
}

export function getAttachmentKind(file: File): UploadedAttachmentKind {
  const fileName = file.name.toLowerCase();

  return file.type.startsWith("image/") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".webp")
    ? "image"
    : "document";
}

export function isSupportedUpload(file: File) {
  const fileName = file.name.toLowerCase();

  return (
    file.type === "application/pdf" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/webp" ||
    fileName.endsWith(".pdf") ||
    fileName.endsWith(".docx") ||
    fileName.endsWith(".pptx") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".webp")
  );
}

export async function extractDocumentFromLocalUpload(file: File) {
  const formData = new FormData();
  formData.append("document", file);
  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = window.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, documentExtractionTimeoutMs);

  try {
    const response = await fetch("/api/document", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const data = (await response.json()) as {
      error?: string;
      fileName?: string;
      fileType?: "pdf" | "docx" | "pptx" | "xlsx" | "png" | "jpeg" | "webp";
      kind?: UploadedAttachmentKind;
      mimeType?: string;
      data?: string;
      text?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Dokumen belum bisa dibaca.");
    }

    return data;
  } catch (error) {
    if (
      didTimeout ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw new Error(
        "File belum selesai dibaca setelah 60 detik. Silakan coba lagi atau gunakan file yang lebih kecil.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
