import { NextResponse } from "next/server";
import {
  extractDocumentText,
  getDocumentType,
  getEmptyDocumentMessage,
  getErrorMessage,
  getExtractionFailureMessage,
  type SupportedDocumentType,
} from "@/lib/documents/extraction";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  createDocumentStoragePath,
  createSupabaseServerClient,
  getSupabaseStorageBucket,
  hasAnySupabaseStorageConfig,
  isSupabaseStorageConfigured,
} from "@/lib/supabase/server";
import { estimateTokenUsage, getLimitErrorMessage } from "@/lib/usage/limits";

export const runtime = "nodejs";

type UploadedDocumentResult =
  | {
      fileName: string;
      mimeType?: string;
      buffer: Buffer;
    }
  | {
      error: string;
      status: number;
    };

const maxDocumentUploadBytes = 25 * 1024 * 1024;
const supportedImageMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function getImageType(fileName: string, mimeType?: string) {
  const normalizedFileName = fileName.toLowerCase();

  if (
    mimeType === "image/png" ||
    normalizedFileName.endsWith(".png")
  ) {
    return "png";
  }

  if (
    mimeType === "image/jpeg" ||
    normalizedFileName.endsWith(".jpg") ||
    normalizedFileName.endsWith(".jpeg")
  ) {
    return "jpeg";
  }

  if (
    mimeType === "image/webp" ||
    normalizedFileName.endsWith(".webp")
  ) {
    return "webp";
  }

  return null;
}

function getNormalizedImageMimeType(imageType: string, mimeType?: string) {
  if (mimeType && supportedImageMimeTypes.has(mimeType)) {
    return mimeType;
  }

  return imageType === "png"
    ? "image/png"
    : imageType === "webp"
      ? "image/webp"
      : "image/jpeg";
}

async function uploadDocumentBackupToStorage(
  fileName: string,
  mimeType: string | undefined,
  buffer: Buffer,
) {
  if (!hasAnySupabaseStorageConfig()) {
    console.info("Supabase document backup skipped: storage is not configured.");
    return;
  }

  if (!isSupabaseStorageConfigured()) {
    console.warn(
      "Supabase document backup skipped: storage config is incomplete.",
    );
    return;
  }

  let supabase: ReturnType<typeof createSupabaseServerClient>;
  let bucket = "";
  let path = "";

  try {
    supabase = createSupabaseServerClient();
    bucket = getSupabaseStorageBucket();
    path = createDocumentStoragePath(fileName);
  } catch (error) {
    console.warn("Supabase document backup path skipped:", getErrorMessage(error));
    return;
  }

  console.info("Supabase document backup path generated:", {
    bucket,
    path,
    fileSize: buffer.byteLength,
  });

  const { error: bucketError } = await supabase.storage.getBucket(bucket);

  if (bucketError) {
    console.warn("Supabase document backup skipped: bucket not available.", {
      bucket,
      path,
      fileSize: buffer.byteLength,
      error: bucketError.message,
    });
    return;
  }

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: mimeType || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    console.warn("Supabase document backup upload failed:", {
      bucket,
      path,
      fileSize: buffer.byteLength,
      error: error.message,
    });
  }
}

async function getUploadedDocument(
  request: Request,
): Promise<UploadedDocumentResult> {
  const formData = await request.formData();
  const file = formData.get("document");

  if (!(file instanceof File)) {
    return {
      error: "File dokumen tidak ditemukan.",
      status: 400,
    };
  }

  if (file.size > maxDocumentUploadBytes) {
    return {
      error:
        "Ukuran dokumen terlalu besar. Mohon upload file maksimal 25 MB agar bisa dibaca dengan stabil.",
      status: 413,
    };
  }

  return {
    fileName: file.name,
    mimeType: file.type,
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

export async function POST(request: Request) {
  let documentType: SupportedDocumentType | null = null;

  try {
    const usageSupabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await usageSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const uploadedDocument = await getUploadedDocument(request);

    if ("error" in uploadedDocument) {
      return NextResponse.json(
        { error: uploadedDocument.error },
        { status: uploadedDocument.status },
      );
    }

    documentType = getDocumentType(
      uploadedDocument.fileName,
      uploadedDocument.mimeType,
    );
    const imageType = getImageType(
      uploadedDocument.fileName,
      uploadedDocument.mimeType,
    );

    if (!documentType && !imageType) {
      return NextResponse.json(
        {
          error:
            "Format belum didukung. Mohon upload file PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), PNG, JPG, JPEG, atau WEBP.",
        },
        { status: 400 },
      );
    }

    const { data: limitCheck, error: limitError } = await usageSupabase.rpc(
      "check_usage_limits",
      {
        p_action: "document_upload",
        p_model_used: "document",
        p_estimated_tokens: 0,
      },
    );

    if (limitError) {
      console.error("Document usage limit check failed:", limitError);

      return NextResponse.json(
        { error: "Limit upload belum bisa dicek." },
        { status: 500 },
      );
    }

    if (!limitCheck?.allowed) {
      return NextResponse.json(
        { error: getLimitErrorMessage(limitCheck?.reason) },
        { status: 429 },
      );
    }

    const buffer = uploadedDocument.buffer;
    await uploadDocumentBackupToStorage(
      uploadedDocument.fileName,
      uploadedDocument.mimeType,
      buffer,
    );

    if (imageType) {
      const mimeType = getNormalizedImageMimeType(
        imageType,
        uploadedDocument.mimeType,
      );
      const { error: usageError } = await usageSupabase.rpc("increment_usage", {
        p_action: "document_upload",
        p_model_used: "document",
        p_document_count: 1,
        p_estimated_tokens: 0,
        p_metadata: {
          file_name: uploadedDocument.fileName,
          file_type: imageType,
          mime_type: mimeType,
          file_size_bytes: buffer.byteLength,
          upload_kind: "image",
        },
      });

      if (usageError) {
        console.error("Image upload usage increment failed:", usageError);
      }

      return NextResponse.json({
        fileName: uploadedDocument.fileName,
        fileType: imageType,
        kind: "image",
        mimeType,
        data: buffer.toString("base64"),
      });
    }

    if (!documentType) {
      return NextResponse.json(
        { error: "Format dokumen belum didukung." },
        { status: 400 },
      );
    }

    const text = await extractDocumentText(buffer, documentType);

    if (!text) {
      return NextResponse.json(
        { error: getEmptyDocumentMessage(documentType) },
        { status: 422 },
      );
    }

    const { error: usageError } = await usageSupabase.rpc("increment_usage", {
      p_action: "document_upload",
      p_model_used: "document",
      p_document_count: 1,
      p_estimated_tokens: estimateTokenUsage(text),
      p_metadata: {
        file_name: uploadedDocument.fileName,
        file_type: documentType,
        mime_type: uploadedDocument.mimeType,
        file_size_bytes: buffer.byteLength,
      },
    });

    if (usageError) {
      console.error("Document usage increment failed:", usageError);
    }

    return NextResponse.json({
      fileName: uploadedDocument.fileName,
      fileType: documentType,
      text,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Document extraction error:", message);

    if (message.toLowerCase().includes("password")) {
      return NextResponse.json(
        { error: "Dokumen terkunci password. Mohon upload dokumen yang tidak terkunci." },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: getExtractionFailureMessage(documentType) },
      { status: 500 },
    );
  }
}
