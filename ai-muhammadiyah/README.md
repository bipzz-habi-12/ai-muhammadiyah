# AI Muhammadiyah

Platform AI untuk belajar, meneliti, dan bekerja, dengan fondasi nilai Islam
Berkemajuan. Live di [aimuhammadiyah.my.id](https://aimuhammadiyah.my.id).

Next.js + Supabase. Untuk konteks arsitektur lengkap lihat `CLAUDE.md`;
riwayat keputusan teknis ada di `MIGRATION_PROGRESS.md`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Supabase Chat History

Persistent chat history needs the Supabase schema in
`supabase/migrations/20260530000000_chat_history.sql`.

Apply it with one of these options:

```bash
supabase db push
```

Or open the Supabase dashboard, go to SQL Editor, paste the migration contents,
and run it once for the project.

The migration creates:

- `conversations`, owned by `auth.users.id`
- `messages`, linked to `conversations`
- indexes for recent sidebar history and message loading
- Row Level Security policies so authenticated users can only read, create,
  update, or delete their own conversations and messages

## Otak Kedua (Second Brain)

Catatan pribadi yang **hidup lintas percakapan**. Berbeda dari riwayat chat
yang mati bersama percakapannya, catatan di sini dicari secara semantik dan
disuntikkan ke tiap jawaban AI — jadi percakapan bulan lalu bisa menjawab
pertanyaan hari ini.

Tiga hal yang membedakannya dari sekadar "AI yang mengingat":

- **Kamu yang memutuskan apa yang disimpan.** AI mengusulkan catatan lewat chip
  tenang di bawah jawaban; tidak ada yang tersimpan tanpa klik eksplisit.
- **Catatan itu milikmu, bukan milik platform.** Lewat jembatan Logseq, catatan
  hidup sebagai berkas markdown biasa di folder sendiri, sinkron dua arah.
  Berhenti memakai platform ini kapan saja tanpa kehilangan apa pun.
- **Agen lain bisa memakainya.** Hermes Agent (atau klien MCP mana pun) bisa
  mencari, membaca, dan menulis catatan yang sama.

Antarmukanya di **Library → tab Catatan**.

### Setup

Migrasi yang harus di-apply (`supabase/migrations/`):

| Berkas | Isi |
|---|---|
| `20260806000000_second_brain_notes.sql` | `notes`, `note_chunks`, `note_links` + RPC `search_notes` |
| `20260807000000_second_brain_sync.sql` | Token perangkat, buku besar idempotensi, nisan penghapusan |
| `20260807010000_fix_note_deletion_on_user_delete.sql` | Perbaikan: hapus akun gagal karena trigger nisan |
| `20260807020000_sync_rate_limit.sql` | Kuota sinkronisasi per paket |
| `20260808000000_search_notes_for_user.sql` | Pencarian untuk jalur token (MCP) |

Environment variable:

```
OPENAI_API_KEY_EMBED=sk-...
OPENAI_EMBED_MODEL=text-embedding-3-small   # opsional, ini bawaannya
```

Tanpa `OPENAI_API_KEY_EMBED`, fitur tetap jalan — pencarian jatuh ke full-text
saja, tidak mati total. Dimensi `1536` **terikat** ke kolom `vector(1536)`:
ganti model embedding berarti ubah kolom dan embed ulang semua catatan.

### Sinkron dengan Logseq

Menyentuh berkas markdown langsung, jadi **tidak butuh HTTP API Logseq** dan
tetap bekerja walau aplikasi Logseq sedang tertutup.

1. Buat token di **Library → Catatan → Perangkat tersambung → Tambah perangkat**.
   Token hanya tampil sekali — server menyimpan hash-nya saja.
2. Simpan token sebagai environment variable (jangan ditulis di argumen
   perintah; argumen terlihat di daftar proses dan tersimpan di riwayat shell):

   ```bash
   export AIMU_SYNC_TOKEN="aimu_sync_..."        # macOS/Linux
   $env:AIMU_SYNC_TOKEN="aimu_sync_..."          # Windows PowerShell
   ```
3. Jalankan jembatannya:

   ```bash
   node scripts/logseq-bridge.mjs --graph "path/ke/graf-logseq" --interval 300
   ```

Flag: `--graph` (wajib), `--interval` detik (tanpa ini jalan sekali lalu
berhenti), `--api` (bawaan `https://aimuhammadiyah.my.id`), `--dry-run`.

**Konflik ditangani tanpa menghilangkan tulisan.** Kalau sebuah catatan berubah
di kedua sisi, berkas lokal **tidak** ditimpa — versi server disimpan
berdampingan sebagai `<nama>.server.md` supaya bisa dibandingkan. Penghapusan
menyebar dua arah lewat nisan, jadi halaman yang dihapus tidak hidup kembali.

Impor/ekspor manual juga tersedia di tab Catatan (`.md` masuk, `.zip` keluar)
kalau tidak ingin menjalankan skrip sama sekali.

### Pakai dari Hermes Agent

[Hermes Agent](https://github.com/NousResearch/hermes-agent) adalah agen CLI
yang mendukung MCP. Otak Kedua diekspos sebagai MCP server sehingga Hermes bisa
memakainya sebagai alat.

Tambahkan ke `~/.hermes/config.yaml` (di Windows: `%LOCALAPPDATA%\hermes\config.yaml`):

```yaml
mcp_servers:
  otak_kedua:
    command: "node"
    args:
      - "path/ke/scripts/hermes-mcp-server.mjs"
    env:
      AIMU_SYNC_TOKEN: "${env:AIMU_SYNC_TOKEN}"
      AIMU_SYNC_API: "https://aimuhammadiyah.my.id"
```

Token yang sama dipakai jembatan Logseq maupun Hermes. Verifikasi dengan
`hermes mcp test otak_kedua` — harus melaporkan 4 alat: `search_notes`,
`get_note`, `recent_notes`, `save_note`.

### Batas per paket

Tiap catatan yang masuk memicu satu panggilan embedding, jadi yang dibatasi
adalah biayanya — bukan pemakaian wajar. Sinkronisasi tiap 5 menit hanya
memakai 12 dari 60 jatah permintaan paket Gratis.

| Paket | Catatan/hari | Permintaan/jam |
|---|---|---|
| Gratis | 300 | 60 |
| Kader Pintar | 1.500 | 180 |
| Muallim Pro | 6.000 | 600 |
| Dakwah Digital | 20.000 | 1.200 |
| Sinergi Ranting | 60.000 | 2.400 |

### Catatan untuk pengembang

- **Rute sync memakai service role yang melewati RLS.** Pemisahan data
  antar-pengguna sepenuhnya bergantung pada filter `user_id` yang diturunkan
  dari token perangkat — tidak pernah dari body permintaan. Ini titik paling
  rawan di fitur ini; jangan pernah menerima `user_id` dari klien.
- `search_notes` biasa menyaring dengan `auth.uid()` dan **selalu kosong** di
  jalur token (tidak ada sesi). Varian `search_notes_for_user` yang dipakai di
  sana `security definer` dan di-`revoke` dari peran `anon`/`authenticated`.
- Semua penerjemahan format Logseq tinggal di server
  (`lib/second-brain/logseq.ts`). Skrip agen mengirim isi berkas **mentah**
  supaya tidak ada salinan kedua logika konversi yang lambat laun menyimpang.
- `eventId` pada push **diturunkan dari isi batch**, bukan acak — kalau acak,
  buku besar idempotensi tidak pernah mengenali kiriman ulang.
- **Tidak diterjemahkan** dari Logseq: `((block-ref))` (kita tidak punya
  identitas per-blok), `{{embed}}`/`{{query}}`, dan `journals/` diperlakukan
  sama seperti halaman biasa. `[[wikilink]]` dan `#tag` dipertahankan utuh.
- Konflik memakai last-write-wins berbasis waktu modifikasi berkas, jadi jam
  mesin yang meleset jauh bisa membuat kiriman kalah — konfliknya dilaporkan,
  tidak ditelan diam-diam.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
