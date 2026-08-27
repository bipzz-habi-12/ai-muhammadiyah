# M-Agent — Konteks Proyek untuk Claude Code

> **Nama produk = M-Agent** (sejak Langkah 44, Agustus 2026). Nama lama "AI Muhammadiyah" **tidak boleh dipakai lagi** untuk menyebut produk. Aturan yang mengikat setiap perubahan berikutnya:
> - **"Muhammadiyah" = rujukan isi, bukan nama produk dan bukan klaim afiliasi.** Tetap dipakai untuk Muhammadiyah Hub, Muhammadiyah Knowledge Base, manhaj/Tarjih, dan "otoritas Muhammadiyah tepercaya" di prompt.
> - **Jangan pernah menulis copy yang menyiratkan produk ini kanal resmi Persyarikatan.** M-Agent adalah produk independen yang *menjawab berdasarkan* rujukan Muhammadiyah. Kalimat non-afiliasi wajib tetap ada di footer landing dan halaman `/hub`.
> - Identifier internal **sengaja masih memakai nama lama** dan bukan bug: `package.json` name, folder repo, domain `aimuhammadiyah.my.id`, env `AIMU_SYNC_TOKEN`/`AIMU_SYNC_API`, prefix token `aimu_sync_`, id produk Stripe `aimu_plan_*`, dan key `localStorage` `ai-mu-*`. Jangan diganti tanpa permintaan eksplisit user.

> **Mengikuti Master Plan v2 (Juli 2026).** v2 menggantikan rencana lama "4 tools kaku" (Docs/Tasks/Sheets/Canvas) dengan sistem **Artifacts + Skill via slash command + banyak chat per workspace**. Kalau ada dokumen/kode lama yang masih menyebut Docs/Tasks/Sheets/Canvas sebagai arah pengembangan, itu **sudah usang** — lihat bagian "Status v1 yang Deprecated" di bawah.

## Ringkasan
Platform AI yang bisa dikustomisasi untuk belajar, bekerja, meneliti, membangun sistem, dan membantu berbagai bidang, dengan fondasi nilai Islam Berkemajuan dan Muhammadiyah Knowledge Base. Sudah live di **aimuhammadiyah.my.id**. Proyek ini **bukan** dibangun dari nol — kode yang ada tetap dipakai sebagai basis, kita melakukan refactor & penambahan fitur besar di atasnya.

Target pengguna: Pelajar, Mahasiswa, Guru, Dosen, Peneliti, Developer, Organisasi, Sekolah, Rumah Sakit, Perusahaan, masyarakat umum. Platform terbuka untuk siapa saja, bukan hanya warga Muhammadiyah.

**Prinsip penting:** Ini bukan clone ChatGPT. Inti pengalaman adalah **Workspace + Chat + Skill (slash) + Artifacts**.

## Stack Teknis
- **Frontend:** Next.js + Tailwind, deploy ke Vercel
- **Database:** Supabase (Auth, Chat history, Knowledge Base, Workspaces, Subscription, Memory)
- **AI Providers:** OpenAI **GPT-5.6 Terra** (model utama, `OPENAI_MODEL`), Gemini 2.5, OpenRouter (fallback). **Urutan routing: GPT-5.6 Terra dulu → Gemini → OpenRouter, untuk SEMUA rute (`fast`/`smart`/`document`) dan SEMUA tier termasuk Free** (lihat `lib/ai/chat.ts`, Langkah 35 di `MIGRATION_PROGRESS.md`). Streaming, auto-fallback, vision, multimodal.
- **Auth:** Email OTP (6 digit) + OAuth Google & GitHub lewat Supabase (`supabase.auth.signInWithOAuth`, callback di `app/auth/callback/route.ts`). Password belum dibangun.
- **Web search (Langkah 48):** `streamChatReply` (`lib/ai/chat.ts`) mendeteksi pertanyaan time-sensitive lewat heuristik `needsWebSearch()` dan — HANYA untuk pesan itu — **melompati urutan GPT-dulu** dan langsung memanggil Gemini dengan tool `google_search`. Ini satu-satunya pengecualian terdokumentasi terhadap aturan routing "GPT-5.6 Terra dulu untuk SEMUA rute/tier" di atas: OpenAI Responses API di sini tidak punya tool pencarian langsung, Gemini punya. Sumber (URL redirect Google + judul = nama domain saja, lihat `lib/web-search.ts`) dibawa lewat marker `[[AI_MU_SOURCES]]...[[/AI_MU_SOURCES]]` yang ditempel SERVER (bukan AI) di akhir stream — pola yang sama dengan marker artifact/note, jadi **tidak perlu kolom DB baru**.
- **AI bertanya balik (Langkah 52):** kalau permintaan pengguna bercabang dan menebak salah akan membuang pekerjaan, AI menutup balasannya dengan blok `[[AI_MU_ASK]]...[[/AI_MU_ASK]]` berisi satu baris JSON pertanyaan + pilihan; `components/AskUserQuestion.tsx` merendernya jadi kartu pilihan dan jawaban pengguna dikirim sebagai pesan biasa. Ditulis MODEL (beda dari `[[AI_MU_SOURCES]]` yang ditempel server), jadi `lib/ask-user.ts` yang memvalidasi & membatasi isinya. **Sengaja bukan tool `tanya_pengguna`**: jalur tool cuma hidup di Gemini + pemicu `needsWebSearch`, dan executor tool tidak bisa menunggu manusia tanpa menggantung stream sampai timeout Vercel. Aturan promptnya di `clarifyingQuestionSystemPrompt` (`lib/ai/chat.ts`) — di situ pula tempat mengetatkan/melonggarkan seberapa sering AI bertanya. **Giliran yang cuma bertanya dibebaskan dari meteran kuota** (Langkah 52a): kuota dihitung per-TOKEN dari seluruh riwayat, jadi tanpa pembebasan ini pengguna membayar dua kali untuk satu hasil. Keputusannya diambil di server dari teks balasan model (`isClarifyingQuestionOnlyReply` + cek artifact di `app/api/chat/route.ts`) — **jangan pernah** memindahkannya ke flag yang dikirim klien, itu membuka bypass kuota.

## Fitur yang Sudah Ada (jangan dirusak saat refactor)
Chat AI, Streaming Response, Markdown, Math Rendering, Upload (PDF/DOCX/PPTX/XLSX/Images), Vision, Knowledge Base (RAG), Workspace, Pinned Chat, Search Chat, Recent Files, Study Modes, Memory, History, Subscription, Usage Tracking, Sidebar, Export Markdown, Share Preview, Continue Answer, Multi Upload, Image Analysis.

Belum dikerjakan (ditunda dulu): Voice Avatar, Marketplace GPT, Forum, Mobile App, Gamification, Learning Progress.

---

## Status v1 yang Deprecated (PENTING — baca sebelum menyentuh 4 tools)

Rencana lama membangun 4 halaman/tab kaku: **Docs, Tasks, Sheets, Canvas**. Master Plan v2 **menghapus total** keempatnya dan menggantinya dengan sistem **Artifacts** (satu sistem fleksibel, AI yang menentukan bentuk output). Kondisi kode saat ini:

- **Sudah terlanjur dibangun & sebagian di `main`:** Docs & Tasks sudah di-merge ke `main` (tabel `docs`, `tasks` + route `app/api/docs`, `app/api/tasks` + komponen `DocsPanel`/`TasksPanel`). Sheets & Canvas ada di branch `feature/four-tools-integration` (belum di-merge, belum production).
- **Keputusan:** kode 4 tools ini **DEPRECATED oleh v2**. **JANGAN** merge `feature/four-tools-integration` ke production sebagai fitur final, dan **jangan** bangun fitur baru di atas Docs/Tasks/Sheets/Canvas. Nasib akhir kode itu (dihapus / dijadikan basis migrasi ke Artifacts) adalah keputusan terpisah — belum diputuskan, jangan diasumsikan.
- **Yang tetap dipakai dari kerja itu:** perbaikan `lib/ai/chat.ts` (routing GPT-first, deteksi provider-outage `isAiUnavailableFallback`, reasoning effort per jenis panggilan) tetap relevan dan tetap dipakai di v2.

---

## Sistem v2 (arah pengembangan sekarang)

### A. Anatomi Workspace (BERUBAH)
- **1 Workspace = banyak Chat** (dulu 1 workspace = 1 chat). User menyimpan beberapa percakapan berbeda dalam satu workspace.
- **Workspace System** — instruksi permanen (system prompt) level-workspace yang berlaku ke **semua** chat di dalamnya. Contoh: *"Selalu jawab evidence-based dan sertakan referensi jurnal."* Disimpan di `workspaces.system_instructions`.
- Semua chat mewarisi Workspace System yang sama, tapi tiap chat bisa punya topik & skill aktif berbeda.

### B. Sistem Skill via slash command (BERUBAH)
- Skill = template fokus domain (Software Engineering, Medical, Islamic Studies, dst) — bawaan platform atau custom buatan user.
- **Diaktifkan per-pesan lewat `/`**: ketik `/` di awal pesan → muncul picker (ikon + nama + `slash_command`) → pilih → skill berlaku untuk pesan itu. Bukan lagi badge permanen di workspace.
- Tiap skill punya `slash_command` unik (mis. `/coding`, `/riset`, `/tarjih`).
- User bisa membuat skill custom: nama, kategori, instruksi, dan slash command pilihan.
- Skill aktif dicatat langsung di `messages.skill_id` — **tidak** perlu tabel `skill_change_log` terpisah.

### C. Sistem Artifacts (BARU — inti perubahan v2)
Artifact = hasil kerja substansial yang muncul otomatis di **panel samping kanan** saat AI membuat sesuatu. **AI yang menentukan bentuknya**, bukan user memilih tipe halaman dulu. Tersimpan otomatis, bisa dicari lagi di halaman Library.

4 kategori:
| Kategori | Contoh | Render |
|---|---|---|
| **Dokumen & data** | Laporan, ringkasan, tabel | Rich text viewer / grid editor |
| **Visual** | Diagram, mockup, chart | SVG/canvas viewer (bisa zoom) |
| **Kode** | Snippet, script, function | Syntax-highlighted viewer + copy/download |
| **Mini aplikasi** | Game, kalkulator, tool interaktif, prototype UI | **Sandboxed iframe** — HTML/CSS/JS atau React live preview |

**Mini aplikasi = komponen paling berisiko (keamanan). Wajib:**
- Render di dalam `<iframe sandbox="allow-scripts">` yang terisolasi dari halaman utama (tidak bisa akses cookie/session di luar iframe).
- CDN allowlist untuk resource eksternal — jangan izinkan iframe memanggil domain sembarangan.
- Pola sama seperti Artifacts di Claude — bukan hal baru dari nol, tapi **butuh implementasi serius**, bukan sekadar `dangerouslySetInnerHTML`.
- **Riset teknis sandboxing dulu sebelum coding kategori ini.** Kerjakan paling akhir.

### D. Komposisi konteks tiap respons AI
AI selalu menggabungkan 3 lapis: **Workspace System** (permanen) + **Skill aktif** (opsional, per-pesan via `messages.skill_id`) + **riwayat chat** itu sendiri.

---

## Skema Database v2

### Kondisi aktual sekarang (yang sudah ada di production)
```
chat_workspaces : id (PK), user_id (FK), name, icon, color, skill_id, persona_config
                  (catatan: nama tabel workspace AKTUAL = chat_workspaces, bukan workspaces — jangan diganti nama)
conversations   : id (PK), workspace_id (FK -> chat_workspaces), title, ...
messages        : id (PK), conversation_id (FK), role, content, ...
skills          : id (PK), owner_id (nullable = bawaan platform), name, category, system_prompt, is_custom
user_memory     : key-value per USER
knowledge_sources / knowledge_chunks : file RAG
-- DEPRECATED (dibuat untuk v1, jangan dikembangkan): docs, tasks, sheets, canvases, skill_change_log
```

### Target v2 (migrasi berikutnya — konfirmasi + backup dulu sebelum apply)
- **`chat_workspaces`**: tambah `system_instructions text` (Workspace System).
- **`messages`**: tambah `skill_id uuid (FK skills, nullable)` — skill aktif per pesan.
- **`skills`**: tambah `slash_command text unik`.
- **Tabel `artifacts` BARU** (menggantikan docs/tasks/sheets/canvases):
  ```
  artifacts: id (PK), conversation_id (FK), type (document|table|diagram|code|html_app|react_app|...),
             title, content (jsonb), runtime (nullable: 'html'|'react'|null → penanda butuh sandboxed iframe),
             created_at, updated_at
  ```
- **Hapus (setelah migrasi Artifacts stabil):** `docs`, `tasks`, `sheets`, `canvases`, `skill_change_log`.
- RLS tetap pola lama: kepemilikan lewat join ke `chat_workspaces.user_id = auth.uid()`, trigger `set_updated_at`.
- `hub_links` (integrasi Muhammadiyah Hub) tetap **DITUNDA** sampai Artifacts inti stabil.

---

## Sitemap v2 (10 Halaman)
| # | Halaman | Rute contoh | Catatan |
|---|---|---|---|
| 1 | Home | `/` | Tanpa sesi login: rewrite (di `proxy.ts`) ke `app/home/page.tsx` (Landing/marketing) — URL tetap `/`. Dengan sesi login: langsung tampil chat (`app/page.tsx`), tidak berubah |
| 2 | Login/Register | `/login`, `/register` | Tidak berubah |
| 3 | Workspace | `/workspace/[id]` | **Baru**: daftar chat + akses Workspace System, bukan langsung ke satu chat |
| 4 | Chat | `/workspace/[id]/chat/[chatId]` | **Berubah**: banyak chat per workspace; panel Artifact di kanan; slash picker skill |
| 5 | Muhammadiyah Hub | `/hub` | Tidak berubah — knowledge base publik, gratis semua tier |
| 6 | Research | `/research` | Tidak berubah |
| 7 | Library | `/library` | **Berubah**: agregasi Artifacts (filter: Semua/Dokumen/Visual/Kode/Mini aplikasi), bukan Docs/Tasks/Sheets/Canvas |
| 8 | Personalization | `/settings/personalization` | Tidak berubah |
| 9 | Pricing | `/pricing` | Struktur sama, istilah fitur disesuaikan ke Artifacts |
| 10 | Settings | `/settings` | Tab "Skill saya" menampilkan `slash_command` tiap skill + form buat skill (dengan field slash command) |

**Dihapus dari v1:** halaman Docs, Tasks, Sheets, Canvas — melebur ke Artifacts di dalam Chat.

### Layout Halaman Chat (kunci arsitektur v2)
- Icon rail (kiri) → sidebar daftar workspace → area chat utama → **panel Artifact (kanan)** yang muncul otomatis saat AI menghasilkan artifact.
- Panel Artifact: untuk tipe kode/aplikasi ada tab kecil "Preview" & "Kode"; untuk `html_app`/`react_app` tampilkan iframe sandboxed dengan live preview.
- Sidebar Knowledge (sumber + link Hub) bisa di-collapse saat panel Artifact terbuka supaya tidak sempit.
- Input: ketik `/` → dropdown picker skill (filter saat mengetik).
- Gaya pesan AI: **tanpa bubble** (gaya Claude, bukan ChatGPT).

---

## Pricing (4 Tier) — struktur tetap, istilah disesuaikan
| Tier | Harga | Fitur kunci |
|---|---|---|
| Gratis | Rp0 | 1 workspace, ~30-50 pesan/hari, Artifact terbatas/bulan, Hub tanpa batas, skill bawaan saja |
| Plus | ~Rp49-79rb/bulan | Workspace & chat tanpa batas, Artifact tanpa batas, skill custom tanpa batas, export artifact |
| Sekolah & Kampus | Harga khusus per-seat | Dashboard admin, knowledge base sekolah |
| Enterprise | Kustom | SSO, audit log, knowledge base organisasi |

Muhammadiyah Hub tetap gratis di semua tier.

**Pembayaran (Langkah 38):** semua tier berbayar dijual lewat **Stripe Checkout (hosted)** + **Billing Portal** — lihat `app/api/billing/*`, `lib/subscriptions/stripe.ts` (server-only, menyentuh secret key), `lib/subscriptions/stripe-sync.ts`, dan `lib/subscriptions/billing.ts` (client-safe, tanpa SDK/env server). Aturan yang tidak boleh dilanggar saat menambah UI pembayaran:
- Keputusan tombol paket **selalu** lewat `resolveBillingAction()`; jangan menulis cabang checkout/portal sendiri.
- User yang **sudah** punya langganan aktif **tidak boleh** diarahkan ke Checkout (itu membuat langganan kedua yang ikut ditagih) — pakai `/api/billing/change-plan`.
- Status langganan hanya boleh ditulis lewat `apply_stripe_subscription` (service role), dipicu webhook bertanda tangan. Jangan pernah menaikkan tier dari input client.
- Harga: `plans.ts` `priceIdr` adalah sumber kebenaran. **IDR bukan zero-decimal** di Stripe (Rp29.000 → `2900000`).
- Selama `STRIPE_SECRET_KEY` kosong, semua CTA bayar wajib tetap mati ("Segera hadir").

---

## Urutan Kerja Coding v2 (prioritas)
1. **Backup database Supabase** sebelum migration apa pun.
2. **Migration v2**: tambah `workspaces.system_instructions`, `messages.skill_id`, `skills.slash_command`; buat tabel `artifacts`. (Hapus `docs/tasks/sheets/canvases/skill_change_log` **belakangan**, setelah Artifacts stabil.)
3. **Workspace multi-chat**: halaman Workspace (daftar chat) + editor Workspace System.
4. **Chat + slash skill picker**: ketik `/` → picker skill → simpan `messages.skill_id`; komposisi 3-lapis konteks (Workspace System + Skill + history).
5. **Artifacts dasar dulu**: Dokumen → Tabel → Visual (yang tidak eksekusi kode). Panel Artifact + simpan ke `artifacts` + tampil di Library.
6. **Mini aplikasi (paling akhir)**: riset sandboxing iframe dulu → HTML app → React app.
7. `npm run lint && npm run build` + smoke test manual (chat streaming, upload, RLS antar-user, slash picker, render artifact) tiap selesai satu tahap.
8. Muhammadiyah Hub linking (`hub_links`) — tetap DITUNDA sampai Artifacts inti stabil.

---

## Aturan Kerja untuk Claude Code
- Kode yang sudah ada di aimuhammadiyah.my.id **tetap dipakai** sebagai basis — jangan bangun ulang dari nol.
- Selalu cek `PROJECT_STATUS.md` dan `README.md` untuk info tambahan sebelum perubahan besar.
- Sebelum migrasi skema/data yang mengubah struktur database produksi, **konfirmasi dulu ke user dan pastikan backup sudah dibuat**.
- **Jangan** kembangkan fitur baru di atas Docs/Tasks/Sheets/Canvas (deprecated) — arahkan ke sistem Artifacts.
- **Identitas visual (Design v2 — SUDAH diterapkan app-wide, lihat `MIGRATION_PROGRESS.md` Langkah 27):** base cream `#F5F3EC`, surface `#FBFAF6` / panel `#F7F5EE`, hijau Muhammadiyah `#0F5A3D` (primer) + `#0B3D2A` (rail/dalam) + `#0A3D2A` (hover), aksen emas `#E7C77E`/`#B08833`/`#C7A560`, ink `#16211C`/`#25302A`, muted `#7C857F`/`#8A9089`, hairline `rgba(20,40,30,0.1)`. Font **Hanken Grotesk** untuk UI (`font-sans`) + **Newsreader** serif untuk heading & voice formal (`font-serif`) — dimuat via Google Fonts `<link>` di `app/layout.tsx`, token di `app/globals.css`. Rounded corners konsisten, border tipis, tanpa gradient/shadow tebal. Gaya gabungan Claude/Linear/Notion/NotebookLM/Perplexity. **Saat menambah UI baru, ikuti palet & font ini** (jangan pakai palet lama `#004d27`/`#f8f9fa`/`#191c1d`/`#bec9be` — sudah usang). Ke-10 layar desain sudah diport; sisa pekerjaan UI = backlog di Langkah 27.
- **Cara memakai palet itu diperketat di Langkah 53 ("premium") — ini yang mengikat sekarang, bukan sekadar daftar warnanya:**
  - **Hijau hanya untuk yang bisa diklik atau aktif.** Sidebar dan rail netral (`--surface-panel`), bukan hijau tua penuh. Idealnya **satu** tombol berisi hijau per layar (di chat: tombol Kirim). `--brand-deep` sekarang praktis hanya untuk mode gelap, bukan lagi latar rail.
  - **Emas = penanda status** (kunci tier, "Segera hadir", peringatan kuota/konteks). Bukan avatar, bukan chip aksi, bukan CTA.
  - **Skala terkunci:** radius 10/12/16px + full; teks 11.5/12.5/13.5/15/17px + serif untuk heading; `font-medium`/`font-semibold` (hindari `font-bold` untuk label sekunder); target sentuh minimal 44px.
  - **Mobile wajib punya jalan keluar.** Tiap halaman ber-shell memasang `<BottomNav />`; shell desktop `hidden md:flex`. Jangan bikin halaman ber-shell tanpa nav bawah.
  - **Popover composer: arah menu ikut varian** (`welcome` ke bawah, `active` ke atas) — lihat jebakan di Langkah 53 sebelum menyeragamkannya.
