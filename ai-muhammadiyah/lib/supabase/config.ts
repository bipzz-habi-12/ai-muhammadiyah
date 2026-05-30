const restSuffix = "/rest/v1";

export function getSupabaseProjectUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!rawUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  // Auth and Storage need the project base URL, not the REST endpoint URL.
  return rawUrl.endsWith(restSuffix) ? rawUrl.slice(0, -restSuffix.length) : rawUrl;
}

export function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.");
  }

  return anonKey;
}
