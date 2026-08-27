"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Satu-satunya bagian /more yang butuh client: keluar dari sesi. Memakai
// createSupabaseBrowserClient + signOut, pola yang sama dengan useAuthSession
// di halaman chat (hook itu tidak dipakai di sini karena ia juga memuat user
// dari client — di /more datanya sudah dibaca di server).

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium text-[var(--danger)] transition hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon name="lock" className="h-5 w-5" />
      {isLoggingOut ? "Keluar..." : "Keluar"}
    </button>
  );
}
