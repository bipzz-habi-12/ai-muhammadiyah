# Migrasi `app/page.tsx` ke Custom Hooks — Progress

## Konteks

`app/page.tsx` adalah monolith SPA chat (awalnya **4734 baris**, sekarang **3641 baris**). Migrasi ini adalah persiapan sebelum mengganti UI-nya ke desain baru dari Stitch (lihat `stitch-reference/`) — tujuannya supaya saat desain visual diganti nanti, logic/state sudah terisolasi di hooks dan tidak ikut berantakan bareng JSX.

Pendekatan: ekstrak **satu hook per langkah**, kecil dan aman, bukan big-bang refactor.

Analisis arsitektur awal (peta lengkap semua state/fungsi sebelum migrasi dimulai) ada di riwayat percakapan sesi sebelumnya — dokumen ini fokus ke **status & rencana**, bukan mengulang analisis itu.

## Status: Langkah 1–8 SELESAI (sudah di-test manual + commit)

| # | Commit | Isi |
|---|---|---|
| 1 | `a986e16` Extract pure helpers from page.tsx to lib/ and components/ | Helper murni tanpa React state dipindah ke `lib/mappers/` (types, legacy-study-mode, workspace, conversation, message), `lib/chat/` (attachments, errors, selection-labels), `lib/formatting/` (math.tsx, markdown.tsx, text.ts), `components/icons.tsx` (SparkIcon, Icon), `components/MarkdownMessage.tsx`. Dead code `formatMathLikeText`/`formatMathLikeTextV2` **dihapus** (bukan dipindah). `fetchUsageSnapshot` masuk ke `lib/usage/limits.ts`, `fetchKnowledgeSources` masuk ke `lib/knowledge.ts` (extend file lama, bukan file baru). |
| 2 | `27cd0ab` Extract useAuthSession hook | `hooks/useAuthSession.ts` — state `userId`, `userEmail`, `isLoggingOut` + fungsi `handleLogout`. Effect get-user-or-redirect-to-login pindah ke hook; effect pemanggilan 5 loader (`loadWorkspaces`, `loadConversations`, `loadUsage`, `loadLearningProfile`, `loadSkills`) **tetap di `page.tsx`**, sekarang di-trigger oleh `useEffect(..., [userId, ...])` terpisah. |
| 3 | `7df0e2b` Extract useWorkspaces hook | `hooks/useWorkspaces.ts` — state `workspaces`, `selectedWorkspaceId`, `newWorkspaceName`, `isCreatingWorkspace` + fungsi `loadWorkspaces`, `createWorkspace`. Menerima `setHistoryError` sebagai parameter callback (bukan hook error sendiri). |
| 4 | `8763060` Extract useKnowledgeBase hook | `hooks/useKnowledgeBase.ts` — 8 state knowledge (`knowledgeSources`, `isKnowledgeAdmin`, `isLoadingKnowledge`, `isUploadingKnowledge`, `knowledgeTitle`, `knowledgeCategory`, `knowledgeMessage`, `knowledgeError`) + `hasLoadedKnowledgeRef` + fungsi `loadKnowledge`, `handleKnowledgeUpload`. Effect lazy-load (trigger saat tab Settings > Knowledge Base dibuka) **tetap di `page.tsx`** karena depend ke `activeSettingsTab`/`isSettingsOpen` (domain settings-shell, belum diekstrak) — hook cuma expose `loadKnowledge`, `isLoadingKnowledge`, `hasLoadedKnowledgeRef`. |
| 5 | `bafe39a` Extract useUsage hook | `hooks/useUsage.ts` — state `usageSnapshot`, `usageError` + fungsi `loadUsage` + derived `currentTierLabel`, `allowedModels`, `currentPlan`, `hasMessageQuota`, `hasUploadQuota`. Ketiga call site `loadUsage()` (initial load, setelah upload dokumen, setelah `sendMessage` selesai) **tetap di `page.tsx`**, tidak berubah. `loadLearningProfile`/`saveLearningProfile` **sengaja tidak diikutkan** — meski keduanya juga menulis balik ke `selectedModel`/`selectedSkillId`, itu berdasarkan `learningProfile` (data preferensi tersimpan), bukan status kuota/tier, jadi tetap domain `useUserMemory` (langkah 8). Kopling ke `selectedModel`/`selectedSkillId` diselesaikan dengan hook menerima `skillsRef`, `setSelectedModel`, `setSelectedSkillId` sebagai parameter (bukan import hook lain) — lihat catatan kopling di bawah. |
| 6 | `88afa43` Extract useSkills hook + split useUsage | `hooks/useSkills.ts` (baru) — state `skills`, `skillsLoading`, `selectedSkillId`, ref `skillsRef` + fungsi `loadSkills`, `selectSkill` + derived `selectedSkill`, `selectedSkillBadge`, plus effect fallback-pilih-skill-pertama, sync `skillsRef`, dan persist `localStorage` key `ai-mu-study-mode`. Menerima `tier` & `setIsStudyModeMenuOpen` sebagai parameter. **`hooks/useUsage.ts` dipecah** jadi `useUsage()` (lapis data murni, zero params) + `applyUsageConstraints()` (fungsi biasa, bukan hook, menerima `skillsRef`/setter sebagai parameter) — ini menyelesaikan circular dependency asli antara `useUsage` butuh `skillsRef` dan `useSkills` butuh `tier` dari `useUsage`. Urutan final: `useUsage()` → `useSkills(tier)` → compose ulang `loadUsage`. Known issue baru ditemukan (bukan regresi, dikonfirmasi pre-existing via `git stash`): skill revert ke default setelah reload — lihat bagian "Known Issues". |
| 7 | `da84ade` Extract useModelSelection hook | `hooks/useModelSelection.ts` (baru) — state `selectedModel`, `isModelMenuOpen`, `isUpgradeOpen`, `upgradeTargetModel` + fungsi `selectModel`, `openUpgradeModal` + derived `selectedModelInfo`, `upgradePlan`. Tidak ada effect yang ikut pindah (beda dari `useSkills`). Terima `allowedModels` (dari `useUsage`) sebagai parameter. Wrapper `loadUsage` di `page.tsx` dikomposisi ulang supaya `applyUsageConstraints` menerima `setSelectedModel` dari hook baru ini (bukan lagi `useState` lokal) — `applyUsageConstraints` sendiri di `hooks/useUsage.ts` tidak berubah. JSX modal upgrade (jauh dari definisi hook) dan 3 titik cross-toggle inline antara model-menu/study-mode-menu tetap jalan tanpa edit karena semua variabel di-destructure ke scope `page.tsx` yang sama. |
| 8 | `784d84d` Extract useUserMemory hook | `hooks/useUserMemory.ts` (baru) — state `learningProfile`, `profileDraft`, `favoriteSubjectsDraft`, `isSavingProfile`, `profileError`, `profileSavedMessage` + fungsi `loadLearningProfile`, `updateProfileDraft`, `saveLearningProfile` + derived `profileLabel`, plus effect sync tema. Ekstraksi murni — `loadLearningProfile` awalnya tetap pakai `skillsRef.current` persis seperti sebelumnya (bug known issue #1 diikutkan apa adanya, sengaja tidak diperbaiki di commit ini, dikonfirmasi via test reproduksi ulang sebelum lanjut). Bug fix menyusul di commit terpisah `af4d82f` — lihat "Known Issues" di bawah, sudah **RESOLVED**. |

Semua langkah di atas: `tsc --noEmit` bersih, `npm run build` sukses, `npm run lint` bersih, dan sudah di-test manual di browser (login/logout, buat workspace baru, upload & hapus knowledge source test; langkah 5: badge tier, pengurangan kuota pesan/upload harian, tombol disable saat kuota habis, auto-reset model di luar allowed list, tampilan tab Settings > Subscription; langkah 6: dropdown skill, badge & lock icon per tier, redirect ke `/plans` untuk skill terkunci, fallback pilih skill pertama, regresi kuota-habis; langkah 7: dropdown model, lock icon + modal upgrade untuk model terkunci, cross-toggle model-menu/study-mode-menu, regresi kuota-habis, load percakapan lama, save/load Learning Profile; langkah 8: reproduksi bug known issue #1 dulu (belum diperbaiki di commit ini), lalu setelah `af4d82f` — reload berulang (4x) mempertahankan skill terpilih, load percakapan lama dengan skill berbeda tidak meng-corrupt `localStorage`, Settings > General > Default study mode tersimpan & bertahan setelah reload).

## Sisa Langkah 9–12 (urutan disepakati, belum dikerjakan)

Urutan ini sengaja menaruh hook yang **paling sedikit bergantung ke hook lain** duluan, dan `useChatSession` (paling gemuk & paling banyak dependency) di posisi kedua-dari-akhir.

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

**Kondisi final setelah langkah 5-7** (bukan lagi asumsi transisional — ini yang benar-benar terpasang di kode sekarang):
- `hooks/useUsage.ts` punya 2 export: `useUsage()` (lapis data murni, **zero parameter**, isinya cuma fetch + state `usageSnapshot`/`usageError` + derived `currentTierLabel`/`allowedModels`/`currentPlan`/`hasMessageQuota`/`hasUploadQuota`) dan `applyUsageConstraints(snapshot, skillsRef, setSelectedModel, setSelectedSkillId)` (**fungsi biasa, bukan hook** — tidak makai `useState`/`useEffect` sendiri, cuma menerima setter dari domain lain lewat parameter).
- Urutan pemanggilan hook final di `page.tsx`: **`useUsage()` dulu** (tidak butuh apa-apa dari hook lain) → `usageSnapshot?.tier` & `allowedModels` tersedia dari return-nya → `useSkills(tier, setIsStudyModeMenuOpen)` dan `useModelSelection(allowedModels)` (keduanya independen satu sama lain, urutan relatif bebas) → baru `page.tsx` mengomposisi ulang wrapper `loadUsage` yang memanggil `applyUsageConstraints(snapshot, skillsRef, setSelectedModel, setSelectedSkillId)` memakai `skillsRef`/`setSelectedSkillId` dari `useSkills` dan `setSelectedModel` dari `useModelSelection`.
- Prinsip di balik desain ini: kalau hook A butuh menulis ke state yang dimiliki hook B, **A tidak boleh menerima setter B sebagai parameter constructor-nya sendiri** (itu yang menciptakan circular dependency di langkah 6). Sebagai gantinya, A dipecah jadi lapis data (zero/minimal parameter) + fungsi biasa yang menerima setter sebagai argumen saat **dipanggil**, bukan saat hook itu sendiri di-invoke. Komposisi lintas-domain terjadi di `page.tsx` (lewat wrapper seperti `loadUsage`), bukan di dalam hook manapun.

Aturan yang dipakai sejauh ini dan **harus tetap dipakai** di langkah 9-12:
- **Jangan** hook A meng-import hook B langsung (hindari circular dependency dan hook yang diam-diam tahu terlalu banyak tentang domain lain).
- Kalau hook A perlu memicu efek di domain B, **A menerima fungsi/setter dari B sebagai parameter/callback**, dipanggil dari `page.tsx` yang menggabungkan semuanya. Pola ini sudah dipakai di `useWorkspaces(setHistoryError)`, `useKnowledgeBase()` (yang effect-nya sengaja tidak ikut pindah karena butuh state dari domain settings-shell), `useSkills(tier, setIsStudyModeMenuOpen)`, dan `applyUsageConstraints(snapshot, skillsRef, setSelectedModel, setSelectedSkillId)`.
- Kalau ternyata ada kebutuhan **dua arah** (hook A butuh data dari B, B butuh setter dari A) seperti kasus `useUsage`/`useSkills` di langkah 6: pecah salah satu hook jadi lapis data (zero/minimal parameter, bisa dipanggil kapan saja) + fungsi komposisi terpisah yang dipanggil belakangan di `page.tsx` — jangan paksakan urutan pemanggilan untuk "menyelesaikan" circular dependency asli, itu tidak akan bisa.

## Known Issues

Bug yang ditemukan selama migrasi tapi **bukan** disebabkan oleh migrasi itu sendiri, dicatat di sini supaya tidak hilang dan (kalau belum) bisa ditangani di langkah yang scope-nya memang cocok.

### 1. Skill terpilih revert ke default ("Cambridge Tutor") setelah reload halaman — ✅ RESOLVED di `af4d82f`

**Gejala:** Ganti skill via dropdown Study Mode (mis. ke "Islamic Teacher"), lalu reload halaman penuh (F5) — skill yang tampil kembali ke default platform ("Cambridge Tutor"), bukan skill yang barusan dipilih. Bug ini flaky/race-timing-dependent (reproduce ~4 dari 5 reload saat diverifikasi, bukan 100% setiap saat).

**Root cause asli (dugaan awal, TIDAK LENGKAP):** race antara `loadLearningProfile(userId)` dan `loadSkills(userId)` yang dipanggil bersamaan lewat `Promise.all([...])` — `loadLearningProfile` resolve skill dari `localStorage` via `skillsRef.current` yang mungkin masih `[]` karena belum sempat sinkron dari `loadSkills`.

**Percobaan fix pertama (commit terpisah, TERBUKTI TIDAK CUKUP, sudah di-revert sebelum push manapun):** mengubah `loadSkills` supaya return `Skill[]` langsung dan menyusun ulang `Promise.all` supaya `loadLearningProfile` dipanggil setelah `loadSkills` selesai, pakai array yang baru di-fetch alih-alih `skillsRef.current`. Setelah di-test ulang dengan benar (percobaan pertama sempat salah klik di test tooling, menciptakan false positive), bug **masih reproduce** — root cause asli ternyata cuma separuh cerita.

**Root cause sebenarnya (dikonfirmasi via testing berulang):** `hooks/useSkills.ts` punya efek generik yang mem-persist `selectedSkillId` ke `localStorage` setiap kali berubah — **termasuk** saat efek fallback (yang otomatis memilih skill default saat `skills` sudah termuat tapi `selectedSkillId` masih `null`) yang menembak. Karena `loadSkills` (tabel kecil) hampir selalu selesai duluan dibanding `loadWorkspaces`/`loadConversations`/`loadUsage` (yang berjalan bersamaan di `Promise.all` yang sama), ada jendela waktu nyata di mana `skills` sudah terisi tapi `selectedSkillId` masih `null` — efek fallback menembak, memilih "Cambridge Tutor", dan **efek generik itu langsung menimpa `localStorage`** dengan id Cambridge Tutor SEBELUM `loadLearningProfile` sempat baca nilai asli yang tersimpan. Begitu `loadLearningProfile` akhirnya jalan, ia membaca `localStorage` yang sudah ter-corrupt dan "dengan benar" resolve ke Cambridge Tutor — jadi ini bukan cuma soal `loadLearningProfile` baca data basi, tapi `localStorage`-nya sendiri yang ke-corrupt duluan oleh sumber lain.

**Fix final (`af4d82f`):**
- `hooks/useSkills.ts`: efek generik persist-ke-localStorage **dihapus**. `localStorage.setItem("ai-mu-study-mode", ...)` sekarang hanya dipanggil eksplisit di dalam `selectSkill` (aksi pilih skill yang disengaja oleh user). Efek fallback & `applyUsageConstraints` (re-validasi tier) tetap mengubah `selectedSkillId` di memory (supaya UI tetap menampilkan sesuatu yang masuk akal), tapi tidak lagi menimpa preferensi yang tersimpan.
- `hooks/useUserMemory.ts`: `saveLearningProfile` (aksi simpan eksplisit lain, dari Settings > Personalization/General) **juga** perlu persist eksplisit sendiri — kalau tidak, perubahan default study mode di Settings akan diam-diam tidak berlaku lagi di reload berikutnya karena `localStorage` lama (dari quick-switch sebelumnya) akan tetap menang. `loadLearningProfile` menerima `currentSkills` sebagai parameter (bukan lagi `skillsRef.current`) — bagian dari percobaan fix pertama yang tetap dipertahankan karena memang benar secara terpisah.
- `applyUsageConstraints` (re-validasi tier turun) dan `loadConversation` (restore skill kontekstual per-percakapan) **sengaja tidak** dibuat persist — keduanya bukan preferensi permanen user, cuma penyesuaian in-memory/kontekstual.

**Verifikasi:** reload berulang (4x berturut-turut) mempertahankan skill terpilih; load percakapan lama dengan skill berbeda tidak meng-corrupt `localStorage` (dan reload sesudahnya tetap kembali ke preferensi asli, bukan skill kontekstual percakapan itu); Settings > General > Default study mode tersimpan dan bertahan setelah reload.

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
