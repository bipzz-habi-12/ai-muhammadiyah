# AI Muhammadiyah — Konteks Proyek untuk Claude Code

## Ringkasan
Platform AI yang bisa dikustomisasi untuk belajar, bekerja, meneliti, dan membangun sistem, dengan fondasi nilai Islam Berkemajuan dan Muhammadiyah Knowledge Base. Sudah live di **aimuhammadiyah.my.id**. Proyek ini **bukan** dibangun dari nol — kode yang ada tetap dipakai, kita melakukan refactor & penambahan fitur besar di atasnya.

Target pengguna: Pelajar, Mahasiswa, Guru, Dosen, Peneliti, Developer, Organisasi, Sekolah, Rumah Sakit, Perusahaan, masyarakat umum. Platform terbuka untuk siapa saja, bukan hanya warga Muhammadiyah.

**Prinsip penting:** Ini bukan clone ChatGPT. Inti pengalaman adalah sistem **Workspace + Skill**.

## Stack Teknis
- **Frontend:** Next.js + Tailwind, deploy ke Vercel
- **Database:** Supabase (Auth, Chat history, Knowledge Base, Workspaces, Subscription, Memory)
- **AI Providers:** OpenAI GPT-5 mini, Gemini 2.5, OpenRouter (fallback) — smart routing, streaming, auto-fallback, vision, multimodal
- **Auth:** Email/Password + OTP email

## Fitur yang Sudah Ada (jangan dirusak saat refactor)
Chat AI, Streaming Response, Markdown, Math Rendering, Upload (PDF/DOCX/PPTX/XLSX/Images), Vision, Knowledge Base (RAG), Workspace, Pinned Chat, Search Chat, Recent Files, Study Modes, Memory, History, Subscription, Usage Tracking, Sidebar, Export Markdown, Share Preview, Continue Answer, Multi Upload, Image Analysis.

Belum dikerjakan (ditunda dulu): Voice Avatar, Marketplace GPT, Forum, Mobile App, Gamification, Learning Progress.

## Restrukturisasi Konsep (Sedang Dikerjakan)

### Migrasi 4 tools lama → 4 tools baru (UNIVERSAL, bukan cuma belajar)
| Lama (dibuang) | Baru | Alasan |
|---|---|---|
| Notes | **Docs** | Laporan, draft, ringkasan riset, dokumen bisnis |
| Quiz | **Tasks** | Action items/checklist dari percakapan — riset, proyek dev, planning bisnis |
| Flashcards | **Sheets** | Tabel data, analisis sederhana — peneliti, bisnis, finance |
| Mind Map | **Canvas** | Diagram umum: flowchart, arsitektur sistem, org chart |

### Workspace sebagai pusat
Setiap Workspace punya: Nama, Deskripsi, Icon, Color, Knowledge Sources, Memory, AI Persona, Skill, Chat + 4 tools (Docs/Tasks/Sheets/Canvas).

### Sistem Skill
- Skill mengubah fokus/perilaku AI (contoh: Software Engineering → fokus coding & arsitektur; Medical → terminologi medis & evidence-based; Islamic Studies → Quran/Hadith/Tarjih/HPT)
- **Skill terpisah dari Persona** (Persona = gaya bicara, diatur di halaman Personalization; Skill = fokus domain keahlian)
- Skill bisa bawaan platform atau custom buatan user — disimpan di **satu tabel yang sama**, dibedakan lewat `owner_id` (null = bawaan platform)
- Setiap kali Skill diganti di tengah workspace, sistem mencatat di `skill_change_log` dan menampilkan penanda transparan di histori chat

### Muhammadiyah Hub
Satu knowledge base terpusat (HPT, Tarjih, ISMUBA, Keputusan Muktamar, Pedoman Muhammadiyah) — bukan silo terpisah dari Skill "Islamic Studies". Workspace mana pun bisa "menyambung" ke sumber yang sama lewat tabel `hub_links`, tidak ada duplikasi data. **Selalu gratis di semua tier pricing.**

## Skema Database — KONDISI AKTUAL (hasil audit 9 file migration, Juli 2026)

**Koreksi dari draft awal:** Tabel `notes`, `quizzes`, `flashcard_decks`, `mindmaps` **tidak pernah ada** di migration maupun kode manapun — jadi ini BUKAN migrasi rename, melainkan pembangunan skema baru dari nol. Nama tabel workspace aktual adalah **`chat_workspaces`** (bukan `workspaces`), sudah punya FK dari `conversations.workspace_id` — jangan diganti nama, cukup di-extend via `ALTER TABLE`.

### Tabel yang SUDAH ADA (extend, jangan diganti nama/struktur inti)
```
chat_workspaces: id (PK), user_id (FK), name  -- versi ringan, akan di-ALTER tambah kolom
conversations: id (PK), workspace_id (FK -> chat_workspaces)
messages: id (PK), conversation_id (FK)
user_memory: key-value, di-key per USER (bukan per workspace)
knowledge_sources / knowledge_chunks: khusus file RAG, bukan tabel SOURCES generik
```
`study-modes.ts` (7 study mode hardcoded di `lib/`) adalah pendahulu informal sistem Skill — **akan digantikan penuh** oleh tabel `skills` (lihat Keputusan Scope).

### Tabel BARU yang akan dibuat
```
skills: id (PK), owner_id (FK auth.users, nullable = bawaan platform), name, category, system_prompt, is_custom (boolean), created_at, updated_at
docs: id (PK), workspace_id (FK chat_workspaces), title, content, source_ref (FK conversations, nullable), created_at, updated_at
tasks: id (PK), workspace_id (FK), title, tasks (jsonb), source_ref, created_at, updated_at
sheets: id (PK), workspace_id (FK), title, data (jsonb), source_ref, created_at, updated_at
canvases: id (PK), workspace_id (FK), title, nodes (jsonb), source_ref, created_at, updated_at
skill_change_log: id (PK), workspace_id (FK), skill_id (FK), conversation_id (FK, nullable), changed_at
```

### ALTER pada tabel existing
```sql
ALTER TABLE chat_workspaces
  ADD COLUMN icon text,
  ADD COLUMN color text,
  ADD COLUMN skill_id uuid REFERENCES skills(id),
  ADD COLUMN persona_config jsonb DEFAULT '{}'::jsonb;
```

### DITUNDA (di luar scope fase ini)
`hub_links` dan integrasi Muhammadiyah Hub — dikerjakan setelah 4 tools (Docs/Tasks/Sheets/Canvas) stabil. Jangan buat tabel ini dulu.

## Keputusan Scope (Juli 2026)
1. **study-modes.ts → digantikan penuh oleh tabel `skills`.** 7 study mode hardcoded perlu di-seed sebagai baris di `skills` (owner_id = null). Semua pemanggilan `study-modes.ts` di `lib/ai/chat.ts` dan `app/page.tsx` disesuaikan ke skema baru.
2. **UI Docs/Tasks/Sheets/Canvas: tab di dalam SPA existing (`app/page.tsx`)**, BUKAN routing App Router baru. Sitemap 13 halaman di Master Plan adalah visi jangka panjang, bukan target langsung fase ini.
3. **hub_links ditunda** — fokus dulu ke 4 tools inti.
4. `app/page.tsx` adalah monolith ~4600 baris — pertimbangkan ekstrak bagian besar jadi komponen terpisah sebelum menambah tab baru, supaya perubahan lebih terisolasi.

## Sitemap (13 Halaman)
| # | Halaman | Rute | Keterangan |
|---|---|---|---|
| 1 | Home (landing) | `/` | Halaman publik pertama |
| 2 | Login/Register | `/login`, `/register` | Password + OTP email |
| 3 | Workspace/Chat | `/workspace/[id]` | Halaman inti, paling kompleks |
| 4 | Docs | `/workspace/[id]/docs` | Bagian dari Workspace |
| 5 | Tasks | `/workspace/[id]/tasks` | Bagian dari Workspace |
| 6 | Sheets | `/workspace/[id]/sheets` | Bagian dari Workspace |
| 7 | Canvas | `/workspace/[id]/canvas` | Bagian dari Workspace |
| 8 | Muhammadiyah Hub | `/hub` | Knowledge base publik, akses tanpa workspace |
| 9 | Research | `/research` | Deep research mode berdiri sendiri |
| 10 | Library | `/library` | Agregasi semua item dari semua workspace |
| 11 | Personalization | `/settings/personalization` | Atur persona/gaya bicara AI |
| 12 | Pricing | `/pricing` | 4 tier |
| 13 | Settings | `/settings` | Profil, keamanan, notifikasi, billing, privasi, skill |

### Layout Halaman Chat (kunci arsitektur)
- Icon rail (paling kiri) → Workspace list sidebar → Area chat utama → Sidebar kanan **Knowledge** (kontekstual: sumber aktif workspace + link ke Muhammadiyah Hub)
- Top bar chat: nama workspace + badge Skill aktif + tab **Chat | Docs | Tasks | Sheets | Canvas**
- Gaya pesan AI: **tanpa bubble** (gaya Claude, bukan gaya ChatGPT)

## Pricing (4 Tier)
| Tier | Target | Harga | Fitur Kunci |
|---|---|---|---|
| Gratis | Adopsi massal | Rp0 | 1 workspace, ~30-50 pesan/hari, tools terbatas, Hub tanpa batas |
| Plus | Individu | ~Rp49-79rb/bulan | Workspace & chat tanpa batas, skill/persona custom, export, prioritas |
| Sekolah & Kampus | Institusi pendidikan | Harga khusus per-seat | Dashboard admin, knowledge base sekolah |
| Enterprise | RS, perusahaan | Kustom/quote | SSO, audit log, knowledge base organisasi |

## Alur Kerja Coding (Urutan Prioritas, revisi Juli 2026)
1. **Backup database Supabase** sebelum migration apa pun (kebiasaan baku, meski tidak ada data lama untuk dipindah)
2. **Migration SQL baru**: extend `chat_workspaces`, buat tabel `skills`, `docs`, `tasks`, `sheets`, `canvases`, `skill_change_log` — ikuti pola migration existing (RLS per user via join, trigger `set_updated_at`)
3. **Seed data `skills`** dari isi `study-modes.ts` (7 study mode jadi baris skill bawaan platform)
4. **Route handler + lib helper** untuk Docs/Tasks/Sheets/Canvas (`app/api/docs`, `app/api/tasks`, dst — mirror pola `app/api/knowledge/route.ts`)
5. **UI tab Docs/Tasks/Sheets/Canvas di `app/page.tsx`** (tab di SPA existing, bukan routing baru) — ekstrak komponen dulu kalau perlu untuk isolasi risiko
6. `npm run lint && npm run build` + smoke test manual (chat streaming, upload, RLS antar-user) setiap selesai satu tahap
7. **Muhammadiyah Hub linking (`hub_links`)** — DITUNDA, dikerjakan di fase berikutnya setelah 4 tools stabil
8. Halaman pendukung lainnya (Library, Personalization, Pricing, Settings) — belum diprioritaskan

## Aturan Kerja untuk Claude Code
- Kode yang sudah ada di aimuhammadiyah.my.id **tetap dipakai** — jangan membangun ulang dari nol
- Selalu cek `PROJECT_STATUS.md` dan `README.md` untuk info tambahan sebelum membuat perubahan besar
- Sebelum migrasi skema/data yang mengubah struktur database produksi, konfirmasi dulu ke user dan pastikan backup sudah dibuat
- Identitas visual: hijau Muhammadiyah sebagai warna primer, putih, aksen emas/gold hangat, gaya modern-minimalis (gabungan Claude/Linear/Notion/NotebookLM/Perplexity), rounded corners, tanpa gradient