import { NextResponse } from "next/server";
import PDFParser from "pdf2json";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function cleanPdfCharacters(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[�]+/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/(?:[ \t]*[|•·●◦▪▫■□◆◇]+[ \t]*){4,}/g, " ")
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
  return /^([-*•]|\d+[.)]|[a-zA-Z][.)])\s+/.test(line);
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

function normalizePdfText(text: string) {
  const cleanedText = cleanPdfCharacters(text);
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

function extractTextFromPdf(buffer: Buffer) {
  return new Promise<string>((resolve, reject) => {
    // The second constructor argument tells pdf2json to keep raw text content.
    const parser = new PDFParser(null, true);

    parser.once("pdfParser_dataError", (error) => {
      parser.destroy();
      reject(error.parserError ?? error);
    });

    parser.once("pdfParser_dataReady", () => {
      const text = normalizePdfText(parser.getRawTextContent());
      parser.destroy();
      resolve(text);
    });

    parser.parseBuffer(buffer, 0);
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("pdf");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File PDF tidak ditemukan." },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Mohon upload file PDF." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPdf(buffer);

    if (!text) {
      return NextResponse.json(
        {
          error:
            "PDF berhasil dibuka, tetapi tidak ada teks yang bisa dibaca. Kemungkinan PDF ini hasil scan atau berisi gambar, sehingga perlu OCR terlebih dahulu.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      fileName: file.name,
      text,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("PDF extraction error:", message);

    if (message.toLowerCase().includes("password")) {
      return NextResponse.json(
        { error: "PDF terkunci password. Mohon upload PDF yang tidak terkunci." },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Gagal membaca teks dari PDF. Pastikan file tidak rusak dan berisi teks yang bisa diseleksi.",
      },
      { status: 500 },
    );
  }
}
