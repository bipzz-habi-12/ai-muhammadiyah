import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "./config";

export async function createSupabaseAuthServerClient() {
  const cookieStore = await cookies();

  // This client reads the user's secure auth cookies on the server.
  // It still uses the anon key, not the service role key.
  return createServerClient(getSupabaseProjectUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies but cannot always write them.
          // Middleware refreshes the session cookies before the page renders.
        }
      },
    },
  });
}
