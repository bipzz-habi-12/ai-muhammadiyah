# M-Agent Project Status

Last updated: August 24, 2026 (Langkah 52a)

> This file describes the state of the code as it exists now. For the reasoning
> behind each change — including traps hit along the way — read
> `MIGRATION_PROGRESS.md`, which is the running log. `CLAUDE.md` holds the rules
> that bind future changes.

## Project Overview

M-Agent (formerly "AI Muhammadiyah", renamed in Langkah 44) is a customizable AI platform for learning, work, research, and building, grounded in Islam Berkemajuan values and the Muhammadiyah Knowledge Base. It is an independent product, not an official channel of Persyarikatan Muhammadiyah; it answers *with reference to* Muhammadiyah scholarship without speaking on its behalf. Live at **aimuhammadiyah.my.id**.

The product direction is Master Plan v2: **Workspace + Chat + Skill (slash command) + Artifacts**. The v1 plan of four rigid tools (Docs, Tasks, Sheets, Canvas) was deleted and replaced by the Artifacts system; the v1 tables were torn down in migration `20260711000000_teardown_v1_tools.sql`.

Target users: students, teachers, lecturers, researchers, developers, organizations, schools, hospitals, companies, and the general public — open to everyone, not only Muhammadiyah members.

## Architecture Summary

| Area | Current Implementation |
| --- | --- |
| Frontend | Next.js 16 App Router (Turbopack), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API routes; Node.js runtime for document processing |
| Auth | Supabase Auth via `@supabase/ssr` — email OTP (6 digit) + OAuth Google & GitHub |
| Database | Supabase Postgres with RLS policies and RPC usage functions |
| AI Providers | OpenAI Responses API (4 named models, tried first), Gemini 2.5, OpenRouter fallback, local mock fallback |
| Tool calling | Gemini function calling with 6 tools (`lib/ai/tools.ts`), max 3 rounds |
| Billing | Stripe Checkout (hosted) + Billing Portal + signed webhook |
| Connectors | Google Drive via OAuth `drive.file` scope, refresh token encrypted AES-256-GCM |
| Knowledge Base | Phase 1 RAG — Postgres full-text search (`plainto_tsquery`), no embeddings |
| Second Brain notes | Hybrid retrieval — pgvector embeddings (1536-dim) + full-text |
| Storage | Optional Supabase Storage backup for uploaded documents |
| Document Parsing | PDF, DOCX, PPTX, XLSX extraction |
| Multimodal Input | PNG, JPG/JPEG, WEBP image upload for vision-capable routes |
| Sandboxing | Mini-app artifacts run in `<iframe sandbox>` (`lib/sandbox/mini-app.ts`) |

Core directories:

- `app/` - pages and API routes (chat, workspace, library, hub, research, work, history, settings, plans, auth)
- `components/` - chat shell, composer, sidebar, artifact panel, modals, auth UI
- `lib/ai/` - model routing, prompts, streaming, tool calling, context window
- `lib/connectors/` - Google OAuth, Drive client, token encryption
- `lib/second-brain/` - notes, chunking, embeddings, Logseq import/export, device sync
- `lib/research/` - OpenAlex client, planner, screening, synthesis
- `lib/hub/`, `lib/hub.ts` - Muhammadiyah Hub directory
- `lib/documents/` - document extraction helpers
- `lib/knowledge.ts` - knowledge chunking and retrieval
- `lib/memory/` - user learning profile memory
- `lib/skills.ts` - skill catalog, slash commands, tier access
- `lib/artifacts.ts`, `lib/sandbox/` - artifact parsing and mini-app sandboxing
- `lib/subscriptions/`, `lib/usage/` - plans, Stripe, quotas, token windows
- `lib/supabase/` - browser/server Supabase clients
- `supabase/migrations/` - schema, RLS, RPCs, indexes, seeds

## Completed Features

Chat & core:

- [x] Authenticated access with Supabase Auth (email OTP + Google/GitHub OAuth)
- [x] Streaming AI chat with provider fallback chain
- [x] Persistent conversations and messages, rename, pin, delete, move to workspace
- [x] Markdown + math rendering, Mermaid diagrams
- [x] Continue-answer, export chat as Markdown, share preview
- [x] Learning profile memory and theme/default-model preferences
- [x] Token-window usage tracking (5-hour session + weekly) with model access control

v2 systems:

- [x] Workspaces holding many chats, with workspace-level system instructions
- [x] Skills as slash commands (`/`) — platform skills + user custom skills, per-message via `messages.skill_id`
- [x] Artifacts (document, table, diagram, code) with side panel and Library aggregation
- [x] Mini-application artifacts rendered in a sandboxed iframe
- [x] Muhammadiyah Hub directory with admin curation and public read
- [x] Research page with a 3-stage deep funnel (plan → sweep → screen) over OpenAlex
- [x] Second Brain notes: import/export, device sync, rate limiting, hybrid retrieval
- [x] Real web search via Gemini `google_search`, with clickable source links
- [x] Tool calling: `cari_catatan`, `cari_pengetahuan`, `cari_web` + 3 Google Drive tools
- [x] Stripe Checkout, Billing Portal, and signed webhook (code complete)
- [x] Google Drive connector code path (`drive.file` scope, encrypted refresh token)
- [x] Clarifying questions: the AI asks back with clickable choice cards when a request is genuinely ambiguous (Langkah 52), and a turn that only asks is waived from the token meter (Langkah 52a)

UI shell (Langkah 51):

- [x] Single left sidebar — navigation, new chat, search, history, and account in one panel
- [x] Knowledge sidebar shown only when the user actually has knowledge sources
- [x] Randomized welcome greeting, hydration-safe via `useSyncExternalStore`

## Model System

Since Langkah 39 the UI exposes **four named models**, all of them OpenAI routes with their own API key so rate limits do not knock each other over. Gemini and then OpenRouter remain the automatic fallback for every model.

| Model | Engine | Internal route | Minimum tier |
| --- | --- | --- | --- |
| Aether | `gpt-5.6-sol` | fast | Muallim Pro |
| Cosmos | `gpt-5.6-terra` | smart | Muallim Pro |
| Prism | `gpt-5.6-luna` | smart | Free |
| Velo | `gpt-5.5-pro` | document | Free |

Effort levels per message: **Rendah, Sedang (default), Tinggi, Ekstra, Ultra** — higher effort thinks longer and burns quota faster.

**Trap on record:** model ids are validated in four places in the database (`usage_logs.model_used` CHECK, `allowed_models` in `get_subscription_limits`, and the chat tables). Adding or renaming a model means touching all of them — see `20260801000000_new_model_ids_and_drop_study_modes.sql`.

### Routing order

**OpenAI is tried first on every route for every tier, including Free**, whenever a key is set. Tier affects which models the picker offers and the quality of the Gemini fallback (Pro vs Flash), not whether GPT answers.

One documented exception: time-sensitive questions detected by `needsWebSearch()` go straight to Gemini, because the OpenAI Responses API has no direct search tool and Gemini does. Since Langkah 50, that path runs through tool calling — web search is now the `cari_web` tool, which makes a *separate* nested Gemini call with `google_search` enabled. This exists because Gemini rejects built-in tools and function declarations in the same request (HTTP 400, verified against the live API).

### Provider defaults

- Per-model OpenAI keys: `OPENAI_API_KEY_AETHER` / `_COSMOS` / `_PRISM` / `_VELO`, each falling back to the shared `OPENAI_API_KEY`
- Per-model OpenAI model ids: `OPENAI_MODEL_AETHER` / `_COSMOS` / `_PRISM` / `_VELO`, falling back to `OPENAI_MODEL`
- Gemini Flash: `GEMINI_FLASH_MODEL` or `GEMINI_MODEL`, default `gemini-2.5-flash`
- Gemini Pro: `GEMINI_PRO_MODEL`, default `gemini-2.5-pro`
- OpenRouter: `OPENROUTER_MODEL`, default `openrouter/free`

### Fallback behavior

- OpenAI failure falls back to Gemini unless `GPT_TEST_MODE=true`
- Gemini Pro failure falls back to Gemini Flash
- Gemini unavailability falls back to OpenRouter when configured
- With no provider keys at all, the app returns a local mock response for development
- Provider, model, fallback event, finish reason, and continuation metadata are logged into usage metadata

## Skills (replaces Study Modes)

The seven study modes (Quick Explain, Cambridge Tutor, OSN Coach, Islamic Teacher, Coding Mentor, Research Mode, Step-by-Step) were **removed** in `20260801000000_new_model_ids_and_drop_study_modes.sql`. `lib/study-modes.ts` still exists only because `lib/memory/user-memory.ts` persists a legacy `default_study_mode` column; it is not part of the product surface.

Skills replaced them:

- Activated per message by typing `/` at the start of the composer, which opens a picker
- Each skill has a unique `slash_command` (e.g. `/coding`, `/riset`, `/tarjih`)
- Platform skills are seeded; users can create custom skills (name, category, instructions, slash command)
- Free tier is limited to **3 custom skills** (`FREE_CUSTOM_SKILL_LIMIT`), enforced server-side; paid tiers unlimited
- The active skill is recorded on `messages.skill_id`

Each AI response composes three layers: **workspace system instructions + active skill + chat history**.

## Subscriptions

Quotas are **token windows**, not daily message counts. Two windows apply simultaneously: a 5-hour session window and a weekly window.

| Tier | Price | Session tokens (5h) | Weekly tokens | Models |
| --- | ---: | ---: | ---: | --- |
| Gratis | Rp0 | 160rb | 960rb | Prism, Velo |
| Kader Pintar | Rp29.000 | 800rb | 5,6jt | Prism, Velo |
| Muallim Pro | Rp79.000 | 2,4jt | 16jt | All four |
| Dakwah Digital | Rp149.000 | 4,8jt | 32jt | All four |
| Sinergi Ranting | Rp299.000 | 16jt | 112jt | All four |

Status:

- [x] Tier model, token-window enforcement, model access enforcement
- [x] Free subscription auto-provisioning, usage logs
- [x] Stripe Checkout (hosted), Billing Portal, signed webhook, plan change endpoint
- [ ] Live payments — every paid CTA stays disabled ("Segera hadir") while `STRIPE_SECRET_KEY` is empty
- [ ] Team seat management

Rules that must not be broken when touching billing (see `CLAUDE.md`):

- Plan button behavior always goes through `resolveBillingAction()`
- A user with an active subscription must never be sent to Checkout — use `/api/billing/change-plan`
- Subscription state is only ever written by `apply_stripe_subscription` (service role) triggered by a signed webhook
- IDR is **not** zero-decimal in Stripe: Rp29.000 → `2900000`

## Retrieval Status

Two separate retrieval systems, at different maturity levels — do not conflate them.

### Knowledge Base (Phase 1, full-text only)

- [x] `knowledge_sources` and `knowledge_chunks` tables
- [x] Admin-only upload (`KNOWLEDGE_ADMIN_EMAILS` or admin metadata)
- [x] PDF/DOCX/PPTX/XLSX ingestion, chunking with overlap
- [x] `search_knowledge_chunks` RPC using `plainto_tsquery`
- [x] Prompt grounding with source title and chunk number
- [ ] pgvector embeddings, semantic retrieval, hybrid reranking
- [ ] Source management dashboard beyond upload/list
- [ ] Chunk quality review, automated citation validation

### Second Brain notes (hybrid, already semantic)

- [x] `note_chunks` with 1536-dim embeddings (`text-embedding-3-small`)
- [x] Embedding nullable by design — notes stay findable through full-text when embedding fails
- [x] Device sync (push/pull/query), Logseq import/export, sync rate limiting
- [x] `search_notes_for_user` RPC, surfaced to the model as the `cari_catatan` tool

## Artifacts

Artifacts are substantial outputs that appear in the right-hand panel while the AI works; the AI decides the form, the user does not pick a page type first. Stored in the `artifacts` table and aggregated in `/library`.

| Category | Examples | Render |
| --- | --- | --- |
| Document & data | Reports, summaries, tables | Rich text / grid viewer |
| Visual | Diagrams, mockups, charts | SVG/canvas viewer, Mermaid |
| Code | Snippets, scripts, functions | Highlighted viewer + copy/download |
| Mini application | Games, calculators, interactive tools | Sandboxed iframe |

Mini applications are the highest-risk component and run inside `<iframe sandbox>` isolated from the host page, with a CDN allowlist — never `dangerouslySetInnerHTML`.

## Work / Connectors

`/work` is a connection hub, not a prompt-template launcher (the four work skills from Langkah 49 were deleted at the user's request before any migration was applied).

- Google OAuth with **`drive.file` scope only** — deliberately non-sensitive, so no CASA audit, no 100-user cap, no 7-day refresh-token expiry. The app only sees files it created or the user picked.
- **Adding any restricted scope (Gmail, full Drive) drops the entire app into the audit regime** — warning is in `lib/connectors/google.ts`.
- Refresh tokens: AES-256-GCM encrypted, and `user_connections` has RLS enabled with **zero policies** for `authenticated`/`anon` (deny-all). Do not add a "users can select their own connection" policy — that would make tokens harvestable from devtools.
- UI connection status comes from the `get_my_connections` RPC (security definer), which never returns token columns.

Not usable until the operator does three things: create the Google Cloud OAuth client, register the redirect URI, and apply `20260814000000_user_connections.sql`. Until then `/work` renders honestly as "Belum dikonfigurasi" and names the missing env vars — it does not error.

## Workspace System

- [x] `chat_workspaces` table with per-user ownership and RLS
- [x] One workspace holds **many** chats (changed in v2; it used to be one chat per workspace)
- [x] Workspace-level `system_instructions` inherited by every chat inside it
- [x] Conversation `workspace_id`, pinning via `is_pinned`, reassignment from the sidebar kebab menu
- [x] Sidebar grouping by pinned and workspace sections

Conversations with no workspace stay in the General group.

## UI Shell

- Single left sidebar (272px, collapses to 64px): logo, new chat, search, section nav (Workspaces, Work, Research, Library, Hub, History), chat history, internal links, account footer. `components/IconRail.tsx` was deleted in Langkah 51 and merged into `components/Sidebar.tsx`.
- Other full-shell pages (`/library`, `/hub`, `/research`, `/work`, `/workspace`, `/settings/personalization`) use `AppShellRail` and already had a single rail.
- Right panel: the Artifact panel takes over when open; otherwise the Knowledge sidebar appears **only if the user has knowledge sources**. Adding sources is always available under Settings → Knowledge Base.
- Design v2 palette and fonts (Hanken Grotesk + Newsreader) are applied app-wide — see `CLAUDE.md` for the tokens any new UI must follow.
- AI messages render without bubbles (Claude-style, not ChatGPT-style).
- Below a finished AI message: web source chips, Second Brain note suggestions, and — when the reply carries an `[[AI_MU_ASK]]` block — a clarifying-question card (`components/AskUserQuestion.tsx`). All three render only after streaming ends. The card locks into a read-only state once answered, or once it is no longer the last message.

## Supabase Migrations

Applied in production unless noted:

- `20260530000000_chat_history.sql` - conversations, messages, RLS, update triggers
- `20260530010000_usage_and_subscriptions.sql` - tiers, profiles, usage logs, usage RPCs
- `20260530020000_fix_usage_defaults.sql` - free-tier default repair and backfill
- `20260530030000_user_memory.sql` - learning profile memory
- `20260531000000_user_settings_preferences.sql` - theme, default model, default study mode
- `20260601000000_study_modes.sql` - study mode persistence (superseded, see below)
- `20260601010000_knowledge_base.sql` - Phase 1 RAG tables, full-text search, RLS
- `20260602000000_chat_workspaces.sql` - workspace table, pinning, ownership checks
- `20260602010000_performance_indexes.sql` - trigram and lookup indexes
- `20260704000000_docs_tasks_sheets_canvases.sql` - v1 tools (deprecated)
- `20260704010000_seed_platform_skills.sql` - platform skill seeds
- `20260704020000_skills_tier_access.sql` - skill tier gating
- `20260711000000_teardown_v1_tools.sql` - removes the v1 Docs/Tasks/Sheets/Canvas tables
- `20260711010000_artifacts_and_workspace_system.sql` - `artifacts` table, workspace system instructions
- `20260722000000_hub_resources.sql` - Muhammadiyah Hub directory + RLS
- `20260722010000_hub_keywords_and_shalat_seed.sql`, `20260722020000_hub_topics_seed.sql` - Hub seeds
- `20260725000000_skill_slash_commands.sql` - unique slash commands
- `20260725010000_seed_varied_platform_skills.sql`, `20260725020000_deepen_platform_skills.sql` - skill seeds
- `20260728000000_free_tier_smart_model.sql` - free tier smart-model access
- `20260729000000_usage_windows_and_context.sql` - session/weekly token windows + context window
- `20260730000000_drop_stale_usage_overloads.sql` - removes stale RPC overloads
- `20260731000000_stripe_billing.sql` - Stripe subscription state + `apply_stripe_subscription`
- `20260801000000_new_model_ids_and_drop_study_modes.sql` - four named model ids, drops study modes
- `20260801010000_chat_tables_new_model_ids.sql` - chat tables accept the new model ids
- `20260802000000_gate_aether_cosmos_muallim_pro.sql` - Aether/Cosmos gated to Muallim Pro+
- `20260806000000_second_brain_notes.sql` - notes, chunks, pgvector extension
- `20260807000000_second_brain_sync.sql`, `20260807010000_fix_note_deletion_on_user_delete.sql`, `20260807020000_sync_rate_limit.sql` - device sync, cascade fix, rate limit
- `20260808000000_search_notes_for_user.sql` - hybrid note search RPC
- `20260813000000_rebrand_platform_skill_prompts.sql` - rebrand inside seeded skill prompts
- `20260814000000_user_connections.sql` - encrypted connector tokens, deny-all RLS. **Recorded as not yet applied** in `MIGRATION_PROGRESS.md` (Langkah 50); confirm against the live database before relying on it.

```bash
supabase db push
```

Back up before applying anything, per `CLAUDE.md`.

## Environment Variables

Every variable the code actually reads (`process.env`), grouped by purpose.

```bash
# Supabase (required to boot)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=

# OpenAI — shared fallback
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-terra

# OpenAI — per model (preferred; falls back to the shared pair above)
OPENAI_API_KEY_AETHER=
OPENAI_MODEL_AETHER=gpt-5.6-sol
OPENAI_API_KEY_COSMOS=
OPENAI_MODEL_COSMOS=gpt-5.6-terra
OPENAI_API_KEY_PRISM=
OPENAI_MODEL_PRISM=gpt-5.6-luna
OPENAI_API_KEY_VELO=
OPENAI_MODEL_VELO=gpt-5.5-pro

# Embeddings (Second Brain)
OPENAI_API_KEY_EMBED=
OPENAI_EMBED_MODEL=text-embedding-3-small

# Gemini + OpenRouter
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FLASH_MODEL=gemini-2.5-flash
GEMINI_PRO_MODEL=gemini-2.5-pro
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CURRENCY=idr
STRIPE_PRICE_KADER_PINTAR=
STRIPE_PRICE_MUALLIM_PRO=
STRIPE_PRICE_DAKWAH_DIGITAL=
STRIPE_PRICE_SINERGI_RANTING=

# Google Drive connector
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CONNECTION_ENCRYPTION_KEY=

# Admin + site
KNOWLEDGE_ADMIN_EMAILS=
HUB_ADMIN_EMAILS=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_APP_URL=
GPT_TEST_MODE=false
AI_MU_VERBOSE_LOGS=false
```

Scripts under `scripts/` additionally use `AIMU_SYNC_TOKEN` and `AIMU_SYNC_API` for note sync. These identifiers keep the old brand on purpose — see `CLAUDE.md`.

Notes:

- Supabase URL and anon key are required for the app to boot.
- Service role key and storage bucket are only needed for server-side storage backup.
- At least one AI provider key should be configured for production; without any, local development falls back to mock chat output.
- `CONNECTION_ENCRYPTION_KEY` must be at least 32 characters.
- The Google redirect URI is derived from `NEXT_PUBLIC_SITE_URL`, so local testing needs `http://localhost:3000/api/connectors/google/callback` registered as well.

## Deployment Steps

1. Create or select a Supabase project.
2. Back up, then apply migrations with `supabase db push` or in order via the SQL Editor.
3. Configure Supabase Auth providers (email OTP, Google, GitHub) and redirect URLs.
4. Create the storage bucket named by `SUPABASE_STORAGE_BUCKET` if document backup is required.
5. Add environment variables to the hosting platform.
6. Deploy to Vercel (production deploys from `main`).
7. Run a production build:

```bash
npm run build
```

8. Smoke-test:

- [ ] Register/login flow (OTP and OAuth)
- [ ] Chat streaming and provider fallback
- [ ] Token-window quota check and premium model blocking on Free
- [ ] PDF/DOCX/PPTX/XLSX upload, image upload
- [ ] Workspace creation, chat reassignment, workspace system instructions
- [ ] Slash skill picker and custom skill creation
- [ ] Artifact generation, Library listing, mini-app sandbox
- [ ] Knowledge upload as admin and retrieval on Muhammadiyah/ISMUBA-style questions
- [ ] Web search on a time-sensitive question, with working source links

## Local Development Steps

```bash
npm install
cp .env.example .env.local
supabase db push
npm run dev
```

Open `http://localhost:3000`. Useful checks:

```bash
npm run lint
npm run build
```

## Known Issues

- `20260814000000_user_connections.sql` has not been applied, and the Google OAuth client does not exist yet, so the Drive connector is code-only. The OAuth flow, real Google Docs creation, and Drive file reads are **untested end to end**.
- Live payments are inactive until Stripe env values are filled; paid CTAs stay disabled by design.
- Tool calling is **Gemini-only**. The OpenAI Responses API has no tool adapter yet, so most messages (which GPT answers) never use tools. This is why tool wiring is locked to the `needsWebSearch()` trigger.
- The entry point to tools is still a keyword heuristic. Once an OpenAI adapter exists, the heuristic can be deleted and the decision left to the model.
- `cari_catatan` / `cari_pengetahuan` have not been tested with a logged-in session returning non-empty results; only the path and empty-result handling are proven.
- Knowledge Base RAG is full-text only — no embeddings, no semantic search. Second Brain notes are the only semantic retrieval in the product.
- Scanned PDFs and image-only documents may extract little or nothing; OCR is not implemented.
- Image generation is marked coming soon and needs a provider workflow.
- Knowledge upload requires admin metadata on the Supabase auth user or an entry in `KNOWLEDGE_ADMIN_EMAILS`.
- `lib/study-modes.ts` and the `default_study_mode` column are dead weight kept alive by `user-memory.ts`; study modes are gone from the product.
- README is still close to the default Next.js starter.
- `.env.example` does not list every runtime variable the app reads.

## Performance Optimizations

Implemented:

- Recent conversation index by user and update time; message index by conversation and creation time
- Workspace lookup and pinned-ordering indexes
- Trigram indexes for conversation title and message content search
- Full-text GIN index for knowledge chunk search; pgvector index for note chunks
- Prompt trimming for recent messages, document context, and knowledge chunks
- Context-window accounting per model (`lib/ai/context-window.ts`)
- Upload size limit of 25 MB and image payload validation before routing
- Streaming responses and a provider fallback chain

Recommended follow-ups:

- Observability for provider latency, fallback rates, and token usage
- Query plans for sidebar and search paths once production data grows
- pgvector for the Knowledge Base, with reranking to limit prompt context
- Server-side caching for knowledge source lists
- Background ingestion for large knowledge sources

## Maintenance Checklist

Weekly:

- [ ] Review AI provider failures and fallback events
- [ ] Check Supabase usage logs and quota anomalies
- [ ] Verify chat streaming in production
- [ ] Review failed document extraction reports
- [ ] Audit knowledge source and Hub entry quality

Monthly:

- [ ] Run production build and lint checks
- [ ] Review Supabase indexes and slow queries
- [ ] Validate RLS policies after schema changes — especially `user_connections` (must stay deny-all)
- [ ] Rotate or audit provider keys, Stripe keys, and `CONNECTION_ENCRYPTION_KEY`
- [ ] Reconcile subscription records against Stripe
- [ ] Update `.env.example` when runtime variables change

Before release:

- [ ] Back up the database, then apply migrations in order
- [ ] Smoke-test auth, chat, uploads, workspaces, skills, artifacts, and knowledge upload
- [ ] Confirm provider keys are present
- [ ] Confirm free-tier blocking and premium-tier access
- [ ] Confirm admin users have correct metadata

## Future Roadmap

### Near term

- OpenAI tool-calling adapter, then delete the `needsWebSearch()` heuristic
- Finish the Google Drive connector end to end (OAuth client, migration, live test)
- Turn on Stripe in production
- Replace the starter README with real product setup documentation
- Admin subscription management UI
- OCR for scanned PDFs

### RAG Phase 2 (Knowledge Base)

- pgvector embeddings and semantic search, mirroring what Second Brain notes already do
- Hybrid full-text + vector retrieval with reranking
- Chunk review and source versioning

### Product expansion

- Job queue for background execution (Tahap 3 of the "Cowork-like" subsystems)
- Muhammadiyah Hub linking (`hub_links`) — deliberately deferred until Artifacts are stable
- Team and school workspace administration, shared organizational knowledge bases
- Voice input/output, image generation
- Exportable study notes, quizzes, and worksheets

### Reliability

- Provider health monitoring, retry and circuit-breaker strategy
- Structured logs and dashboards
- Automated regression tests for routing, quotas, uploads, tools, and RAG
- Load testing for large chat histories and knowledge sources
