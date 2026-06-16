# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (two processes needed)
npm run dev          # Frontend on port 5175
npm run backend      # AI backend on port 5002

# Run both + Ollama together
npm run watch:all

# Build variants
npm run build        # Standard Next.js build
npm run build:local  # Build with local backend URL (http://localhost:5002)
npm run build:dgx    # Build for DGX server (https://coderplay-api.kauverylabs.ai)

npm run lint         # ESLint
```

No test suite exists — verify changes by running the app.

## Architecture

This is a **Next.js 14 App Router** frontend with a separate **Express.js AI backend**.

### Two-process setup

- **Frontend** (`/`): Next.js on port 5175. Handles UI, Firebase auth/data, routing.
- **Backend** (`/backend/server.js`): Express on port 5002. Handles all AI inference via SSE streaming. The backend URL is controlled by `NEXT_PUBLIC_AI_BACKEND_URL` env var (see `src/lib/backendUrl.ts`).

The backend currently ships with mock responses. Production deployments route to an Ollama server (primary) with Gemini as overflow fallback.

### Route structure

```
app/
├── page.tsx                          ← Public landing page
├── (auth)/                           ← Unauthenticated routes (login, signup, forgot-password)
├── (student)/                        ← All student routes — wrapped in AuthGuard + ExamModeProvider
│   ├── layout.tsx                    ← Hides navbar when ExamMode is active
│   ├── dashboard/, profile/, etc.
│   ├── language/[id]/                ← Language overview, final exam, certificate
│   ├── concept/[id]/                 ← Concept detail
│   ├── learn/[conceptId]/
│   │   ├── stage1/                   ← AI Chat Learning
│   │   ├── stage2/                   ← 15-Question Assessment
│   │   ├── stage3/                   ← Coding Challenges
│   │   └── complete/
│   ├── mock-test/[languageId]/       ← Proctored practice exam
│   └── aptitude/[subjectId]/         ← Aptitude section (separate from coding)
└── admin/                            ← Admin panel (separate login, no AuthGuard)
```

**Page pattern**: every interactive route has a thin server `page.tsx` (metadata/Suspense wrapper) and a `XxxPageClient.tsx` with the actual logic. `loading.tsx` provides Suspense skeletons.

### 3-Stage learning flow

Every concept follows a strict linear path enforced by `UserProgress.completedStages`:

1. **Stage 1** — AI chat tutor (`/learn/[id]/stage1`). Streamed responses via `aiService.streamChat()`. Tracks `LearningAnalytics` (probes seen, questions asked, shortcuts attempted).
2. **Stage 2** — Assessment (`/learn/[id]/stage2`). Questions are AI-generated (`aiService.generateQuestions()`) per-student with a `variationSeed` to prevent sharing. 8 question types: `mcq | true_false | fill_blank | code_output | identify_error | match | scenario | ordering`.
3. **Stage 3** — Coding challenges (`/learn/[id]/stage3`). Challenges AI-generated per concept. Code is run against test cases; AI hints are throttled for the first 5 minutes.

### AI service layer

`src/lib/ai/aiService.ts` is the single entry point for all AI calls:

- `streamChat(payload, onChunk)` — SSE streaming, tokens pushed to callback
- `callBackend(payload)` — buffered wrapper that collects the full string
- All public functions (`explainConcept`, `giveHint`, `generateQuestions`, etc.) call `callBackend` with a typed `payload.type` field the backend routes on

To swap AI providers, edit `backend/server.js` — the frontend never talks to an LLM directly.

### Exam / proctoring system

- `useProctoring` hook (`src/hooks/useProctoring.ts`): monitors tab switches (2 violations → auto-submit), silently blocks copy/paste/DevTools shortcuts/F-keys, tracks fullscreen state.
- `ExamModeContext` (`src/context/ExamModeContext.tsx`): when active, the student layout strips the navbar so the exam fills the full screen.
- Used by mock tests (`MockTestClient.tsx`) and final language exams (`FinalExamClient.tsx`).

### Data & state

- **Firebase Firestore** is the only database. Config is hardcoded in `src/lib/firebase/config.ts`.
- Static curriculum data (languages, concepts, assessment questions, coding challenges, aptitude) lives in `src/data/`.
- `src/services/progressService.ts` — XP calculation, level thresholds, level titles.
- `src/services/userService.ts` — Firestore reads/writes for user profiles.
- `src/hooks/useProgress.ts`, `useAuth.ts`, `useFirestore.ts` — React hooks wrapping Firebase.

### Design system

| Token | Value |
|---|---|
| Brand yellow | `#EAB308` / `yellow-500` |
| Brand black | `#0A0A0A` |
| Body font | Inter |
| Code font | JetBrains Mono |
| Card radius | `rounded-2xl` |
| Button radius | `rounded-full` / `rounded-xl` |

### Environment variables

```bash
# .env.local
NEXT_PUBLIC_AI_BACKEND_URL=http://localhost:5002   # omit for same-origin proxy
AI_API_KEY=          # only needed if wiring real AI in backend
JUDGE0_API_KEY=      # only needed if wiring real code execution
```

Firebase credentials are hardcoded in `src/lib/firebase/config.ts` and require no env vars.
