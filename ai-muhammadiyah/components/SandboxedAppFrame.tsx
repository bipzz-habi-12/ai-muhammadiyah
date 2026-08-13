"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildMiniAppSrcDoc,
  miniAppFramePermissions,
  miniAppFrameSandbox,
  miniAppMessageSource,
} from "@/lib/sandbox/mini-app";

interface SandboxedAppFrameProps {
  runtime: "html" | "react";
  code: string;
}

/**
 * Menjalankan artifact mini aplikasi di iframe terisolasi.
 *
 * Seluruh alasan keamanannya ada di `lib/sandbox/mini-app.ts` — komponen ini
 * sengaja tidak menyusun atribut sandbox sendiri, melainkan memakai konstanta
 * dari sana supaya tidak ada satu pun titik render yang lupa satu flag.
 */
export default function SandboxedAppFrame({
  runtime,
  code,
}: SandboxedAppFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const srcDoc = useMemo(
    () => buildMiniAppSrcDoc(runtime, code),
    [runtime, code],
  );
  // Error disimpan bersama srcDoc yang melahirkannya, lalu diturunkan saat
  // render — dengan begitu kode baru otomatis tampil bersih tanpa perlu
  // me-reset state lewat effect.
  const [errorState, setErrorState] = useState<{
    srcDoc: string;
    message: string;
  } | null>(null);
  const runtimeError = errorState?.srcDoc === srcDoc ? errorState.message : "";

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Origin sandbox opaque ("null"), jadi origin tidak bisa dipakai sebagai
      // filter — identitas pengirim diverifikasi lewat contentWindow-nya.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) {
        return;
      }

      const data = event.data as { source?: unknown; message?: unknown } | null;

      if (!data || data.source !== miniAppMessageSource) {
        return;
      }

      // Payload dari kode tidak tepercaya: dipakai sebagai teks biasa,
      // dipotong, dan tidak pernah di-render sebagai HTML.
      setErrorState({
        srcDoc,
        message:
          typeof data.message === "string" && data.message.trim()
            ? data.message.slice(0, 300)
            : "Aplikasi ini menemui error saat dijalankan.",
      });
    }

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [srcDoc]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {runtimeError && (
        <p className="shrink-0 border-b border-[var(--danger)]/20 bg-[var(--danger-bg)] px-4 py-2 text-xs leading-relaxed text-[var(--danger)]">
          {runtimeError}
        </p>
      )}
      <iframe
        ref={frameRef}
        title="Pratinjau mini aplikasi"
        srcDoc={srcDoc}
        sandbox={miniAppFrameSandbox}
        allow={miniAppFramePermissions}
        referrerPolicy="no-referrer"
        className="min-h-[320px] w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
