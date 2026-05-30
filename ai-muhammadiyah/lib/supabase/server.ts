import { createClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl } from "./config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET;

export function hasAnySupabaseStorageConfig() {
  return Boolean(supabaseUrl || supabaseServiceRoleKey || storageBucket);
}

export function isSupabaseStorageConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey && storageBucket);
}

export function getSupabaseStorageBucket() {
  const bucket = storageBucket?.trim();

  if (!bucket) {
    throw new Error("SUPABASE_STORAGE_BUCKET is not configured.");
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(bucket)) {
    throw new Error("SUPABASE_STORAGE_BUCKET contains invalid characters.");
  }

  return bucket;
}

export function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server credentials are not configured.");
  }

  // Server-only client: this uses the service role key, so never import it in
  // client components or expose it to the browser.
  return createClient(getSupabaseProjectUrl(), supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createDocumentStoragePath(fileName: string) {
  const normalizedFileName = fileName.normalize("NFKD").toLowerCase();
  const extensionMatch = normalizedFileName.match(/\.(pdf|docx|pptx|xlsx)$/);
  const extension = extensionMatch?.[0] ?? "";
  const nameWithoutExtension = extension
    ? normalizedFileName.slice(0, -extension.length)
    : normalizedFileName;

  const safeBaseName = nameWithoutExtension
    .replace(/[\/\\]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 100);

  const safeFileName = `${safeBaseName || "document"}${extension}`;
  const timestamp = Date.now();
  const randomId = crypto.randomUUID();
  const path = `${timestamp}-${randomId}-${safeFileName}`;

  if (!/^[a-z0-9._-]+$/i.test(path)) {
    throw new Error("Could not create a safe Supabase Storage path.");
  }

  return path;
}
