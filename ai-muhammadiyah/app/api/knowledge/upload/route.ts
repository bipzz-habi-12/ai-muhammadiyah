import { NextResponse } from "next/server";
import { isKnowledgeAdmin } from "@/lib/admin";
import {
  extractDocumentText,
  getDocumentType,
  getEmptyDocumentMessage,
  getErrorMessage,
  getExtractionFailureMessage,
  type SupportedDocumentType,
} from "@/lib/documents/extraction";
import {
  estimateKnowledgeUploadTokens,
  splitTextIntoKnowledgeChunks,
} from "@/lib/knowledge";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const maxKnowledgeUploadBytes = 25 * 1024 * 1024;

export async function POST(request: Request) {
  let documentType: SupportedDocumentType | null = null;

  try {
    const authSupabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    if (!isKnowledgeAdmin(user)) {
      return NextResponse.json(
        { error: "Hanya admin yang bisa upload knowledge source." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("document");
    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim() || "general";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File knowledge source tidak ditemukan." },
        { status: 400 },
      );
    }

    if (file.size > maxKnowledgeUploadBytes) {
      return NextResponse.json(
        { error: "Ukuran dokumen terlalu besar. Maksimal 25 MB." },
        { status: 413 },
      );
    }

    documentType = getDocumentType(file.name, file.type);

    if (!documentType) {
      return NextResponse.json(
        {
          error:
            "Format belum didukung. Mohon upload PDF, DOCX, PPTX, atau XLSX.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractDocumentText(buffer, documentType);

    if (!text) {
      return NextResponse.json(
        { error: getEmptyDocumentMessage(documentType) },
        { status: 422 },
      );
    }

    const chunks = splitTextIntoKnowledgeChunks(text);

    if (!chunks.length) {
      return NextResponse.json(
        { error: "Dokumen belum menghasilkan potongan teks yang bisa disimpan." },
        { status: 422 },
      );
    }

    const serverSupabase = createSupabaseServerClient();
    const { data: source, error: sourceError } = await serverSupabase
      .from("knowledge_sources")
      .insert({
        title: title || file.name,
        category,
        file_type: documentType,
        original_file_name: file.name,
        created_by: user.id,
        status: "active",
        is_public: true,
        chunk_count: chunks.length,
        metadata: {
          mime_type: file.type,
          file_size_bytes: buffer.byteLength,
          estimated_tokens: estimateKnowledgeUploadTokens(text),
        },
      })
      .select("id,title,category,file_type,chunk_count,created_at")
      .single();

    if (sourceError || !source) {
      throw sourceError ?? new Error("Knowledge source belum bisa disimpan.");
    }

    const { error: chunksError } = await serverSupabase
      .from("knowledge_chunks")
      .insert(
        chunks.map((chunk, index) => ({
          source_id: source.id,
          chunk_order: index,
          content: chunk,
          created_by: user.id,
        })),
      );

    if (chunksError) {
      await serverSupabase
        .from("knowledge_sources")
        .delete()
        .eq("id", source.id);
      throw chunksError;
    }

    return NextResponse.json({
      source,
      chunkCount: chunks.length,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Knowledge upload failed:", message);

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
