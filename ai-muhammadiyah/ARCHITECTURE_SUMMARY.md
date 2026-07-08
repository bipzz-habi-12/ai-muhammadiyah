# Architecture Summary — `app/page.tsx` Hook Layer

## Tujuan Dokumen

Referensi untuk sesi kerja berikutnya (integrasi UI Stitch) yang **tidak** membaca riwayat 12 langkah migrasi di `MIGRATION_PROGRESS.md`. Dokumen itu tetap jadi arsip historis (apa yang terjadi, kenapa, keputusan apa yang diambil) — dokumen ini adalah **peta kondisi kode saat ini** (apa yang ada, di mana, bagaimana cara pakainya), ditulis setelah hook-extraction phase (langkah 1-12) selesai dan sudah di-merge ke `main`.

`app/page.tsx` sekarang **2197 baris** (dari awalnya 4734 baris). Semua state/logic sudah terisolasi ke 11 custom hook di `hooks/`. Sisa isi `page.tsx` adalah: komposisi hook, beberapa `useMemo`/`useEffect` lintas-domain yang sengaja tidak diekstrak, dua fungsi helper JSX (`renderAttachmentChips`, `renderAttachMenu`), dan JSX render tree yang **belum** dipecah jadi komponen.

---

## 1. Peta Hook

11 file hook + 1 fungsi companion (`applyUsageConstraints`, bukan hook — lihat `useUsage.ts`). Urutan di bawah = urutan tanggung jawab, bukan urutan pemanggilan (lihat bagian 2 untuk urutan pemanggilan aktual).

### `hooks/useAuthSession.ts`
**Tanggung jawab:** Ambil user Supabase saat ini, redirect ke `/login` kalau tidak ada sesi. Logout.
```ts
useAuthSession()
// params: (tidak ada)
// return:
{
  userId: string,
  userEmail: string,
  isLoggingOut: boolean,
  handleLogout: () => Promise<void>,
}
```

### `hooks/useWorkspaces.ts`
**Tanggung jawab:** CRUD ringan tabel `chat_workspaces` (baca + create). Tidak menghapus/update workspace.
```ts
useWorkspaces(setHistoryError: (message: string) => void)
// return:
{
  workspaces: Workspace[],
  selectedWorkspaceId: string,
  setSelectedWorkspaceId: Dispatch<SetStateAction<string>>,
  newWorkspaceName: string,
  setNewWorkspaceName: Dispatch<SetStateAction<string>>,
  isCreatingWorkspace: boolean,
  loadWorkspaces: () => Promise<void>,
  createWorkspace: () => Promise<void>,
}
```

### `hooks/useKnowledgeBase.ts`
**Tanggung jawab:** Data + upload untuk tab Settings > Knowledge Base (RAG source management). Tidak tahu kapan tab-nya aktif — effect lazy-load ada di `useSettingsPanel`, bukan di sini.
```ts
useKnowledgeBase()
// return:
{
  knowledgeSources: KnowledgeSource[],
  isKnowledgeAdmin: boolean,
  isLoadingKnowledge: boolean,
  isUploadingKnowledge: boolean,
  knowledgeTitle: string,
  setKnowledgeTitle: Dispatch<SetStateAction<string>>,
  knowledgeCategory: string,
  setKnowledgeCategory: Dispatch<SetStateAction<string>>,
  knowledgeMessage: string,
  setKnowledgeMessage: Dispatch<SetStateAction<string>>,
  knowledgeError: string,
  setKnowledgeError: Dispatch<SetStateAction<string>>,
  hasLoadedKnowledgeRef: MutableRefObject<boolean>,
  loadKnowledge: () => Promise<void>,
  handleKnowledgeUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>,
}
```

### `hooks/useUsage.ts` — 2 export
**Tanggung jawab:** `useUsage()` = lapis data murni (fetch `/api/usage`, quota/tier derivations), zero-parameter. `applyUsageConstraints` = fungsi biasa (bukan hook) yang menulis balik ke `selectedModel`/`selectedSkillId` kalau di luar allowed list — dipisah dari `useUsage()` justru untuk **menghindari** circular dependency dengan `useSkills`/`useModelSelection` (lihat bagian 5).
```ts
useUsage()
// return:
{
  usageSnapshot: UsageSnapshot | null,
  usageError: string,
  loadUsage: () => Promise<UsageSnapshot | null>,
  currentTierLabel: string,
  allowedModels: string[],
  currentPlan: ReturnType<typeof getPlanByTier> | null,
  hasMessageQuota: boolean,
  hasUploadQuota: boolean,
}

applyUsageConstraints(
  snapshot: UsageSnapshot | null,
  skillsRef: MutableRefObject<Skill[]>,
  setSelectedModel: Dispatch<SetStateAction<PlanModelId>>,
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>,
) => void
```

### `hooks/useSkills.ts`
**Tanggung jawab:** Daftar skill (dari tabel `skills`), skill terpilih, pemilihan skill oleh user (dengan gating tier + redirect `/plans`). Lihat bagian 5 untuk pola `queueMicrotask` dan `localStorage`.
```ts
useSkills(
  tier: SubscriptionTier | undefined,
  setIsStudyModeMenuOpen: Dispatch<SetStateAction<boolean>>,
)
// return:
{
  skills: Skill[],
  skillsLoading: boolean,
  selectedSkillId: string | null,
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>,
  skillsRef: MutableRefObject<Skill[]>,
  loadSkills: (currentUserId: string) => Promise<Skill[]>,
  selectSkill: (skillId: string) => void,
  selectedSkill: Skill | null,
  selectedSkillBadge: string,
}
```

### `hooks/useModelSelection.ts`
**Tanggung jawab:** Model AI terpilih (`auto`/`fast`/`smart`/`document`), modal upgrade kalau model terkunci untuk tier user.
```ts
useModelSelection(allowedModels: string[])
// return:
{
  selectedModel: PlanModelId,
  setSelectedModel: Dispatch<SetStateAction<PlanModelId>>,
  isModelMenuOpen: boolean,
  setIsModelMenuOpen: Dispatch<SetStateAction<boolean>>,
  isUpgradeOpen: boolean,
  setIsUpgradeOpen: Dispatch<SetStateAction<boolean>>,
  upgradeTargetModel: PlanModelId,
  selectedModelInfo: (typeof modelCatalog)[PlanModelId],
  upgradePlan: ReturnType<typeof getUpgradePlanForModel>,
  selectModel: (model: PlanModelId) => void,
  openUpgradeModal: (model?: PlanModelId) => void,
}
```

### `hooks/useUserMemory.ts`
**Tanggung jawab:** Learning Profile (`user_memory` table) — data preferensi tersimpan (nama, level sekolah, model/study-mode default, tema, dst), draft form Settings > Personalization, save. Lihat bagian 5 untuk kenapa `loadLearningProfile` menerima `currentTier` sebagai parameter call-time, bukan closure.
```ts
useUserMemory(
  userId: string,
  skills: Skill[],
  tier: SubscriptionTier | undefined,
  setSelectedModel: Dispatch<SetStateAction<PlanModelId>>,
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>,
)
// return:
{
  learningProfile: UserMemory,
  setLearningProfile: Dispatch<SetStateAction<UserMemory>>,
  profileDraft: UserMemory,
  setProfileDraft: Dispatch<SetStateAction<UserMemory>>,
  favoriteSubjectsDraft: string,
  setFavoriteSubjectsDraft: Dispatch<SetStateAction<string>>,
  isSavingProfile: boolean,
  profileError: string,
  setProfileError: Dispatch<SetStateAction<string>>,
  profileSavedMessage: string,
  setProfileSavedMessage: Dispatch<SetStateAction<string>>,
  profileLabel: string,
  loadLearningProfile: (currentUserId: string, currentSkills: Skill[], currentTier: SubscriptionTier | undefined) => Promise<void>,
  updateProfileDraft: <K extends keyof UserMemory>(key: K, value: UserMemory[K]) => void,
  saveLearningProfile: () => Promise<void>,
}
```

### `hooks/useAttachments.ts`
**Tanggung jawab:** Semua state upload dokumen/gambar (composer + recent files di `localStorage`), termasuk extract text/image data.
```ts
useAttachments(
  userId: string,
  hasUploadQuota: boolean,
  loadUsage: () => Promise<UsageSnapshot | null>,
)
// return:
{
  uploadedAttachments: UploadedAttachment[],
  setUploadedAttachments: Dispatch<SetStateAction<UploadedAttachment[]>>,
  recentAttachments: UploadedAttachment[],
  documentText: string,
  setDocumentText: Dispatch<SetStateAction<string>>,
  documentStatus: DocumentStatus,
  setDocumentStatus: Dispatch<SetStateAction<DocumentStatus>>,
  documentError: string,
  setDocumentError: Dispatch<SetStateAction<string>>,
  composerNotice: string,
  setComposerNotice: Dispatch<SetStateAction<string>>,
  isAttachMenuOpen: boolean,
  setIsAttachMenuOpen: Dispatch<SetStateAction<boolean>>,
  documentTextRef: MutableRefObject<string>,
  uploadKeysInFlightRef: MutableRefObject<Set<string>>,
  uploadFilesByAttachmentIdRef: MutableRefObject<Map<string, File>>,
  getCurrentDocumentMetadata: () => DocumentMetadata | null,
  resetDocumentState: () => void,
  rememberLoadedAttachments: (attachments: UploadedAttachment[]) => void,
  reuseRecentAttachment: (attachment: UploadedAttachment) => void,
  removeAttachment: (attachmentId: string) => void,
  syncAttachmentState: (attachments: UploadedAttachment[]) => void,
  readUploadedAttachment: (file: File, attachmentId: string) => Promise<void>,
  retryAttachment: (attachmentId: string) => Promise<void>,
  handleDocumentUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>,
  showComposerNotice: (message: string) => void,
}
```
Catatan: `page.tsx` cuma destructure sebagian return ini (tidak pakai `rememberLoadedAttachments`, `syncAttachmentState`, `readUploadedAttachment`, `uploadKeysInFlightRef`, `uploadFilesByAttachmentIdRef` secara langsung — dipakai internal oleh fungsi lain di hook yang sama).

### `hooks/useConversations.ts`
**Tanggung jawab:** CRUD percakapan (load, rename, delete, pin, ganti workspace), search percakapan (debounced), daftar percakapan yang tampil di sidebar.
```ts
useConversations(
  skillsRef: MutableRefObject<Skill[]>,
  setHistoryError: (message: string) => void,
)
// return:
{
  conversations: Conversation[],
  setConversations: Dispatch<SetStateAction<Conversation[]>>,
  searchConversations: Conversation[] | null,
  setSearchConversations: Dispatch<SetStateAction<Conversation[] | null>>,
  activeConversationId: string,
  setActiveConversationId: Dispatch<SetStateAction<string>>,
  isLoadingConversations: boolean,
  renamingConversationId: string,
  setRenamingConversationId: Dispatch<SetStateAction<string>>,
  renameValue: string,
  setRenameValue: Dispatch<SetStateAction<string>>,
  chatSearch: string,
  setChatSearch: Dispatch<SetStateAction<string>>,
  loadConversations: () => Promise<void>,
  renameConversation: (conversationId: string) => Promise<void>,
  deleteConversation: (conversationId: string, resetMemory?: () => void) => Promise<void>,
  toggleConversationPin: (conversation: Conversation) => Promise<void>,
  updateConversationWorkspace: (conversationId: string, workspaceId: string) => Promise<void>,
  visibleConversations: Conversation[],   // memo: searchConversations ?? conversations
  activeConversation: Conversation | undefined,
}
```
Catatan: `page.tsx` tidak destructure `conversations`/`searchConversations`/`setSearchConversations` mentah — cuma pakai `visibleConversations`. `deleteConversation`'s parameter kedua (`resetMemory`) adalah **titik krusial solusi circular dependency** — lihat bagian 5.

### `hooks/useChatSession.ts` — hook terbesar (709 baris)
**Tanggung jawab:** Semua state/logic chat aktif — kirim pesan (streaming), load/create percakapan, export, share preview. Butuh output dari hampir semua hook lain (26 parameter).
```ts
useChatSession(
  userId: string,
  setHistoryError: (message: string) => void,
  selectedWorkspaceId: string,                                    // useWorkspaces
  setSelectedWorkspaceId: Dispatch<SetStateAction<string>>,        // useWorkspaces
  workspaces: Workspace[],                                        // useWorkspaces
  usageSnapshot: UsageSnapshot | null,                             // useUsage
  hasMessageQuota: boolean,                                        // useUsage
  allowedModels: string[],                                         // useUsage
  loadUsage: () => Promise<UsageSnapshot | null>,                  // page.tsx wrapper (loadUsageSnapshot + applyUsageConstraints)
  skills: Skill[],                                                 // useSkills
  selectedSkillId: string | null,                                  // useSkills
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>,     // useSkills
  selectedSkill: Skill | null,                                     // useSkills
  selectedModel: PlanModelId,                                      // useModelSelection
  setSelectedModel: Dispatch<SetStateAction<PlanModelId>>,         // useModelSelection
  uploadedAttachments: UploadedAttachment[],                       // useAttachments
  setUploadedAttachments: Dispatch<SetStateAction<UploadedAttachment[]>>,  // useAttachments
  documentText: string,                                            // useAttachments
  setDocumentText: Dispatch<SetStateAction<string>>,                // useAttachments
  setDocumentStatus: Dispatch<SetStateAction<DocumentStatus>>,      // useAttachments
  setDocumentError: Dispatch<SetStateAction<string>>,               // useAttachments
  documentTextRef: MutableRefObject<string>,                        // useAttachments
  getCurrentDocumentMetadata: () => DocumentMetadata | null,        // useAttachments
  resetDocumentState: () => void,                                   // useAttachments
  setComposerNotice: Dispatch<SetStateAction<string>>,               // useAttachments
  setConversations: Dispatch<SetStateAction<Conversation[]>>,        // useConversations
  activeConversation: Conversation | undefined,                     // useConversations
  setActiveConversationId: Dispatch<SetStateAction<string>>,        // useConversations
)
// return:
{
  messages: Message[],
  setMessages: Dispatch<SetStateAction<Message[]>>,
  input: string,
  setInput: Dispatch<SetStateAction<string>>,
  isSending: boolean,
  isAwaitingFirstChunk: boolean,
  sharePreview: string,
  setSharePreview: Dispatch<SetStateAction<string>>,
  messagesEndRef: MutableRefObject<HTMLDivElement | null>,
  sendMessage: (messageOverride?: string, options?: { hiddenInstruction?: boolean; appendToLastAssistant?: boolean }) => Promise<void>,
  continueAnswer: () => void,
  loadConversation: (conversation: Conversation) => Promise<void>,
  createConversation: (userText: string) => Promise<Conversation>,
  resetChatSessionState: () => void,      // reset messages/input/sharePreview milik hook ini sendiri, dipakai untuk komposisi resetMemory di page.tsx
  exportActiveChatMarkdown: () => void,
  openSharePreview: () => void,
}
```
Catatan: `activeRequestRef`/`scrollFrameRef` **internal-only**, tidak di-return (tidak dipakai JSX). `getActiveChatMarkdown` juga internal-only (cuma dipanggil dari `exportActiveChatMarkdown` di file yang sama). `page.tsx` sendiri tidak destructure `setMessages`/`createConversation` dari return ini (tidak dipakai langsung di JSX — hapus dari destructure kalau memang tidak dipakai, jangan tambah balik tanpa alasan, nanti lint `no-unused-vars` akan flag).

### `hooks/useSettingsPanel.ts` — shell tipis
**Tanggung jawab:** Buka/tutup modal Settings, tab aktif, 4 aksi settings (open/openLearningProfile/deleteAll/exportPlaceholder). **Bukan** pemilik konten tab — tiap tab pakai state dari hook domainnya sendiri (`useUsage` untuk tab Subscription, `useKnowledgeBase` untuk tab Knowledge Base, dst).
```ts
useSettingsPanel(
  learningProfile: UserMemory,                                    // useUserMemory
  setProfileDraft: Dispatch<SetStateAction<UserMemory>>,           // useUserMemory
  setFavoriteSubjectsDraft: Dispatch<SetStateAction<string>>,      // useUserMemory
  setProfileError: Dispatch<SetStateAction<string>>,               // useUserMemory
  setProfileSavedMessage: Dispatch<SetStateAction<string>>,        // useUserMemory
  setKnowledgeMessage: Dispatch<SetStateAction<string>>,           // useKnowledgeBase
  setKnowledgeError: Dispatch<SetStateAction<string>>,              // useKnowledgeBase
  hasLoadedKnowledgeRef: MutableRefObject<boolean>,                 // useKnowledgeBase
  isLoadingKnowledge: boolean,                                      // useKnowledgeBase
  loadKnowledge: () => Promise<void>,                               // useKnowledgeBase
  setConversations: Dispatch<SetStateAction<Conversation[]>>,       // useConversations
  resetMemory: () => void,                                          // page.tsx composed
  exportActiveChatMarkdown: () => void,                             // useChatSession
)
// return:
{
  isSettingsOpen: boolean,
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>,
  activeSettingsTab: SettingsTab,
  setActiveSettingsTab: Dispatch<SetStateAction<SettingsTab>>,
  settingsDataMessage: string,
  openSettings: (tab?: SettingsTab) => void,
  openLearningProfile: () => void,
  deleteAllChatHistory: () => Promise<void>,
  exportChatHistoryPlaceholder: () => void,
}
```

---

## 2. Urutan Pemanggilan Hook Final di `page.tsx` (kode aktual, baris 84-330)

```ts
export default function Home() {
  const router = useRouter();
  const { userId, userEmail, isLoggingOut, handleLogout } = useAuthSession();
  const [historyError, setHistoryError] = useState("");           // shared/global, sengaja tidak masuk hook manapun

  const { workspaces, selectedWorkspaceId, setSelectedWorkspaceId,
    newWorkspaceName, setNewWorkspaceName, isCreatingWorkspace,
    loadWorkspaces, createWorkspace } = useWorkspaces(setHistoryError);

  const [isStudyModeMenuOpen, setIsStudyModeMenuOpen] = useState(false);  // UI-only, belum diekstrak
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);      // UI-only, belum diekstrak

  const { knowledgeSources, isKnowledgeAdmin, isLoadingKnowledge,
    isUploadingKnowledge, knowledgeTitle, setKnowledgeTitle,
    knowledgeCategory, setKnowledgeCategory, knowledgeMessage,
    setKnowledgeMessage, knowledgeError, setKnowledgeError,
    hasLoadedKnowledgeRef, loadKnowledge, handleKnowledgeUpload,
  } = useKnowledgeBase();

  const { usageSnapshot, usageError, loadUsage: loadUsageSnapshot,
    currentTierLabel, allowedModels, currentPlan,
    hasMessageQuota, hasUploadQuota } = useUsage();

  const { skills, skillsLoading, selectedSkillId, setSelectedSkillId,
    skillsRef, loadSkills, selectSkill, selectedSkill,
    selectedSkillBadge } = useSkills(usageSnapshot?.tier, setIsStudyModeMenuOpen);

  const { selectedModel, setSelectedModel, isModelMenuOpen, setIsModelMenuOpen,
    isUpgradeOpen, setIsUpgradeOpen, upgradeTargetModel, selectedModelInfo,
    upgradePlan, selectModel } = useModelSelection(allowedModels);

  const { learningProfile, profileDraft, setProfileDraft, favoriteSubjectsDraft,
    setFavoriteSubjectsDraft, isSavingProfile, profileError, setProfileError,
    profileSavedMessage, setProfileSavedMessage, profileLabel,
    loadLearningProfile, updateProfileDraft, saveLearningProfile,
  } = useUserMemory(userId, skills, usageSnapshot?.tier, setSelectedModel, setSelectedSkillId);

  // Wrapper komposisi — bukan hook, tapi WAJIB ada sebelum useAttachments/useChatSession
  const loadUsage = useCallback(async () => {
    const snapshot = await loadUsageSnapshot();
    applyUsageConstraints(snapshot, skillsRef, setSelectedModel, setSelectedSkillId);
    return snapshot;
  }, [loadUsageSnapshot, skillsRef, setSelectedModel, setSelectedSkillId]);

  const { uploadedAttachments, setUploadedAttachments, recentAttachments,
    documentText, setDocumentText, documentStatus, setDocumentStatus,
    documentError, setDocumentError, composerNotice, setComposerNotice,
    isAttachMenuOpen, setIsAttachMenuOpen, documentTextRef,
    getCurrentDocumentMetadata, resetDocumentState, reuseRecentAttachment,
    removeAttachment, retryAttachment, handleDocumentUpload, showComposerNotice,
  } = useAttachments(userId, hasUploadQuota, loadUsage);

  const { setConversations, activeConversationId, setActiveConversationId,
    isLoadingConversations, renamingConversationId, setRenamingConversationId,
    renameValue, setRenameValue, chatSearch, setChatSearch, loadConversations,
    renameConversation, deleteConversation, toggleConversationPin,
    updateConversationWorkspace, visibleConversations, activeConversation,
  } = useConversations(skillsRef, setHistoryError);   // TIDAK butuh resetMemory lagi (lihat bagian 5)

  const { messages, input, setInput, isSending, isAwaitingFirstChunk,
    sharePreview, setSharePreview, messagesEndRef, sendMessage, continueAnswer,
    loadConversation, resetChatSessionState, exportActiveChatMarkdown,
    openSharePreview,
  } = useChatSession(/* 26 argumen, lihat bagian 1 */);

  // Komposisi resetMemory — HARUS setelah useChatSession + useConversations + useAttachments
  const resetMemory = useCallback(() => {
    setActiveConversationId("");        // useConversations
    setRenamingConversationId("");      // useConversations
    setRenameValue("");                 // useConversations
    resetChatSessionState();            // useChatSession
    resetDocumentState();               // useAttachments
  }, [setActiveConversationId, setRenamingConversationId, setRenameValue,
      resetChatSessionState, resetDocumentState]);

  const userInitials = useMemo(() => getEmailInitials(userEmail), [userEmail]);
  const conversationGroups = useMemo(
    () => groupConversationsByWorkspace(visibleConversations, workspaces),
    [visibleConversations, workspaces],
  );

  useEffect(() => { /* initial-load: Promise.all([loadWorkspaces, loadConversations,
    loadUsage, loadSkills]) lalu loadLearningProfile — cross-domain, sengaja tetap di page.tsx */
  }, [userId, loadConversations, loadLearningProfile, loadSkills, loadUsage, loadWorkspaces]);

  const { isSettingsOpen, setIsSettingsOpen, activeSettingsTab, setActiveSettingsTab,
    settingsDataMessage, openSettings, openLearningProfile, deleteAllChatHistory,
    exportChatHistoryPlaceholder,
  } = useSettingsPanel(learningProfile, setProfileDraft, setFavoriteSubjectsDraft,
    setProfileError, setProfileSavedMessage, setKnowledgeMessage, setKnowledgeError,
    hasLoadedKnowledgeRef, isLoadingKnowledge, loadKnowledge, setConversations,
    resetMemory, exportActiveChatMarkdown);

  function renderAttachmentChips(extraClassName = "") { /* baris 334-413 */ }
  function renderAttachMenu() { /* baris 415-514 */ }

  return ( /* JSX, baris 516-2196 — lihat bagian 3 */ );
}
```

**Aturan urutan yang WAJIB dipertahankan** kalau menambah/mengubah hook:
1. `useUsage()` sebelum `useSkills`/`useModelSelection` (butuh `tier`/`allowedModels`).
2. `useUserMemory` sebelum wrapper `loadUsage` (tidak saling butuh, tapi urutan baca lebih jelas kalau memory duluan).
3. Wrapper `loadUsage` (komposisi) sebelum `useAttachments` DAN `useChatSession` (keduanya butuh `loadUsage` yang sudah membungkus `applyUsageConstraints`, bukan `loadUsage` mentah dari `useUsage()`).
4. `useConversations` sebelum `useChatSession` (`useChatSession` butuh `setConversations`/`activeConversation`/`setActiveConversationId`).
5. `useChatSession` sebelum komposisi `resetMemory` (butuh `resetChatSessionState`).
6. Komposisi `resetMemory` sebelum `useSettingsPanel` (butuh `resetMemory` utuh).
7. `useSettingsPanel` paling akhir — tidak ada hook lain yang butuh apa pun darinya.

---

## 3. JSX Besar yang Masih Perlu Dipecah (baris saat ini di `app/page.tsx`)

Semua ini masih inline JSX di `return (...)` — belum jadi komponen file terpisah. Komponen presentational yang jelas dibutuhkan:

| Komponen kandidat | Baris saat ini | Isi |
|---|---|---|
| `<Sidebar>` | ✅ **Sudah diekstrak** — `components/Sidebar.tsx` (dipanggil di `page.tsx` baris ~519) | `<aside>` kiri (340px, desktop-only `md:flex`): logo+toggle, tombol "+ Obrolan baru", pemilih workspace, search, daftar percakapan (grouped by workspace, dengan rename/pin/delete inline), account menu popover di bagian bawah (**duplikat** dari account menu di TopBar — lihat bagian 5, belum dikonsolidasi). Sudah direstyle mengikuti tema hijau tua Stitch (`bg-[#006837]`, lihat bagian 6). Props: 34 (data + setter + handler dari `useWorkspaces`, `useConversations`, `useChatSession`, `useUsage`, `useSettingsPanel`, `useUserMemory`, `useAuthSession`, plus `resetMemory`/`userInitials` komposisi `page.tsx` — tidak ada state lokal ke komponen, lihat `MIGRATION_PROGRESS.md` langkah 13 untuk daftar lengkap & alasan). |
| `<TopBar>` | ✅ **Sudah diekstrak** — `components/TopBar.tsx` (dipanggil di `page.tsx` baris ~558) | `<header>` — logo mobile, dropdown model AI, dropdown study mode/skill, baris pin/export/share, badge tier, account menu trigger + popover mobile-only (**duplikat** dari popover Sidebar, dipertahankan sengaja — lihat bagian 5). **Belum direstyle** (lihat bagian 6 — beda dari Sidebar, warnanya sengaja dibiarkan sama persis, ditunda sampai ChatArea/Composer/MobileToolbar juga diekstrak). Props: 27 (lihat `MIGRATION_PROGRESS.md` langkah 14). |
| `<MobileToolbar>` | 1141-1224 | `<div className="... md:hidden">` — search+workspace mobile, tombol "+ Obrolan baru" compact + daftar percakapan horizontal-scroll, pin/export/share bar, attach button. Ini **satu-satunya** blok mobile-exclusive; sisanya pakai `sm:`/`md:` responsive classes di komponen yang sama, bukan duplikasi terpisah. |
| `<ChatArea>` (welcome state) | 1226-1364 | Heading sambutan + composer tertanam (1244-1334, lihat `<Composer>`) + `quickPrompts` grid + disclaimer. Tampil kalau `messages.length <= 1`. |
| `<ChatArea>` (message list) | 1366-1415 | Render `messages.map(...)` (bubble user/AI, markdown, tombol "Lanjutkan jawaban"), indikator "Sedang menjawab...", `messagesEndRef` anchor. Tampil kalau `messages.length > 1`. |
| `<Composer>` | 1244-1334 (welcome-state) **dan** 1418-1487 (active-chat) | **Dua instance terpisah**, JSX hampir identik (input, attach button, model/skill quick-toggle, tombol kirim) — kandidat kuat untuk **satu** komponen `<Composer>` yang dipakai di kedua tempat, bukan cuma dipecah tanpa disatukan. |
| `<AttachMenu>` (fungsi `renderAttachMenu`) | 415-514 | Sudah berupa fungsi terpisah, tinggal diubah jadi komponen file sendiri. Dipanggil dari 3 titik: mobile toolbar (1220), welcome-composer (1269), active-composer (1432). |
| `<AttachmentChips>` (fungsi `renderAttachmentChips`) | 334-413 | Sama, sudah fungsi terpisah. Dipanggil dari 4 titik. |
| `<ShareModal>` | 1490-1517 | Modal preview share (belum ada real link-sharing, cuma local text preview). |
| `<UpgradeModal>` | 1519-1631 | Modal upgrade paket saat model terkunci. |
| `<SettingsModal>` | 1633-2194 | Modal terbesar (560 baris). Shell (header+tab-nav): 1636-1674. Isi per tab (masing-masing kandidat sub-komponen sendiri): General (1675-1770), Personalization (1771-1860), Subscription (1861-1911), Data Controls (1912-1968), Security (1969-1993), Documents (1994-2029), Knowledge Base (2030-2155). Footer Batal/Simpan (2156-2189, cuma tampil di tab General & Personalization). |

**Rekomendasi urutan pemecahan** (risiko rendah → tinggi): `<AttachmentChips>`/`<AttachMenu>` (sudah fungsi, tinggal pindah file) → `<ShareModal>`/`<UpgradeModal>` (self-contained, sedikit prop) → tab-tab `<SettingsModal>` satu-satu → `<Composer>` (gabungkan 2 instance jadi 1, hati-hati prop count besar karena butuh hampir semua dari `useChatSession`+`useAttachments`+`useSkills`) → `<Sidebar>`✅/`<TopBar>`✅/`<ChatArea>` (paling banyak prop, paling berisiko salah kutip nama variabel — 2 dari 3 sudah selesai, lihat `MIGRATION_PROGRESS.md` langkah 13 & 14).

---

## 4. Known Issues Terbuka

**Tidak ada** known issue terbuka dari hook-extraction migration (langkah 1-12). Satu-satunya known issue yang tercatat di `MIGRATION_PROGRESS.md` (skill revert ke default setelah reload) **sudah RESOLVED** di commit `af4d82f`, sudah di-merge ke `main`, dan sudah diverifikasi ulang tidak regresi selama langkah 11-12.

Known issue level produk (bukan migrasi, dari `PROJECT_STATUS.md`, masih relevan): payment gateway belum terintegrasi, RAG masih full-text-only (belum ada embeddings), OCR belum ada untuk scanned PDF, image generation "Coming Soon" (tombol sudah ada di `renderAttachMenu`, disabled).

---

## 5. Peringatan Teknis — Hal yang Gampang Rusak Tanpa Sadar

### 5.1 Pola `queueMicrotask` — ada di 2 tempat, JANGAN dihapus tanpa paham kenapa

- **`hooks/useSkills.ts:78`** — di dalam effect fallback-pilih-skill-pertama:
  ```ts
  window.queueMicrotask(() => setSelectedSkillId(fallback.id));
  ```
  Ini menunda `setSelectedSkillId` satu microtask. Kalau dihapus (langsung `setSelectedSkillId(fallback.id)` sinkron di dalam effect), berpotensi memicu race yang mirip dengan known issue #1 yang sudah di-fix (lihat `MIGRATION_PROGRESS.md` — root cause aslinya soal timing antara efek fallback dan `loadLearningProfile`). Belum tentu bug yang PERSIS sama muncul lagi, tapi pola ini sengaja dipertahankan sebagai bagian dari fix, jangan disederhanakan tanpa re-test skenario reload berulang.
- **`hooks/useAttachments.ts:58`** — di effect hydrate `recentAttachments` dari `localStorage` saat mount:
  ```ts
  window.queueMicrotask(() => { setRecentAttachments(...) });
  ```
  Pola sama (tunda satu microtask setelah baca `localStorage`), tujuan serupa (hindari race dengan effect lain yang jalan di render yang sama).

### 5.2 `localStorage` key `ai-mu-study-mode` — persist HANYA di 2 titik yang disengaja

Setelah fix known issue #1, aturan ketat: `localStorage.setItem("ai-mu-study-mode", ...)` **hanya** boleh dipanggil di titik yang merepresentasikan **aksi eksplisit user memilih preferensi permanen** — bukan di titik yang cuma re-validasi/fallback sementara:

1. **`hooks/useSkills.ts:61`**, di dalam `selectSkill()` — user memang klik pilih skill dari dropdown.
2. **`hooks/useUserMemory.ts:112`**, di dalam `saveLearningProfile()` — user memang klik simpan di Settings > Personalization.

**Yang SENGAJA tidak persist** (kalau ada yang menambahkan `localStorage.setItem` di sini, itu regresi ke known issue #1): efek fallback pilih-skill-pertama di `useSkills.ts` (cuma in-memory), `applyUsageConstraints` (re-validasi turun tier, in-memory), `loadConversation` di `useChatSession.ts` (restore skill kontekstual per-percakapan, in-memory saja — ganti percakapan lama TIDAK boleh mengubah preferensi default user).

### 5.3 Solusi Final Circular Dependency `resetMemory` ↔ `useConversations`/`useChatSession`

Ini pola yang **berulang** di migrasi ini (juga terjadi antara `useUsage`/`useSkills` di langkah 6) — kalau nanti nambah hook baru dan ketemu pola serupa, ini template solusinya:

- **Gejala:** Hook A (`useConversations`) butuh memanggil sesuatu dari Hook B (`useChatSession`) di dalam salah satu fungsinya (`deleteConversation` perlu reset composer kalau percakapan yang dihapus itu aktif) — tapi Hook B butuh return value dari Hook A (`setConversations`, `activeConversation`) sebagai parameter constructor-nya. Tidak bisa keduanya di-construct duluan.
- **Solusi yang dipakai:** `resetMemory` diterima `deleteConversation` sebagai **parameter call-time opsional** (`deleteConversation(conversationId, resetMemory?)`), BUKAN parameter constructor hook. Konsekuensinya: `useConversations()` tidak butuh apa pun dari `useChatSession` saat di-construct → urutan panggil jadi searah: `useConversations()` → `useChatSession(...)` → `resetMemory` dikomposisi di `page.tsx` dari potongan kedua hook itu → `resetMemory` dioper ke `deleteConversation` di titik pemanggilan JSX (`onClick={() => deleteConversation(conversation.id, resetMemory)}`, satu-satunya call site, baris 719).
- **Kenapa bukan pola `applyUsageConstraints`** (pecah jadi fungsi biasa yang terima setter sebagai parameter, dipakai di langkah 6): karena `deleteConversation` **sudah** berupa fungsi yang dipanggil dari event handler (bukan sesuatu yang dijalankan otomatis oleh effect), jadi tinggal tambah parameter di titik panggil — lebih ringan daripada memecah hook jadi 2 lapis.
- **Kalau nemu pola serupa lagi:** tanya dulu "apakah fungsi yang butuh cross-hook call ini dipanggil dari event handler (bisa terima parameter call-time) atau dari effect otomatis (perlu closure/constructor param)?" Kalau event handler → pola call-time parameter (lebih murah). Kalau effect → harus pecah hook jadi lapis data + fungsi biasa (pola `applyUsageConstraints`).

### 5.4 Duplikasi JSX yang TERLIHAT identik tapi TIDAK 100% sama perilakunya

Kalau nanti componentize/konsolidasi `<Composer>`, `<AccountMenu>`, dll — cek dulu, jangan asumsikan 2 instance yang mirip itu boleh disatukan tanpa efek samping:

- Tombol **"Settings"** di `renderAttachMenu()` (baris 501-511, `onClick={() => { setIsSettingsOpen(true); setIsAttachMenuOpen(false); }}`) memanggil `setIsSettingsOpen(true)` **mentah**, BUKAN `openSettings()`. Beda dari entry point Settings lainnya (menu akun, dll) yang lewat `openSettings()` (yang me-reset `profileDraft`, `knowledgeMessage`, dll sebelum buka modal). Ini tampaknya disengaja (`openSettings()` sengaja punya efek samping reset form yang tidak selalu diinginkan dari shortcut cepat) — TAPI belum terverifikasi eksplisit ini bug atau fitur. Kalau dikonsolidasi jadi satu komponen, jangan diam-diam "diperbaiki" jadi konsisten tanpa mengecek behavior yang diharapkan dulu.
- Tombol **"Knowledge source upload"** di `renderAttachMenu()` (476-489) melakukan `setActiveSettingsTab("knowledge"); setIsSettingsOpen(true);` — juga BYPASS `openSettings("knowledge")`, sama pola di atas.
- Account menu ada **2 instance** (sidebar bawah, baris 759-860; TopBar kanan atas, baris 1077+) — pakai state `isAccountMenuOpen` yang **sama** (jadi keduanya buka/tutup bersamaan), tapi JSX-nya beda (posisi popover, mungkin item menu beda juga — cek isi keduanya sebelum digabung).
- Composer welcome-state (1244-1334) TIDAK punya toggle "study mode badge" inline seperti composer active-chat (1454-1460, `hidden ... sm:inline-flex` dengan badge tier) — kemungkinan cuma belum sempat disamakan, bukan disengaja beda. Cek referensi Stitch untuk desain final sebelum memutuskan mana yang benar.

### 5.5 `page.tsx`-local `supabase` client sudah dihapus

Sejak langkah 12, **tidak ada lagi** `supabase` client di-`useMemo` di level `page.tsx`. Setiap hook bikin client sendiri via `createSupabaseBrowserClient()` per fungsi (pola konsisten di semua 11 hook — client Supabase browser ringan, tidak perlu di-share/cache). Kalau nambah kode baru di `page.tsx` yang butuh query Supabase langsung, jangan asumsikan ada `supabase` const tersedia — import `createSupabaseBrowserClient` sendiri atau (lebih baik) taruh logic itu di dalam hook yang relevan.

### 5.6 `SettingsTab` type tinggal di `lib/mappers/types.ts`, bukan lokal `page.tsx`

Kalau nambah tab settings baru, edit `SettingsTab` union di `lib/mappers/types.ts` (bukan di `page.tsx`) — dipakai oleh `page.tsx` (const `settingsTabs` array) DAN `hooks/useSettingsPanel.ts`.

---

## 6. Referensi `stitch-reference/` — Halaman Mana Match ke Hook/Komponen Apa

Desain sistem token ada di `stitch-reference/sang_surya_design_system/DESIGN.md` (warna, tipografi, spacing, elevation, shape — beda total dari palet hijau/emas Muhammadiyah yang disebut `CLAUDE.md`; **klarifikasi ke user dulu** sebelum pakai token warna dari file ini, kemungkinan ini placeholder/draft lama, bukan final).

| File Stitch | Halaman/rute target (`CLAUDE.md`) | Hook/JSX saat ini yang relevan | Catatan gap |
|---|---|---|---|
| `workspace_chat_ai_muhammadiyah_standardized/` | `/workspace/[id]` — halaman chat utama | **Semua** hook (semua 11) + hampir semua JSX di bagian 3 | **Gap arsitektur besar** (sebagian besar masih terbuka): Stitch pakai layout 4-panel (icon rail 60px + workspace-list sidebar 260px + chat area + knowledge sidebar kanan 240px `hidden lg:flex`). Kode saat ini cuma 1 sidebar gabungan (340px, **sudah direstyle** ke tema hijau tua Stitch di `components/Sidebar.tsx` — lihat `MIGRATION_PROGRESS.md` langkah 13) + 1 header (**sudah diekstrak** ke `components/TopBar.tsx`, tapi **belum direstyle** — lihat langkah 14, warna sengaja dibiarkan sama karena hampir semua token-nya masih dipakai bersama ChatArea/Composer/MobileToolbar/modal yang belum diekstrak, restyle sendirian akan bikin jahitan visual) + chat area, **masih belum ada** icon rail terpisah atau knowledge sidebar kanan, **masih belum ada** tab nav Chat/Docs/Tasks/Sheets/Canvas (Stitch header punya ini, TopBar kita tidak — fitur 4-tools belum dibangun). Restyle Sidebar yang sudah dilakukan sengaja **tidak** mengadopsi split 4-panel ini — itu tetap perlu keputusan struktural terpisah (component baru, bukan cuma ganti className) sebelum dikerjakan. **Palette unifikasi TopBar↔ChatArea↔Composer↔MobileToolbar↔modal** juga tertunda — direkomendasikan dikerjakan sekaligus (bukan per-komponen) begitu semuanya sudah jadi komponen terpisah, supaya tidak ada restyle bertahap yang bikin belang warna sementara. |
| `settings_ai_muhammadiyah_standardized/` | `/settings` (halaman sendiri, bukan modal) | `useSettingsPanel`, `<SettingsModal>` (bagian 3) | **Gap arsitektur**: Stitch = halaman penuh dengan `SideNavBar` fixed 264px (bukan modal overlay). Kode saat ini = modal (`isSettingsOpen` overlay, `fixed inset-0`). Migrasi ke halaman sendiri (routing App Router baru) berarti `useSettingsPanel`'s `isSettingsOpen`/`setIsSettingsOpen` kemungkinan tidak relevan lagi (diganti routing), tapi `activeSettingsTab`, `settingsDataMessage`, dan 4 fungsi aksinya kemungkinan besar tetap reusable. |
| `personalization_ai_muhammadiyah_standardized/` | `/settings/personalization` (halaman sendiri) | `useUserMemory` (`learningProfile`, `profileDraft`, `saveLearningProfile`, dst), tab Personalization di `<SettingsModal>` (baris 1771-1860) | Sama seperti Settings — Stitch = halaman + `SideNavBar`, bukan tab-dalam-modal. Field-field form kemungkinan sudah dekat 1:1 dengan `UserMemory` type (`lib/memory/user-memory.ts`) tapi belum diverifikasi field-by-field. |
| `login_ai_muhammadiyah_standardized/` | `/login` | `hooks/useAuthSession.ts` (redirect logic), halaman `app/login/` terpisah (di luar `page.tsx`) | Di luar scope `page.tsx` — cek `app/login/` langsung. |
| `ai_muhammadiyah_home_mobile/` | `/` (landing publik) | Tidak ada — `page.tsx` adalah halaman APLIKASI (post-login), bukan landing page publik | Landing page kemungkinan file terpisah/belum ada, cek `app/page.tsx` vs kemungkinan `app/(marketing)/page.tsx` atau serupa. |
| `docs_...`, `tasks_...`, `sheets_...`, `canvas_...` (4 tools) | `/workspace/[id]/docs` dst | **Belum ada hook maupun tabel DB** (`docs`, `tasks`, `sheets`, `canvases` belum dibuat — lihat `CLAUDE.md` bagian "Tabel BARU yang akan dibuat") | Di luar scope dokumen ini — ini fitur baru, bukan refactor dari yang sudah ada. |
| `muhammadiyah_hub_browser_standardized/`, `research_...`, `library_...`, `pricing_...` | `/hub`, `/research`, `/library`, `/pricing` | `hub_links` (ditunda per `CLAUDE.md`), `subscriptionPlans` (`lib/subscriptions/plans.ts`) untuk pricing | Sebagian besar halaman baru, di luar `page.tsx`. `pricing_...` kemungkinan overlap dengan `<UpgradeModal>` (baris 1519-1631) dan `app/plans/` — cek dulu apakah `/plans` route yang ada sekarang harusnya diganti/redirect ke desain Stitch ini. |

**Rekomendasi untuk sesi integrasi UI:** karena gap struktural (bagian layout 4-panel untuk chat, dan modal→halaman untuk Settings/Personalization) lebih besar dari sekadar restyle, jangan mulai dari "ganti className di JSX yang ada" — mulai dari memutuskan struktur komponen/routing baru dulu (kemungkinan: `<IconRail>`, `<WorkspaceSidebar>` terpisah dari `<Sidebar>` gabungan sekarang, `<KnowledgeSidebar>` baru), baru pindahkan logic dari hook-hook yang sudah ada (bagian 1) ke komponen-komponen baru itu sebagai props — hook-hooknya sendiri kemungkinan besar TIDAK perlu diubah (mereka sudah domain-pure, tidak tahu apa-apa soal layout).
