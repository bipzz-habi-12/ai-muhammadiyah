import { NextResponse } from "next/server";
import { generateDeviceToken } from "@/lib/second-brain/sync";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET  /api/notes/devices -> daftar perangkat tersambung milik pengguna.
// POST /api/notes/devices -> daftarkan perangkat baru, kembalikan token SEKALI.
//
// Dipanggil dari browser (pengguna yang sudah login), bukan dari agen lokal.

export const runtime = "nodejs";

const maxDevicesPerUser = 10;

export async function GET() {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    // `token_hash` sengaja TIDAK ikut dipilih — tidak ada alasan sah kolom itu
    // sampai ke browser, sekalipun ia sudah berupa hash.
    const { data, error } = await supabase
      .from("note_sync_devices")
      .select("id,name,last_seen_at,revoked_at,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ devices: data ?? [] });
  } catch (error) {
    console.error("List sync devices failed:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar perangkat." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      // Nama boleh kosong; bukan alasan menolak permintaan.
    }

    const rawName =
      typeof (body as { name?: unknown })?.name === "string"
        ? ((body as { name: string }).name ?? "")
        : "";
    const name = rawName.trim().slice(0, 120) || "Perangkat saya";

    const { count, error: countError } = await supabase
      .from("note_sync_devices")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null);

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) >= maxDevicesPerUser) {
      return NextResponse.json(
        {
          error: `Maksimal ${maxDevicesPerUser} perangkat aktif. Cabut salah satu dulu.`,
        },
        { status: 403 },
      );
    }

    const { token, tokenHash } = generateDeviceToken();

    // Service role: tabel perangkat sengaja tidak punya policy INSERT supaya
    // token tidak pernah bisa ditentukan dari sisi klien — hanya dibangkitkan
    // di server dengan RNG kriptografis. `user_id` diambil dari sesi, tidak
    // pernah dari body permintaan.
    const admin = createSupabaseServerClient();
    const { data: device, error } = await admin
      .from("note_sync_devices")
      .insert({ user_id: user.id, name, token_hash: tokenHash })
      .select("id,name,created_at")
      .single();

    if (error) {
      throw error;
    }

    // Satu-satunya kali token asli terlihat. Setelah ini hanya hash-nya yang
    // ada, jadi ia tidak bisa ditampilkan lagi — hanya bisa dicabut & dibuat
    // ulang.
    return NextResponse.json({ device, token }, { status: 201 });
  } catch (error) {
    console.error("Create sync device failed:", error);
    return NextResponse.json(
      { error: "Gagal mendaftarkan perangkat." },
      { status: 500 },
    );
  }
}
