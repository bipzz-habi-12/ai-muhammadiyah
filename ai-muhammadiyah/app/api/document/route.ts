import { NextResponse } from "next/server";
import mammoth from "mammoth";
import PDFParser from "pdf2json";

export const runtime = "nodejs";

type SupportedDocumentType = "pdf" | "docx";

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

function getDocumentType(file: File): SupportedDocumentType | null {
  const fileName = file.name.toLowerCase();

  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    return "docx";
  }

  return null;
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

function getEmptyDocumentMessage(documentType: SupportedDocumentType) {
  if (documentType === "pdf") {
    return "PDF berhasil dibuka, tetapi tidak ada teks yang bisa dibaca. Kemungkinan PDF ini hasil scan atau berisi gambar, sehingga perlu OCR terlebih dahulu.";
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

  return "Gagal membaca dokumen. Mohon upload file PDF atau Word (.docx).";
}

export async function POST(request: Request) {
  let documentType: SupportedDocumentType | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("document");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File dokumen tidak ditemukan." },
        { status: 400 },
      );
    }

    documentType = getDocumentType(file);

    if (!documentType) {
      return NextResponse.json(
        { error: "Format belum didukung. Mohon upload file PDF atau Word (.docx)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text =
      documentType === "pdf"
        ? await extractTextFromPdf(buffer)
        : await extractTextFromDocx(buffer);

    if (!text) {
      return NextResponse.json(
        { error: getEmptyDocumentMessage(documentType) },
        { status: 422 },
      );
    }

    return NextResponse.json({
      fileName: file.name,
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
