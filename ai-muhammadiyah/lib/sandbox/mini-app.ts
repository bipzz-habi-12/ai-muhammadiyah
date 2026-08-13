// Model keamanan "Mini Aplikasi" (artifact html_app / react_app).
//
// Isi artifact ini adalah KODE BUATAN AI yang dijalankan di browser pengguna.
// Karena itu diperlakukan sebagai kode tidak tepercaya, dan pertahanannya
// berlapis — satu lapis saja tidak cukup:
//
// 1. `sandbox="allow-scripts"` TANPA `allow-same-origin`. Ini kombinasi
//    kuncinya: skrip boleh jalan, tapi dokumennya mendapat *opaque origin*,
//    jadi ia tidak bisa membaca cookie/localStorage kita, tidak bisa menyentuh
//    `parent.document`, dan tidak bisa memanggil API kita dengan kredensial
//    pengguna. JANGAN PERNAH menambahkan `allow-same-origin` di sini — begitu
//    keduanya digabung untuk konten se-origin, iframe bisa melepas sandbox-nya
//    sendiri dan seluruh model ini runtuh.
// 2. CSP `<meta>` di dalam dokumen sandbox = allowlist CDN yang diminta
//    CLAUDE.md. Sandbox menghentikan akses ke origin kita; CSP-lah yang
//    menghentikan aplikasi memanggil domain sembarangan. `connect-src 'none'`
//    mematikan fetch/XHR/WebSocket sepenuhnya — mini aplikasi (game,
//    kalkulator, prototipe UI) memang tidak butuh jaringan, dan itu menutup
//    jalur eksfiltrasi paling gampang.
// 3. `allow` (Permissions Policy) mematikan kamera/mikrofon/geolokasi secara
//    eksplisit, dan `referrerPolicy="no-referrer"` menahan URL kita bocor ke
//    CDN.
//
// CSP `<meta>` HARUS jadi elemen pertama di dalam `<head>`: ia hanya berlaku
// untuk resource yang diparsing SESUDAHNYA.

/** Host yang boleh memuat skrip & style. Sengaja pendek — tambah host hanya
 *  kalau memang dibutuhkan, karena tiap tambahan memperluas permukaan. */
const scriptHosts = [
  "https://cdn.jsdelivr.net",
  "https://unpkg.com",
  "https://cdn.tailwindcss.com",
];
const styleHosts = [...scriptHosts, "https://fonts.googleapis.com"];
const fontHosts = ["https://fonts.gstatic.com", "data:"];

/** Versi dipatok, bukan tag "latest": build yang berubah diam-diam di bawah
 *  kaki kita adalah risiko rantai pasok. Semua dari jsdelivr (unpkg dipakai
 *  sebagian jaringan sebagai cadangan, karena itu tetap ada di allowlist). */
const reactRuntimeScripts = [
  "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js",
  "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.4/babel.min.js",
];

/** Penanda pesan dari dalam sandbox. Penerima WAJIB tetap memvalidasi
 *  `event.source` — string ini bisa ditiru siapa pun. */
export const miniAppMessageSource = "m-agent-mini-app";

/** Atribut iframe yang menegakkan lapis 1 & 3. Dipakai satu-satunya lewat
 *  `SandboxedAppFrame` supaya tidak ada penulisan ulang yang lupa satu flag. */
export const miniAppFrameSandbox = "allow-scripts";
export const miniAppFramePermissions =
  "accelerometer 'none'; camera 'none'; geolocation 'none'; gyroscope 'none'; microphone 'none'; midi 'none'; payment 'none'; usb 'none'";

function buildCspMeta(allowEval: boolean) {
  const scriptSources = [
    "'unsafe-inline'",
    // Hanya untuk react_app: Babel standalone mengompilasi JSX saat runtime.
    ...(allowEval ? ["'unsafe-eval'"] : []),
    ...scriptHosts,
  ].join(" ");

  const policy = [
    "default-src 'none'",
    `script-src ${scriptSources}`,
    `style-src 'unsafe-inline' ${styleHosts.join(" ")}`,
    `font-src ${fontHosts.join(" ")}`,
    "img-src data: blob:",
    "media-src data: blob:",
    // Tidak ada jaringan keluar sama sekali.
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "object-src 'none'",
  ].join("; ");

  return `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;
}

/** Meneruskan error runtime ke panel supaya aplikasi yang gagal tidak sekadar
 *  tampil sebagai kotak putih kosong. Dikirim ke `parent` dengan targetOrigin
 *  "*" karena origin sandbox memang opaque — sisi penerima yang memverifikasi. */
const errorBridgeScript = `<script>
(function () {
  var sent = 0;
  function report(message) {
    if (sent > 3) { return; }
    sent += 1;
    try {
      parent.postMessage(
        { source: ${JSON.stringify(miniAppMessageSource)}, message: String(message).slice(0, 300) },
        "*"
      );
    } catch (error) {}
  }
  window.addEventListener("error", function (event) {
    report(event.message || "Terjadi error di aplikasi.");
  });
  window.addEventListener("unhandledrejection", function (event) {
    report(event.reason || "Promise ditolak tanpa penanganan.");
  });
})();
</script>`;

const baseStyle = `<style>
  html, body { margin: 0; padding: 0; }
  body {
    background: #ffffff;
    color: #111827;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    padding: 16px;
  }
</style>`;

const headOpenPattern = /<head[^>]*>/i;
const htmlOpenPattern = /<html[^>]*>/i;

function wrapFragment(injection: string, body: string) {
  return [
    "<!DOCTYPE html>",
    '<html lang="id">',
    "<head>",
    injection,
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    baseStyle,
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>",
  ].join("\n");
}

/**
 * html_app: AI diminta menghasilkan satu dokumen HTML utuh, tapi pada
 * praktiknya kadang hanya potongan. Ketiga bentuk ditangani, dan yang penting
 * sama di semuanya: CSP disisipkan sebagai isi pertama `<head>`.
 */
export function buildHtmlAppSrcDoc(rawHtml: string) {
  const injection = `${buildCspMeta(false)}\n${errorBridgeScript}`;
  const html = rawHtml.trim();

  if (headOpenPattern.test(html)) {
    return html.replace(headOpenPattern, (match) => `${match}\n${injection}`);
  }

  if (htmlOpenPattern.test(html)) {
    return html.replace(
      htmlOpenPattern,
      (match) => `${match}\n<head>\n${injection}\n${baseStyle}\n</head>`,
    );
  }

  return wrapFragment(injection, html);
}

/**
 * Model tidak konsisten soal `import`/`export` walau prompt sudah melarangnya,
 * dan di mode script satu kata kunci nyasar membuat SELURUH aplikasi blank —
 * bukan sekadar satu baris gagal. Impor dibuang (di mode script ia memang tidak
 * pernah bisa jalan) dan `export` dilucuti supaya sisanya tetap hidup dan error
 * yang muncul jadi error nyata, bukan syntax error yang membingungkan.
 */
function stripModuleSyntax(code: string) {
  return code
    .replace(/^[ \t]*import[^\n]*\n/gm, "")
    .replace(/^[ \t]*export\s+default\s+/gm, "")
    .replace(/^[ \t]*export\s+(?=(const|let|var|function|class)\b)/gm, "");
}

/**
 * react_app: React + Babel dimuat dari CDN yang di-allowlist, kode AI ditaruh
 * di satu blok `text/babel`, dan komponen `App` dirender di akhir blok yang
 * sama supaya `const App = ...` milik pengguna sudah terinisialisasi.
 */
export function buildReactAppSrcDoc(rawCode: string) {
  const code = stripModuleSyntax(rawCode.trim());

  return [
    "<!DOCTYPE html>",
    '<html lang="id">',
    "<head>",
    buildCspMeta(true),
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    baseStyle,
    errorBridgeScript,
    ...reactRuntimeScripts.map((src) => `<script src="${src}"></script>`),
    "</head>",
    "<body>",
    '<div id="root"></div>',
    '<script type="text/babel" data-presets="react">',
    "const { useState, useEffect, useRef, useMemo, useCallback, useReducer, Fragment } = React;",
    code,
    'if (typeof App === "undefined") {',
    '  throw new Error("Tidak ada komponen bernama App di artifact ini.");',
    "}",
    'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));',
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

export function buildMiniAppSrcDoc(runtime: "html" | "react", code: string) {
  return runtime === "react"
    ? buildReactAppSrcDoc(code)
    : buildHtmlAppSrcDoc(code);
}
