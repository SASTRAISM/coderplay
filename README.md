# CoderPlay AI — AI-Powered Coding Learning Platform

A production-ready full-stack web application for college students to learn programming through a structured 3-stage AI-guided learning system.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Auth | Firebase Authentication |
| Database | Firestore |
| AI Layer | Abstracted service (mock responses — plug in any LLM) |

---

## Features

### 3-Stage Learning System
Every concept follows the same proven path:
- **Stage 1 — AI Chat Learning**: Focused AI tutor explains the concept step by step with examples, analogies, and mini check-ins
- **Stage 2 — Assessment**: 15 questions with 8 different types (MCQ, True/False, Fill-in-blank, Code output, Error identification, Scenario-based, Match, Ordering). No skipping.
- **Stage 3 — Coding Practice**: 3 difficulty levels (Basic/Medium/Hard) with an AI assistant that gives hints — not direct answers — for the first 5 minutes

### Strict Learning Rules
- Stage 2 unlocks only after Stage 1 completion
- Stage 3 unlocks only after Stage 2 completion
- All 15 assessment questions must be answered
- AI tutor redirects off-topic conversations back to learning
- Coding AI waits 5 minutes before offering complete solutions

### Gamification
- XP points (50/100/150 per stage)
- 10-level system with titles
- 14 achievements across 4 categories
- Day streak tracking
- Per-concept and per-language progress tracking

### Languages Supported
Python · JavaScript · C · C++ · Java · HTML & CSS · Data Analytics with Python

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    ← Landing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   └── (student)/
│       ├── layout.tsx              ← Sidebar nav + AuthGuard
│       ├── dashboard/page.tsx
│       ├── language/[id]/page.tsx
│       ├── concept/[id]/page.tsx
│       ├── learn/[conceptId]/
│       │   ├── stage1/page.tsx     ← AI Chat Learning
│       │   ├── stage2/page.tsx     ← 15-Question Assessment
│       │   └── stage3/page.tsx     ← Coding Challenges
│       ├── profile/page.tsx
│       ├── progress/page.tsx
│       └── achievements/page.tsx
├── components/
│   ├── shared/        ← Navbar, Footer, ProgressBar, Badge, Skeleton, PageTransition
│   ├── auth/          ← AuthProvider, AuthGuard
│   ├── dashboard/     ← LanguageCard, StatsCard, RecentActivity, AchievementBadge
│   ├── learning/      ← ConceptCard, StageProgress, AIChat
│   ├── assessment/    ← QuestionCard, MCQ/TrueFalse/FillBlank, AssessmentSummary
│   └── coding/        ← CodeEditor, TestCasePanel, CodingChallengePanel, AICodingAssistant
├── lib/
│   ├── firebase/      ← config.ts, auth.ts, firestore.ts
│   ├── ai/            ← aiService.ts (abstraction layer)
│   └── utils.ts
├── hooks/             ← useAuth, useProgress, useFirestore
├── data/              ← languages, concepts, assessmentQuestions, codingChallenges
├── services/          ← progressService, userService
└── types/index.ts     ← All TypeScript interfaces
```

---

## Firebase Setup

Firebase is already configured. To enable authentication:

1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to **Authentication → Sign-in method**
3. Enable **Email/Password**
4. Enable **Google**
5. Go to **Firestore Database → Create database** (start in test mode)

### Firestore Collections
```
users/           → uid, displayName, email, xp, level
progress/        → completedStages, assessmentScores, timeSpent
assessments/     → per-submission results
chatSessions/    → message history per concept
codeSubmissions/ → code + test results
achievements/    → earned achievements per user
streaks/         → daily streak data
```

---

## Connecting Real AI

Edit `src/lib/ai/aiService.ts`. Replace each function's mock `delay()` with real API calls:

```typescript
// Example with OpenAI
import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.AI_API_KEY })

export async function explainConcept(concept: string, level: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: `You are a focused coding tutor teaching ${concept}. Stay on topic.` },
      { role: 'user', content: `Explain ${concept} for a ${level} learner with examples.` }
    ]
  })
  return res.choices[0].message.content || ''
}
```

Add to `.env.local`:
```
AI_API_KEY=your_openai_key
```

---

## Connecting Code Execution

In `src/components/coding/CodingChallengePanel.tsx`, replace the mock `handleRun` with Judge0:

```typescript
// Create src/app/api/execute/route.ts
// Then call it from the frontend:
const res = await fetch('/api/execute', {
  method: 'POST',
  body: JSON.stringify({ code, language: 'python3', stdin: testInput })
})
const result = await res.json()
setRunOutput(result.stdout || result.stderr)
```

---

## Design System

| Token | Value |
|---|---|
| Brand Yellow | `#EAB308` (Tailwind `yellow-500`) |
| Brand Black | `#0A0A0A` |
| Body Font | Inter (Google Fonts) |
| Code Font | JetBrains Mono |
| Card radius | `rounded-2xl` (16px) |
| Button radius | `rounded-full` or `rounded-xl` |

---

## Environment Variables

```bash
# .env.local
# Firebase is hardcoded in src/lib/firebase/config.ts (no env vars needed)

# Add these when integrating AI and code execution:
AI_API_KEY=
JUDGE0_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Build & Deploy

```bash
npm run build   # Production build
npm start       # Start production server
```

Compatible with **Vercel** (zero-config) and **Firebase Hosting**.
