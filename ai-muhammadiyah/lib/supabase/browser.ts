"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  // Browser auth must use the anon key. Never put the service role key here.
  browserClient ??= createBrowserClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
  );

  return browserClient;
}
