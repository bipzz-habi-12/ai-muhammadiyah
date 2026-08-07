import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// DELETE /api/notes/devices/[id] -> cabut perangkat sinkronisasi.
//
// Barisnya benar-benar DIHAPUS, bukan sekadar ditandai revoked_at: baris yang
// hilang berarti tokennya tidak akan pernah cocok lagi pada pencarian hash,
// dan hash-nya ikut lenyap dari database. `revoked_at` tetap ada di skema
// untuk pencabutan otomatis di masa depan (mis. kedaluwarsa), bukan untuk
// tindakan pengguna ini.
//
// Memakai klien ber-RLS: policy "Users can revoke own sync devices" sudah
// membatasi ke pemiliknya, jadi id milik orang lain hanya menghasilkan 404.

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("note_sync_devices")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "Perangkat tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ revoked: true });
  } catch (error) {
    console.error("Revoke sync device failed:", error);
    return NextResponse.json(
      { error: "Gagal mencabut perangkat." },
      { status: 500 },
    );
  }
}
