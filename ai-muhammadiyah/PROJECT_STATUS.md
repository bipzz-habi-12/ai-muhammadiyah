# AI Muhammadiyah Project Status

Last updated: June 4, 2026

## Project Overview

AI Muhammadiyah is a modern Islamic education AI platform built for Muhammadiyah learning communities, schools, teachers, students, and organizational teams. The product combines authenticated AI chat, persistent learning history, document analysis, study-mode personalization, subscription-based usage limits, and an early internal knowledge base for Muhammadiyah/education content.

The current product direction is a premium learning assistant with a balanced Muhammadiyah educational tone: practical, adab-aware, academically useful, and suitable for Islamic studies, Cambridge-style learning, OSN/STEM preparation, coding mentorship, research, writing, and productivity support.

## Architecture Summary

| Area | Current Implementation |
| --- | --- |
| Frontend | Next.js App Router, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API routes with Node.js runtime for document processing |
| Auth | Supabase Auth via `@supabase/ssr` |
| Database | Supabase Postgres with RLS policies and RPC usage functions |
| AI Providers | Gemini, OpenAI Responses API, OpenRouter fallback, local mock fallback |
| Storage | Optional Supabase Storage backup for uploaded documents |
| Document Parsing | PDF, DOCX, PPTX, XLSX extraction |
| Multimodal Input | PNG, JPG/JPEG, WEBP image upload support for vision-capable AI routes |
| Knowledge Base | Phase 1 RAG using Postgres full-text search |

Core directories:

- `app/` - pages, API routes, chat UI, auth pages, plans page
- `components/` - authentication and reusable UI components
- `lib/ai/` - model routing, prompts, provider integration, streaming
- `lib/documents/` - document extraction helpers
- `lib/knowledge.ts` - knowledge chunking and retrieval helpers
- `lib/memory/` - user learning profile memory
- `lib/subscriptions/` and `lib/usage/` - plans, quotas, model access
- `lib/supabase/` - browser/server Supabase clients
- `supabase/migrations/` - database schema, RLS, RPCs, indexes

## Completed Features

- [x] Authenticated user access with Supabase Auth
- [x] Streaming AI chat endpoint
- [x] Persistent conversations and messages
- [x] Conversation title, selected model, study mode, document metadata persistence
- [x] Learning profile memory for user preferences
- [x] Default model, default study mode, and theme preference storage
- [x] Daily usage tracking for messages and uploads
- [x] Subscription tier foundation with model access controls
- [x] Plans page and plan catalog
- [x] Multi-document upload support
- [x] PDF, DOCX, PPTX, and XLSX text extraction
- [x] Image attachment support for PNG, JPG/JPEG, and WEBP
- [x] Workspace grouping for chat history
- [x] Conversation pinning
- [x] Admin-only knowledge source upload
- [x] Knowledge source listing
- [x] RAG prompt injection when relevant knowledge chunks are found
- [x] Production performance indexes for sidebar, search, workspace, and message lookups

## GPT / Gemini / OpenRouter Routing

AI routing is implemented in `lib/ai/chat.ts`.

### Model Routes

| Route | Purpose | Provider Strategy | Access |
| --- | --- | --- | --- |
| `auto` | Selects the best available route based on message context | Routes to `fast`, `smart`, or `document` when allowed | Free+ |
| `fast` | Fast daily learning chat | Gemini Flash, then OpenRouter fallback | Free+ |
| `smart` | Reasoning, analysis, strategy, complex study tasks | OpenAI GPT for premium users, then Gemini, then OpenRouter | Kader Pintar+ |
| `document` | Long-context document and image/document analysis | Gemini Pro for eligible tiers, Gemini Flash fallback, OpenRouter fallback | Muallim Pro+ |

### Provider Defaults

- OpenAI model: `OPENAI_MODEL`, default `gpt-5-mini`
- Gemini Flash model: `GEMINI_FLASH_MODEL` or `GEMINI_MODEL`, default `gemini-2.5-flash`
- Gemini Pro model: `GEMINI_PRO_MODEL`, default `gemini-2.5-pro`
- OpenRouter default model: `OPENROUTER_MODEL`, default `openrouter/free`

### Fallback Behavior

- If Smart route OpenAI fails, the system falls back to Gemini unless `GPT_TEST_MODE=true`.
- If Gemini Pro fails, the system falls back to Gemini Flash.
- If Gemini is unavailable, the system falls back to OpenRouter when configured.
- If no AI provider keys are configured, the app returns a local mock response for development.
- Provider, model, fallback event, finish reason, and continuation metadata are logged into usage metadata.

## Study Modes

Study modes are implemented in `lib/study-modes.ts` and persisted on conversations/messages.

| Mode | Access | Status |
| --- | --- | --- |
| Quick Explain | Free | Complete |
| Cambridge Tutor | Tiered basic/premium | Complete |
| OSN Coach | Premium | Complete |
| Islamic Teacher | Free | Complete |
| Coding Mentor | Free | Complete |
| Research Mode | Premium | Complete |
| Step-by-Step | Premium | Complete |

Free users can use free modes and Cambridge Tutor Basic. Premium-only modes are blocked at the API layer when the current tier is not eligible.

## Subscriptions

Subscription tiers are implemented in code and database RPCs.

| Tier | Price | Daily Messages | Daily Uploads | Models |
| --- | ---: | ---: | ---: | --- |
| Free | Rp0 | 20 | 3 | Auto, Fast |
| Kader Pintar | Rp29.000 | 100 | 10 | Auto, Fast, Smart |
| Muallim Pro | Rp79.000 | 300 | 30 | Auto, Fast, Smart, Document |
| Dakwah Digital | Rp149.000 | 600 | 60 | Auto, Fast, Smart, Document |
| Sinergi Ranting | Rp299.000 | 2.000 | 200 | Full premium routing |

Current status:

- [x] Tier model implemented
- [x] Daily quota enforcement implemented
- [x] Model access enforcement implemented
- [x] Free subscription auto-provisioning implemented
- [x] Usage logs implemented
- [ ] Payment gateway integration
- [ ] Self-service upgrade/downgrade workflow
- [ ] Billing webhooks
- [ ] Team seat management

## RAG Phase Status

RAG is currently in Phase 1.

### Implemented

- [x] `knowledge_sources` table
- [x] `knowledge_chunks` table
- [x] Admin-only knowledge upload
- [x] PDF, DOCX, PPTX, XLSX knowledge ingestion
- [x] Text chunking with overlap
- [x] Postgres full-text search via `tsvector`
- [x] Retrieval only for knowledge-intent questions
- [x] Prompt grounding with source title and chunk number
- [x] Public active source read policies
- [x] Admin management policies

### Not Yet Implemented

- [ ] pgvector embeddings
- [ ] Semantic retrieval
- [ ] Hybrid search reranking
- [ ] Source management dashboard beyond upload/list basics
- [ ] Chunk quality review workflow
- [ ] Automated citation validation

## Multimodal Support

### Documents

Supported upload types:

- PDF
- DOCX
- PPTX
- XLSX

Document processing includes text cleanup, structured extraction, upload quota checks, usage logging, password-protected document handling, and optional Supabase Storage backup.

### Images

Supported image types:

- PNG
- JPG/JPEG
- WEBP

Images are uploaded, normalized as base64 context, counted against upload quota, and passed into provider payloads for image-aware analysis. Image generation is not yet configured; the UI currently marks `Create image` as coming soon.

## Workspace System

Workspace support is implemented for organizing chat history.

- [x] `chat_workspaces` table
- [x] Per-user workspace ownership
- [x] Conversation `workspace_id`
- [x] Conversation pinning via `is_pinned`
- [x] Sidebar grouping by pinned and workspace sections
- [x] Workspace creation from the chat UI
- [x] Conversation reassignment to workspace
- [x] RLS policies for user-owned workspaces

Default behavior keeps older conversations in the General workspace when no workspace is assigned.

## Supabase Migrations Applied

Migration files currently present:

- `20260530000000_chat_history.sql` - conversations, messages, RLS, update triggers
- `20260530010000_usage_and_subscriptions.sql` - subscription tiers, profiles, usage logs, usage RPCs
- `20260530020000_fix_usage_defaults.sql` - default free-tier repair and backfill
- `20260530030000_user_memory.sql` - learning profile memory
- `20260531000000_user_settings_preferences.sql` - theme, default model, default study mode
- `20260601000000_study_modes.sql` - study mode persistence on conversations/messages
- `20260601010000_knowledge_base.sql` - Phase 1 RAG tables, full-text search, RLS
- `20260602000000_chat_workspaces.sql` - workspace table, pinning, workspace ownership checks
- `20260602010000_performance_indexes.sql` - trigram and lookup indexes for production performance

Recommended application command:

```bash
supabase db push
```

## Environment Variables

Create `.env.local` from `.env.example` and fill production values.

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FLASH_MODEL=gemini-2.5-flash
GEMINI_PRO_MODEL=gemini-2.5-pro
GPT_TEST_MODE=false
AI_MU_VERBOSE_LOGS=false
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for the app to boot with Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET` are required only for server-side storage backup flows.
- At least one AI provider key should be configured for production.
- Without AI provider keys, local development falls back to mock chat output.

## Deployment Steps

1. Create or select a Supabase project.
2. Apply all migrations with `supabase db push` or run them in order through the Supabase SQL Editor.
3. Configure Supabase Auth providers and redirect URLs.
4. Create the storage bucket named by `SUPABASE_STORAGE_BUCKET` if document backup is required.
5. Add environment variables to the hosting platform.
6. Deploy the Next.js app to Vercel or another Node-compatible platform.
7. Run a production build:

```bash
npm run build
```

8. Smoke-test:

- [ ] Register/login flow
- [ ] Chat streaming
- [ ] Free-tier quota check
- [ ] Premium model blocking for free users
- [ ] PDF/DOCX/PPTX/XLSX upload
- [ ] Image upload
- [ ] Workspace creation and conversation assignment
- [ ] Knowledge upload as admin
- [ ] Knowledge retrieval on Muhammadiyah/ISMUBA-style questions

## Local Development Steps

1. Install dependencies:

```bash
npm install
```

2. Copy environment template:

```bash
cp .env.example .env.local
```

3. Fill Supabase and AI provider values in `.env.local`.
4. Apply Supabase migrations:

```bash
supabase db push
```

5. Start the app:

```bash
npm run dev
```

6. Open:

```text
http://localhost:3000
```

Useful checks:

```bash
npm run lint
npm run build
```

## Known Issues

- Payment processing is not integrated yet; subscription upgrades are schema/code-ready but operationally manual.
- RAG is full-text search only; no embeddings or semantic search yet.
- Scanned PDFs and image-only documents may produce short or empty extracted text because OCR is not implemented.
- Image generation is marked as coming soon and needs a provider workflow.
- Supabase Storage backup is optional and skipped when storage configuration is incomplete.
- Knowledge upload requires admin metadata on the Supabase auth user.
- Existing README is still close to the default Next.js starter and should be replaced with product-specific onboarding.
- `.env.example` does not currently list every optional runtime flag used by the app.

## Performance Optimizations

Implemented optimizations:

- Recent conversation index by user and update time
- Message loading index by conversation and creation time
- Workspace lookup indexes
- Pinned conversation ordering index
- Trigram indexes for conversation title and message content search
- Full-text GIN index for knowledge chunk search
- Prompt trimming for recent messages, document context, and knowledge chunks
- Upload size limit of 25 MB
- Image payload size validation before chat routing
- Streaming responses to reduce perceived latency
- Provider fallback chain to reduce outage impact

Recommended follow-up optimizations:

- Add observability for provider latency, fallback rates, and token usage.
- Add query plans for sidebar and search paths after production data grows.
- Add semantic RAG with pgvector and limit prompt context through reranking.
- Add server-side caching for knowledge source lists.
- Add background ingestion for large knowledge sources.

## Maintenance Checklist

Weekly:

- [ ] Review AI provider failures and fallback events
- [ ] Check Supabase usage logs and quota anomalies
- [ ] Verify chat streaming in production
- [ ] Review failed document extraction reports
- [ ] Audit knowledge source quality

Monthly:

- [ ] Run production build and lint checks
- [ ] Review Supabase indexes and slow queries
- [ ] Validate RLS policies after schema changes
- [ ] Rotate or audit provider keys when needed
- [ ] Reconcile subscription records and manual upgrades
- [ ] Update `.env.example` when runtime variables change

Before release:

- [ ] Apply migrations in order
- [ ] Smoke-test auth, chat, uploads, workspaces, and knowledge upload
- [ ] Confirm provider keys are present
- [ ] Confirm storage bucket exists if backup is enabled
- [ ] Confirm admin users have correct metadata
- [ ] Confirm free-tier blocking and premium-tier access

## Future Roadmap

### Near Term

- Replace starter README with full product setup documentation
- Add payment gateway and billing webhooks
- Add admin subscription management UI
- Add OCR for scanned PDFs and image-heavy documents
- Add richer knowledge source management
- Add analytics dashboard for usage and provider health

### RAG Phase 2

- Add pgvector embeddings
- Implement semantic search
- Add hybrid full-text + vector retrieval
- Add reranking for higher citation quality
- Add chunk review and source versioning

### Product Expansion

- Voice-ready chat input/output
- Image generation workflow
- Team and school workspace administration
- Shared knowledge bases per organization
- Teacher lesson-plan workflows
- Student progress memory and learning goals
- Exportable study notes, quizzes, and worksheets

### Reliability

- Provider health monitoring
- Retry and circuit-breaker strategy
- Structured logs and dashboards
- Automated regression tests for routing, quotas, uploads, and RAG
- Load testing for large chat histories and knowledge sources
