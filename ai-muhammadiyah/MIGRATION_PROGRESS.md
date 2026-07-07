# Migrasi `app/page.tsx` ke Custom Hooks — Progress

## Konteks

`app/page.tsx` adalah monolith SPA chat (awalnya **4734 baris**, sekarang **3641 baris**). Migrasi ini adalah persiapan sebelum mengganti UI-nya ke desain baru dari Stitch (lihat `stitch-reference/`) — tujuannya supaya saat desain visual diganti nanti, logic/state sudah terisolasi di hooks dan tidak ikut berantakan bareng JSX.

Pendekatan: ekstrak **satu hook per langkah**, kecil dan aman, bukan big-bang refactor.

Analisis arsitektur awal (peta lengkap semua state/fungsi sebelum migrasi dimulai) ada di riwayat percakapan sesi sebelumnya — dokumen ini fokus ke **status & rencana**, bukan mengulang analisis itu.

## Status: Langkah 1–5 SELESAI (sudah di-test manual + commit)

| # | Commit | Isi |
|---|---|---|
| 1 | `a986e16` Extract pure helpers from page.tsx to lib/ and components/ | Helper murni tanpa React state dipindah ke `lib/mappers/` (types, legacy-study-mode, workspace, conversation, message), `lib/chat/` (attachments, errors, selection-labels), `lib/formatting/` (math.tsx, markdown.tsx, text.ts), `components/icons.tsx` (SparkIcon, Icon), `components/MarkdownMessage.tsx`. Dead code `formatMathLikeText`/`formatMathLikeTextV2` **dihapus** (bukan dipindah). `fetchUsageSnapshot` masuk ke `lib/usage/limits.ts`, `fetchKnowledgeSources` masuk ke `lib/knowledge.ts` (extend file lama, bukan file baru). |
| 2 | `27cd0ab` Extract useAuthSession hook | `hooks/useAuthSession.ts` — state `userId`, `userEmail`, `isLoggingOut` + fungsi `handleLogout`. Effect get-user-or-redirect-to-login pindah ke hook; effect pemanggilan 5 loader (`loadWorkspaces`, `loadConversations`, `loadUsage`, `loadLearningProfile`, `loadSkills`) **tetap di `page.tsx`**, sekarang di-trigger oleh `useEffect(..., [userId, ...])` terpisah. |
| 3 | `7df0e2b` Extract useWorkspaces hook | `hooks/useWorkspaces.ts` — state `workspaces`, `selectedWorkspaceId`, `newWorkspaceName`, `isCreatingWorkspace` + fungsi `loadWorkspaces`, `createWorkspace`. Menerima `setHistoryError` sebagai parameter callback (bukan hook error sendiri). |
| 4 | `8763060` Extract useKnowledgeBase hook | `hooks/useKnowledgeBase.ts` — 8 state knowledge (`knowledgeSources`, `isKnowledgeAdmin`, `isLoadingKnowledge`, `isUploadingKnowledge`, `knowledgeTitle`, `knowledgeCategory`, `knowledgeMessage`, `knowledgeError`) + `hasLoadedKnowledgeRef` + fungsi `loadKnowledge`, `handleKnowledgeUpload`. Effect lazy-load (trigger saat tab Settings > Knowledge Base dibuka) **tetap di `page.tsx`** karena depend ke `activeSettingsTab`/`isSettingsOpen` (domain settings-shell, belum diekstrak) — hook cuma expose `loadKnowledge`, `isLoadingKnowledge`, `hasLoadedKnowledgeRef`. |
| 5 | `bafe39a` Extract useUsage hook | `hooks/useUsage.ts` — state `usageSnapshot`, `usageError` + fungsi `loadUsage` + derived `currentTierLabel`, `allowedModels`, `currentPlan`, `hasMessageQuota`, `hasUploadQuota`. Ketiga call site `loadUsage()` (initial load, setelah upload dokumen, setelah `sendMessage` selesai) **tetap di `page.tsx`**, tidak berubah. `loadLearningProfile`/`saveLearningProfile` **sengaja tidak diikutkan** — meski keduanya juga menulis balik ke `selectedModel`/`selectedSkillId`, itu berdasarkan `learningProfile` (data preferensi tersimpan), bukan status kuota/tier, jadi tetap domain `useUserMemory` (langkah 8). Kopling ke `selectedModel`/`selectedSkillId` diselesaikan dengan hook menerima `skillsRef`, `setSelectedModel`, `setSelectedSkillId` sebagai parameter (bukan import hook lain) — lihat catatan kopling di bawah. |

Semua langkah di atas: `tsc --noEmit` bersih, `npm run build` sukses, `npm run lint` bersih, dan sudah di-test manual di browser (login/logout, buat workspace baru, upload & hapus knowledge source test, dan untuk langkah 5: badge tier, pengurangan kuota pesan/upload harian, tombol disable saat kuota habis, auto-reset model di luar allowed list, tampilan tab Settings > Subscription).

## Sisa Langkah 6–12 (urutan disepakati, belum dikerjakan)

Urutan ini sengaja menaruh hook yang **paling sedikit bergantung ke hook lain** duluan, dan `useChatSession` (paling gemuk & paling banyak dependency) di posisi kedua-dari-akhir.

### 6. `useSkills(tier)`
- State: `skills`, `skillsLoading`, `selectedSkillId`, ref `skillsRef`
- Fungsi: `loadSkills`, `selectSkill`
- Effect yang ikut pindah: fallback pilih skill pertama saat `skills` termuat tapi belum ada yang terpilih; sync `skillsRef.current = skills`; persist `selectedSkillId` ke `localStorage` key `ai-mu-study-mode`
- Derived: `selectedSkill`, `selectedSkillBadge`
- Terima `tier` (dari `useUsage`, yaitu `usageSnapshot?.tier`) sebagai parameter untuk `canAccessTier`/`resolveAllowedSkill`
- `selectSkill` butuh `router.push("/plans")` untuk redirect kalau skill terkunci — `router` tetap dari `useRouter()` biasa di dalam hook.
- ⚠️ **Urutan pemanggilan hook berubah di langkah ini.** Setelah `useUsage` (langkah 5) sudah jadi, ia menerima `skillsRef` & `setSelectedSkillId` sebagai parameter dari `page.tsx`. Begitu `skillsRef`/`selectedSkillId`/`setSelectedSkillId` pindah ke dalam `useSkills`, urutan pemanggilan di `page.tsx` harus jadi: **panggil `useSkills()` dulu**, baru oper `skillsRef` & `setSelectedSkillId` hasil return-nya sebagai argumen ke `useUsage(...)` — kebalikan dari urutan "yang di-consume duluan dipanggil duluan" yang biasanya dipakai. Jangan lupa update argumen pemanggilan `useUsage(...)` di `page.tsx` supaya tidak lagi memakai `skillsRef`/`setSelectedSkillId` versi lokal punya page.tsx (karena sudah tidak ada di sana).

### 7. `useModelSelection(allowedModels)`
- State: `selectedModel`, `isModelMenuOpen`, `isUpgradeOpen`, `upgradeTargetModel`
- Fungsi: `selectModel`, `openUpgradeModal`
- Terima `allowedModels` (dari `useUsage`) sebagai parameter

### 8. `useUserMemory(userId, skills)`
- State: `learningProfile`, `profileDraft`, `favoriteSubjectsDraft`, `isSavingProfile`, `profileError`, `profileSavedMessage`
- Fungsi: `loadLearningProfile`, `updateProfileDraft`, `saveLearningProfile`
- Effect yang ikut pindah: sync `document.documentElement.dataset.theme = learningProfile.themePreference`
- ⚠️ `loadLearningProfile` & `saveLearningProfile` menulis balik ke `selectedModel` & `selectedSkillId` — lihat catatan kopling.
- ⚠️ **Kesempatan untuk sekalian perbaiki known issue #1** (lihat bagian "Known Issues" di bawah): race `loadLearningProfile` vs `loadSkills` yang bikin skill revert ke default setelah reload. Perbaikan ini di luar scope "no behavior change" murni, jadi kalau dikerjakan, lakukan sebagai commit terpisah dari ekstraksi hook-nya sendiri, dan diskusikan dulu pendekatannya (mis. tunggu `skills`/`skillsRef` terisi sebelum resolve, bukan cuma andalkan `skillsRef.current` yang mungkin masih kosong).

### 9. `useAttachments(userId, hasUploadQuota)`
- State: `uploadedAttachments`, `recentAttachments`, `documentText`, `documentStatus`, `documentError`, `composerNotice`, `isAttachMenuOpen` + ref `documentTextRef`, `uploadKeysInFlightRef`, `uploadFilesByAttachmentIdRef`
- Fungsi: `getCurrentDocumentMetadata`, `resetDocumentState`, `rememberLoadedAttachments`, `reuseRecentAttachment`, `removeAttachment`, `syncAttachmentState`, `readUploadedAttachment`, `retryAttachment`, `handleDocumentUpload`, `showComposerNotice`
- Effect yang ikut pindah: hydrate `recentAttachments` dari `localStorage` per `userId` (mount + saat `userId` berubah); persist `recentAttachments` ke `localStorage` saat berubah
- Perlu trigger `loadUsage()` (dari `useUsage`) setelah upload selesai — terima sebagai callback parameter, jangan import hook lain langsung.

### 10. `useConversations(userId, skills)`
- State: `conversations`, `searchConversations`, `activeConversationId`, `isLoadingConversations`, `historyError` (⚠️ lihat catatan di bawah — ini titik keputusan penting), `renamingConversationId`, `renameValue`, `chatSearch`
- Fungsi: `loadConversations`, `renameConversation`, `deleteConversation`, `toggleConversationPin`, `updateConversationWorkspace`
- Effect yang ikut pindah: debounced search (`chatSearch` → query Supabase → `setSearchConversations`)
- `deleteConversation` perlu panggil `resetMemory()` (dari `useChatSession`, belum ada) kalau conversation yang dihapus sedang aktif — terima sebagai callback parameter.
- **Keputusan yang perlu diambil di langkah ini:** `historyError` masih dipakai bersama oleh banyak fungsi lintas domain (workspaces, knowledge, conversations, dst — semuanya sudah menerima `setHistoryError` sebagai parameter). Di langkah ini, tentukan apakah `historyError` tetap satu state global di `page.tsx` (semua hook lain tetap terima sebagai parameter, seperti sekarang), atau sudah waktunya dibuat `useHistoryError()`/`useToast()` kecil terpisah. Rekomendasi dari analisis awal: **tetap global untuk sekarang**, jangan bikin hook error terpisah kecuali ada kebutuhan nyata — konsisten dengan keputusan `useWorkspaces` & `useKnowledgeBase` sebelumnya.

### 11. `useChatSession(...)` — PALING BESAR, PALING AKHIR
- State: `messages`, `input`, `isSending`, `isAwaitingFirstChunk`, `sharePreview` + ref `activeRequestRef`, `scrollFrameRef`, `messagesEndRef`
- Fungsi: `sendMessage` (fungsi terbesar di seluruh file, ~390 baris), `continueAnswer`, `loadConversation`, `createConversation`, `resetMemory`, `getActiveChatMarkdown`, `exportActiveChatMarkdown`, `openSharePreview`
- Effect yang ikut pindah: auto-scroll ke `messagesEndRef` saat `messages`/`isSending` berubah; abort `activeRequestRef` saat unmount
- Butuh output dari **hampir semua hook lain** sebagai parameter: `selectedModel`, `selectedSkillId`/`selectedSkill` (dari `useSkills`), `selectedWorkspaceId` (dari `useWorkspaces`), `skills`, `usageSnapshot` + `loadUsage` (dari `useUsage`), state attachment lengkap (dari `useAttachments`), setter `conversations` (dari `useConversations`)
- Karena paling gemuk dan paling banyak dependency, **kerjakan ini PALING AKHIR** dari semua hook domain (sebelum `useSettingsPanel` yang cuma shell tipis) — hook-hook kecil lain harus sudah berdiri sendiri dulu supaya tinggal dioper sebagai argumen ke `useChatSession`, bukan hook ini yang import hook lain langsung.

### 12. `useSettingsPanel()` — shell tipis, TERAKHIR
- State: `isSettingsOpen`, `activeSettingsTab`, `settingsDataMessage`
- Fungsi: `openSettings`, `openLearningProfile`, `deleteAllChatHistory`, `exportChatHistoryPlaceholder`
- Konten tiap tab settings TETAP milik hook domainnya masing-masing (tab "subscription" pakai `useUsage`, tab "knowledge" pakai `useKnowledgeBase`, dst) — hook ini cuma shell buka/tutup modal + tab aktif.
- `deleteAllChatHistory` perlu panggil `resetMemory()` (dari `useChatSession`) — terima sebagai callback parameter.
- `openSettings` perlu reset pesan dari beberapa domain lain (`setKnowledgeMessage("")`, `setKnowledgeError("")`, dst) — sudah jadi pola: hook lain expose setter-nya, `page.tsx`/hook shell ini yang manggil.

## Catatan Kopling Penting

**`loadUsage`, `loadLearningProfile`, dan `saveLearningProfile` menulis balik ke `selectedModel` dan `selectedSkillId`** (reset ke default kalau nilai saat ini di luar allowed list untuk tier/paket user). Ini kopling lintas-domain yang sudah ada dari awal, bukan sesuatu yang diperkenalkan migrasi ini.

Aturan yang dipakai sejauh ini dan **harus tetap dipakai** di langkah 6-12:
- **Jangan** hook A meng-import hook B langsung (hindari circular dependency dan hook yang diam-diam tahu terlalu banyak tentang domain lain).
- Kalau hook A perlu memicu efek di domain B, **A menerima fungsi/setter dari B sebagai parameter/callback**, dipanggil dari `page.tsx` yang menggabungkan semuanya. Pola ini sudah dipakai di `useWorkspaces(setHistoryError)`, `useKnowledgeBase()` (yang effect-nya sengaja tidak ikut pindah karena butuh state dari domain settings-shell), dan `useUsage(skillsRef, setSelectedModel, setSelectedSkillId)`.
- Urutan pemanggilan hook di `page.tsx` penting: hook yang **menerima** parameter dari hook lain harus dipanggil setelah hook sumber parameter itu — bukan berdasarkan "siapa lebih fundamental". Contoh nyata: setelah langkah 6 (`useSkills`), urutannya jadi `useSkills()` dulu baru `useUsage(...)`, karena `useUsage` butuh `skillsRef`/`setSelectedSkillId` yang sekarang dimiliki `useSkills` (lihat catatan di langkah 6 di atas) — kebalikan dari kesan awal bahwa `useUsage` "dikonsumsi duluan".

## Known Issues (Pre-existing, Belum Diperbaiki)

Bug yang ditemukan selama migrasi tapi **bukan** disebabkan oleh migrasi itu sendiri — sengaja **tidak** diperbaiki di langkah tempat ditemukannya, dicatat di sini supaya tidak hilang dan bisa ditangani di langkah yang scope-nya memang cocok.

### 1. Skill terpilih revert ke default ("Cambridge Tutor") setelah reload halaman

**Gejala:** Ganti skill via dropdown Study Mode (mis. ke "Islamic Teacher"), lalu reload halaman penuh (F5) — skill yang tampil kembali ke default platform ("Cambridge Tutor"), bukan skill yang barusan dipilih, meskipun `localStorage['ai-mu-study-mode']` sudah ter-update dengan benar ke id skill yang dipilih.

**Root cause (dugaan, belum dikonfirmasi mendalam):** race antara `loadLearningProfile(userId)` dan `loadSkills(userId)` — keduanya dipanggil bersamaan lewat `Promise.all([...])` di effect initial-load. `loadLearningProfile` resolve `selectedSkillId` dari `localStorage` via `resolveSkillIdFromLegacyValue(..., skillsRef.current)`, tapi `skillsRef.current` kemungkinan masih `[]` di momen itu karena `loadSkills` belum sempat mengisi state `skills` (dan efek sync `skillsRef.current = skills` di `useSkills.ts` belum sempat jalan). Akibatnya resolve gagal cocok, lalu efek fallback-pilih-skill-pertama di `useSkills.ts` mengambil alih dan pilih default platform (`findDefaultSkill` → "Cambridge Tutor").

**Ditemukan:** saat verifikasi manual langkah 6 (ekstraksi `useSkills`). **Dikonfirmasi pre-existing** dengan `git stash` balik ke kode sebelum langkah 6 (bahkan sebelum langkah 5) dan mengulang skenario yang sama — bug yang sama persis terjadi, jadi ini bukan regresi dari pemecahan `useUsage` atau ekstraksi `useSkills`.

**Status:** **TIDAK diperbaiki sekarang** — di luar scope langkah 6 ("no behavior change"). Ditangani di **langkah 8 (`useUserMemory`)** karena `loadLearningProfile` ada di domain itu, dan kemungkinan perbaikannya perlu mengubah urutan/timing resolve (bukan cuma pindah lokasi kode) — itu masuk kategori "perubahan behavior yang disengaja", bukan ekstraksi murni, jadi sebaiknya jadi commit terpisah dari ekstraksi hook-nya sendiri kalau dikerjakan.

## Pola Kerja yang Terbukti Jalan (ikuti terus sampai langkah 12)

1. Baca kode existing dulu (state + fungsi + effect yang relevan) sebelum bikin hook baru — jangan asumsi dari ingatan.
2. Buat `hooks/useX.ts` — pindahkan state/fungsi/effect (effect ikut pindah hanya kalau tidak depend ke domain lain yang belum diekstrak).
3. Edit `page.tsx`: ganti `useState`/fungsi lama dengan satu pemanggilan hook, hapus definisi lama, tambah import.
4. Cek import yang jadi tidak terpakai (fungsi lib, tipe lokal) — hapus kalau memang dead code akibat langsung dari ekstraksi ini (bukan cleanup di luar scope).
5. `npx tsc --noEmit` → harus bersih.
6. `npm run lint` → perbaiki warning yang muncul akibat langsung dari ekstraksi (biasanya `react-hooks/exhaustive-deps` untuk ref yang sekarang datang dari hook eksternal — aman ditambah ke dependency array, tidak mengubah behavior).
7. `npm run build` → harus sukses.
8. Test manual di browser, **spesifik ke fitur yang barusan diekstrak** (bukan smoke test umum) — kalau dev server sempat error "defined multiple times" atau sejenisnya padahal file di disk sudah benar, itu cache Turbopack basi: `rm -rf .next` lalu restart dev server.
9. Commit terpisah per hook (pesan commit format: `Extract useX hook from page.tsx (no behavior change)` atau sesuai konteks kalau ada perubahan tambahan seperti dead-code removal).
10. Baru lanjut ke hook berikutnya.

## Setelah Langkah 12 Selesai

1. **Pecah JSX**: `page.tsx` yang tersisa (didominasi JSX render tree) dipecah jadi komponen presentational — kandidat yang sudah teridentifikasi dari analisis awal: `<ModelMenu>`, `<SkillMenu>`, `<AccountMenu>` (saat ini di-JSX 2× untuk desktop/mobile, bagus disatukan), `<AttachMenu>`, `<UpgradeModal>`, `<SettingsModal>` (shell + per-tab), `<SharePreviewModal>`, sidebar conversation list, composer.
2. **Baru integrasikan desain visual baru** dari `stitch-reference/` — di titik ini state/logic sudah terisolasi di hooks jadi mengganti tampilan (JSX + styling) jauh lebih aman, tidak akan mengubah behavior secara tidak sengaja.
