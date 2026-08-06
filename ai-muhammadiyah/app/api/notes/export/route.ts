import { noteToLogseqFile } from "@/lib/second-brain/logseq";
import { createZip } from "@/lib/second-brain/zip";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { NextResponse } from "next/server";

// GET /api/notes/export -> seluruh catatan sebagai graf Logseq (.zip).
//
// Bentuk arsipnya sengaja `pages/<Judul>.md` supaya isinya bisa disalin
// langsung ke folder graf Logseq yang sudah ada tanpa penataan ulang.
//
// Ini juga jalur keluar bagi pengguna: catatan mereka bisa dibawa pergi kapan
// saja dalam format markdown biasa, bukan terkunci di database kita.

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("notes")
      .select("title,content")
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const notes = (data ?? []) as { title: string; content: string }[];

    if (!notes.length) {
      return NextResponse.json(
        { error: "Belum ada catatan untuk diekspor." },
        { status: 404 },
      );
    }

    // Nama berkas hasil sanitasi bisa bertabrakan (mis. "A/B" dan "A___B"),
    // jadi tabrakan diberi akhiran angka daripada saling menimpa dalam arsip.
    const usedNames = new Set<string>();
    const entries = notes.map((note) => {
      const file = noteToLogseqFile(note);
      let name = file.fileName;
      let suffix = 2;

      while (usedNames.has(name.toLowerCase())) {
        name = file.fileName.replace(/\.md$/, ` (${suffix}).md`);
        suffix += 1;
      }

      usedNames.add(name.toLowerCase());

      return { name: `pages/${name}`, data: file.body };
    });

    const archive = createZip(entries);
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(archive as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="otak-kedua-${stamp}.zip"`,
        "Content-Length": String(archive.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export notes failed:", error);
    return NextResponse.json(
      { error: "Gagal mengekspor catatan." },
      { status: 500 },
    );
  }
}
