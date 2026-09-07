import { NextResponse } from "next/server";
import {
  deleteUserProviderApiKey,
  isModelProviderId,
  listUserProviderCredentials,
  normalizeUserApiKey,
  saveUserProviderApiKey,
  validateProviderApiKey,
} from "@/lib/ai/user-credentials";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const validationWindowMs = 10 * 60 * 1000;
const maxValidationAttempts = 5;
const attemptsByUser = new Map<string, number[]>();

function canValidate(userId: string) {
  const now = Date.now();
  const recent = (attemptsByUser.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < validationWindowMs,
  );

  if (recent.length >= maxValidationAttempts) {
    attemptsByUser.set(userId, recent);
    return false;
  }

  attemptsByUser.set(userId, [...recent, now]);
  return true;
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  try {
    const credentials = await listUserProviderCredentials(user.id);
    return NextResponse.json(
      { credentials },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Provider credential status failed:", {
      userId: user.id,
      error,
    });
    return NextResponse.json(
      { error: "Status API key belum bisa dimuat." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  if (!canValidate(user.id)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi dalam 10 menit." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
    apiKey?: unknown;
  } | null;
  const provider = body?.provider;
  const apiKey = normalizeUserApiKey(body?.apiKey);

  if (!isModelProviderId(provider) || apiKey.length < 12) {
    return NextResponse.json(
      { error: "Provider atau format API key tidak valid." },
      { status: 400 },
    );
  }

  const isValid = await validateProviderApiKey(provider, apiKey);

  if (!isValid) {
    return NextResponse.json(
      {
        error:
          "API key ditolak oleh provider. Periksa key, izin, dan status billing provider.",
      },
      { status: 400 },
    );
  }

  try {
    await saveUserProviderApiKey(user.id, provider, apiKey);
    return NextResponse.json({
      credential: {
        provider,
        keyHint: apiKey.slice(-4),
        validatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Provider credential save failed:", {
      userId: user.id,
      provider,
      error,
    });
    return NextResponse.json(
      { error: "API key belum bisa disimpan dengan aman." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const provider = new URL(request.url).searchParams.get("provider");

  if (!isModelProviderId(provider)) {
    return NextResponse.json(
      { error: "Provider tidak valid." },
      { status: 400 },
    );
  }

  try {
    await deleteUserProviderApiKey(user.id, provider);
    return NextResponse.json({ deleted: true, provider });
  } catch (error) {
    console.error("Provider credential delete failed:", {
      userId: user.id,
      provider,
      error,
    });
    return NextResponse.json(
      { error: "API key belum bisa dihapus." },
      { status: 500 },
    );
  }
}
