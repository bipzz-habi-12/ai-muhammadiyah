import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { parseOffice, type OfficeContentNode } from "officeparser";
import PDFParser from "pdf2json";
import * as XLSX from "xlsx";
import {
  createDocumentStoragePath,
  createSupabaseServerClient,
  getSupabaseStorageBucket,
  hasAnySupabaseStorageConfig,
  isSupabaseStorageConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type SupportedDocumentType = "pdf" | "docx" | "pptx" | "xlsx";
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function cleanDocumentCharacters(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ï¿½]+/g, "")
    .replace(/[â€œâ€]/g, '"')
    .replace(/[â€˜â€™]/g, "'")
    .replace(/[â€â€‘â€’â€“â€”]/g, "-")
    .replace(/(?:[ \t]*[|â€¢Â·â—â—¦â–ªâ–«â– â–¡â—†â—‡]+[ \t]*){4,}/g, " ")
    .replace(/[ \t]+/g, " ");
}

function isHeading(line: string) {
  const words = line.split(/\s+/).filter(Boolean);

  return (
    line.length <= 90 &&
    words.length <= 12 &&
    (line === line.toUpperCase() || /^[A-Z0-9IVX]+[.)]\s+/.test(line))
  );
}

function isListItem(line: string) {
  return /^([-*â€¢]|\d+[.)]|[a-zA-Z][.)])\s+/.test(line);
}

function shouldJoinLines(previousLine: string, currentLine: string) {
  if (!previousLine || !currentLine) {
    return false;
  }

  if (isHeading(previousLine) || isHeading(currentLine) || isListItem(currentLine)) {
    return false;
  }

  if (/[:.;!?)]$/.test(previousLine)) {
    return false;
  }

  return /^[a-z0-9("'`]/i.test(currentLine);
}

function normalizeDocumentText(text: string) {
  const cleanedText = cleanDocumentCharacters(text);
  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];

  for (const line of lines) {
    const previous = paragraphs.at(-1);

    if (previous && shouldJoinLines(previous, line)) {
      paragraphs[paragraphs.length - 1] = `${previous} ${line}`;
    } else {
      paragraphs.push(line);
    }
  }

  return paragraphs
    .join("\n\n")
    .replace(/([A-Za-z])-\s+([a-z])/g, "$1$2")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getDocumentType(
  fileName: string,
  mimeType?: string,
): SupportedDocumentType | null {
  const normalizedFileName = fileName.toLowerCase();

  if (mimeType === "application/pdf" || normalizedFileName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedFileName.endsWith(".docx")
  ) {
    return "docx";
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    normalizedFileName.endsWith(".pptx")
  ) {
    return "pptx";
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    normalizedFileName.endsWith(".xlsx")
  ) {
    return "xlsx";
  }

  return null;
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

  // The server receives the multipart file once, persists that same buffer to
  // Supabase Storage with the service role key, then extracts text from the
  // in-memory buffer below. No signed upload URL or browser storage token needed.
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

function extractTextFromPdf(buffer: Buffer) {
  return new Promise<string>((resolve, reject) => {
    // The second constructor argument tells pdf2json to keep raw text content.
    const parser = new PDFParser(null, true);

    parser.once("pdfParser_dataError", (error) => {
      parser.destroy();
      reject(error.parserError ?? error);
    });

    parser.once("pdfParser_dataReady", () => {
      const text = normalizeDocumentText(parser.getRawTextContent());
      parser.destroy();
      resolve(text);
    });

    parser.parseBuffer(buffer, 0);
  });
}

async function extractTextFromDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });

  return normalizeDocumentText(result.value);
}

function getTextFromOfficeNode(node: OfficeContentNode): string {
  if (node.children?.length) {
    return node.children.map(getTextFromOfficeNode).filter(Boolean).join("\n");
  }

  return node.text?.trim() ?? "";
}

async function extractTextFromPptx(buffer: Buffer) {
  const presentation = await parseOffice(buffer, {
    fileType: "pptx",
    newlineDelimiter: "\n",
    ignoreNotes: false,
    putNotesAtLast: false,
    extractAttachments: false,
    ocr: false,
  });

  const slideTexts = presentation.content
    .filter((node) => node.type === "slide")
    .map((slide, index) => {
      const metadata = slide.metadata as { slideNumber?: number } | undefined;
      const slideNumber = metadata?.slideNumber ?? index + 1;
      const slideText = normalizeDocumentText(getTextFromOfficeNode(slide));

      return slideText ? `Slide ${slideNumber}:\n${slideText}` : "";
    })
    .filter(Boolean);

  // Keep slide numbers in the context so the AI can answer slide-specific questions.
  return slideTexts.length
    ? slideTexts.join("\n\n")
    : normalizeDocumentText(presentation.toText());
}

function formatSpreadsheetCell(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "/")
    .trim();
}

function extractTextFromXlsx(buffer: Buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const worksheetTexts = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return "";
    }

    // Convert the worksheet to simple rows so the AI receives readable table data.
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
      raw: false,
    });

    const readableRows = rows
      .map((row) => row.map(formatSpreadsheetCell))
      .map((row) => {
        while (row.length && !row.at(-1)) {
          row.pop();
        }

        return row;
      })
      .filter((row) => row.some(Boolean))
      .map((row) => `| ${row.join(" | ")} |`);

    if (!readableRows.length) {
      return "";
    }

    return [`Worksheet: ${sheetName}`, ...readableRows].join("\n");
  }).filter(Boolean);

  return normalizeDocumentText(worksheetTexts.join("\n\n"));
}

function getEmptyDocumentMessage(documentType: SupportedDocumentType) {
  if (documentType === "pdf") {
    return "PDF berhasil dibuka, tetapi tidak ada teks yang bisa dibaca. Kemungkinan PDF ini hasil scan atau berisi gambar, sehingga perlu OCR terlebih dahulu.";
  }

  if (documentType === "pptx") {
    return "PowerPoint berhasil dibuka, tetapi tidak ada teks slide yang bisa dibaca. Mohon upload file .pptx yang berisi teks, bukan hanya gambar.";
  }

  if (documentType === "xlsx") {
    return "Excel berhasil dibuka, tetapi tidak ada data tabel yang bisa dibaca. Mohon upload file .xlsx yang berisi data pada worksheet.";
  }

  return "Dokumen Word berhasil dibuka, tetapi tidak ada teks yang bisa dibaca. Mohon upload dokumen .docx yang berisi teks.";
}

function getExtractionFailureMessage(documentType: SupportedDocumentType | null) {
  if (documentType === "pdf") {
    return "Gagal membaca teks dari PDF. Pastikan file tidak rusak dan berisi teks yang bisa diseleksi.";
  }

  if (documentType === "docx") {
    return "Gagal membaca teks dari dokumen Word. Pastikan file .docx tidak rusak dan bukan file lama .doc.";
  }

  if (documentType === "pptx") {
    return "Gagal membaca teks dari PowerPoint. Pastikan file .pptx tidak rusak dan bukan file lama .ppt.";
  }

  if (documentType === "xlsx") {
    return "Gagal membaca data dari Excel. Pastikan file .xlsx tidak rusak dan bukan file lama .xls.";
  }

  return "Gagal membaca dokumen. Mohon upload file PDF, Word (.docx), PowerPoint (.pptx), atau Excel (.xlsx).";
}

export async function POST(request: Request) {
  let documentType: SupportedDocumentType | null = null;

  try {
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

    if (!documentType) {
      return NextResponse.json(
        {
          error:
            "Format belum didukung. Mohon upload file PDF, Word (.docx), PowerPoint (.pptx), atau Excel (.xlsx).",
        },
        { status: 400 },
      );
    }

    const buffer = uploadedDocument.buffer;
    await uploadDocumentBackupToStorage(
      uploadedDocument.fileName,
      uploadedDocument.mimeType,
      buffer,
    );

    let text = "";

    if (documentType === "pdf") {
      text = await extractTextFromPdf(buffer);
    } else if (documentType === "docx") {
      text = await extractTextFromDocx(buffer);
    } else if (documentType === "pptx") {
      text = await extractTextFromPptx(buffer);
    } else {
      text = extractTextFromXlsx(buffer);
    }

    if (!text) {
      return NextResponse.json(
        { error: getEmptyDocumentMessage(documentType) },
        { status: 422 },
      );
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
