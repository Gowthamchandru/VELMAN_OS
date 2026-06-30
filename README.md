# VELMAN OS

> **One screen for everything that matters.**
>
> A personal operating system for a founder and business owner.
> Instead of ten scattered apps, one fast dashboard handles the day, the companies,
> the money, the documents, and health — and an AI assistant knows all of it,
> so you can just ask instead of clicking around.

---

## Table of contents

- [What it does](#what-it-does)
- [Why it exists](#why-it-exists)
- [The ten pillars](#the-ten-pillars)
- [How the AI works](#how-the-ai-works)
- [Architecture](#architecture)
- [How the code is organised](#how-the-code-is-organised)
- [Technology choices](#technology-choices)
- [Getting started](#getting-started)
- [Enabling the AI assistant](#enabling-the-ai-assistant)
- [Project status](#project-status)
- [Roadmap](#roadmap)

---

## What it does

Open the app and you land on the **Command Center** — today's agenda, weekly priorities, a "needs you today" roll-up of everything overdue, and a live news ticker from your business verticals. One click gets you an AI-generated morning brief written in your voice.

From there, ten pillars cover the full life-OS:

1. **Plan the day** — agenda blocks, to-dos, MIT (most important task), gratitude and reflection.
2. **Run the companies** — your group entities and verticals, each with departments, headcount, task KPIs, and a document vault.
3. **Track what's waiting** — open loops with owner, due date, and auto-overdue status so nothing falls through.
4. **Stay on top of habits** — a Mon–Sun grid for self-care and daily habits, with streaks and consistency percentage.
5. **Watch the money** — net worth, full portfolio with live P&L, savings goals, SIP/FIRE calculators.
6. **Keep documents safe** — personal vault for govt IDs, certificates, and licences with 20-day expiry reminders.
7. **Manage subscriptions** — monthly and yearly subs, due dates, auto-pay flags, spend totals.
8. **Monitor health** — readiness score, sleep, HR, HRV, BMI, activity (Apple Watch ingest planned).
9. **Read business news** — live Google News feed organised by the verticals that matter to you.
10. **Ask the assistant anything** — one chat panel (⌘J) that can see everything above and answers instantly.

---

## Why it exists

Information for a busy founder is spread across a notes app, a spreadsheet, a banking app, a document folder, and memory. None of them talk to each other. The AI can't help because it can't see all of it at once.

VELMAN OS fixes that by putting everything in one place:

- **No context switching.** Morning plan, company headcount, overdue follow-ups, expiring documents, and portfolio performance are all one tab.
- **AI that knows everything.** The assistant can see all ten pillars at once, so "what needs my attention?" or "how's my portfolio doing?" returns a real answer with real numbers — not a generic response.
- **Privacy by design.** All data lives in the browser. When the AI is asked a question, only a compact structured snapshot — never raw files or records — leaves the device, and only to a server running on your own machine.
- **Built to grow.** Each pillar is isolated. Adding a new module is three lines of code. The storage layer is a thin seam — swapping localStorage for a real database later changes one file.

---

## The ten pillars

| Pillar | Route | What it handles |
|--------|-------|-----------------|
| **Command Center** | `/` | Daily home — agenda, priorities, AI brief, needs-you roll-up, time-by-category chart |
| **Work** | `/work` | Group companies, departments, headcount, company document vault, task KPIs |
| **Daily Log** | `/log` | Scrollable history — what got done on any past day |
| **News** | `/news` | Live Google News organised by your business verticals |
| **Open Loops** | `/loops` | Waiting-on register — owner, due date, context, auto-overdue |
| **Habits** | `/habits` | Weekly Mon–Sun habit grid, streaks, consistency % |
| **Health** | `/health` | Readiness, sleep, resting HR, HRV, BMI, steps, blood pressure |
| **Vault** | `/vault` | Personal document store — IDs, certificates, licences, expiry alerts |
| **Subscriptions** | `/subscriptions` | Monthly/yearly subs, due-date alerts, auto-pay, spend totals |
| **Financial** | `/finance` | Net worth, portfolio + P&L, savings goals, SIP/FIRE calculators |

---

## How the AI works

The AI has two modes: a **daily brief** on the Command Center, and a **chat assistant** accessible from anywhere with ⌘J.

Both work the same way under the hood:

```
Your browser                    server/index.mjs              Claude API
      │                               │                            │
      │  1. Build snapshot            │                            │
      │     (compact JSON of          │                            │
      │      today's agenda,          │                            │
      │      priorities, money,       │                            │
      │      loops, vault, etc.)      │                            │
      │                               │                            │
      │── POST /api/brief ───────────►│                            │
      │   or POST /api/assistant      │── Claude Pro subscription ►│
      │                               │◀── text response ──────────│
      │◀── { text } ─────────────────│                            │
      │                               │                            │
      │  2. Render the answer         │                            │
```

**What is a "snapshot"?**
Instead of sending your actual records, the app compresses everything into a small structured JSON — something like `"openLoops: 4, overdue: 2, portfolioROI: +12.3%, docsExpiringSoon: 1"`. Claude reads this and answers. Your raw agenda entries, financial transactions, and document files never leave the browser.

**The server** (`server/index.mjs`) is a small Express app that runs on your own machine. It holds your Claude Pro token and is the only thing that calls the Anthropic API. The browser never sees the token.

**Two endpoints:**

| Endpoint | What it does |
|----------|-------------|
| `POST /api/brief` | Morning brief or evening wrap — tight, scannable, ≤160 words |
| `POST /api/assistant` | Full-app Q&A — any question across all ten pillars |

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │          YOUR BROWSER (localhost:5173)   │
                    │                                          │
                    │   ┌──────────┐    ┌───────────────────┐ │
                    │   │  Shell   │    │  Ten pillar pages  │ │
                    │   │ (nav +   │    │  (React components)│ │
                    │   │  ⌘J/⌘K)  │    └────────┬──────────┘ │
                    │   └────┬─────┘             │            │
                    │        │            ┌───────▼──────────┐ │
                    │        │            │   lib/store.ts   │ │
                    │        │            │  (localStorage   │ │
                    │        │            │   seam — CRUD)   │ │
                    │        │            └───────┬──────────┘ │
                    │        │                    │            │
                    │        │            ┌───────▼──────────┐ │
                    │        │            │   lib/ai.ts      │ │
                    │        └────────────►  (builds compact │ │
                    │                    │   snapshot JSON)  │ │
                    │                    └───────┬──────────┘ │
                    └────────────────────────────┼────────────┘
                                                 │ POST /api/*
                    ┌────────────────────────────▼────────────┐
                    │        server/index.mjs (localhost:8787) │
                    │                                          │
                    │   Reads CLAUDE_CODE_OAUTH_TOKEN from .env│
                    │   Holds all personas / system prompts    │
                    │   Never exposed to the browser           │
                    └────────────────────────────┬────────────┘
                                                 │ Claude Pro subscription
                                                 ▼
                                          Anthropic API
                                        (claude-sonnet-4-6)
```

**Why a local server instead of calling Claude from the browser?**
If Claude were called directly from the browser, your API key would be visible to anyone who opens DevTools. The local server acts as a safe proxy — it holds the key, the browser only sends data.

---

## How the code is organised

### The module registry — one file controls everything

`app/src/shell/registry.ts` is the only place a new page is registered. The sidebar, the routes, and the widget slots are all derived from it automatically.

```ts
// To add a new page, add one object here. Nothing else to touch.
export const modules: ModuleManifest[] = [
  { id: 'command-center', title: 'Command Center', icon: LayoutDashboard, route: '/',        page: CommandCenter, nav: true },
  { id: 'work',           title: 'Work',           icon: Briefcase,        route: '/work',    page: Work,          nav: true },
  { id: 'vault',          title: 'Vault',           icon: ShieldCheck,      route: '/vault',   page: Vault,         nav: true },
  // ...
]
```

### The state layer — thin wrappers over localStorage

`app/src/lib/store.ts` provides three hooks used by every module:

```ts
useCollection<T>(key, seed?)   // A reactive CRUD list, persisted in localStorage
useLocalValue(key, default?)   // A single value, persisted in localStorage
useEphemeral(key, default?)    // A value held only in memory (resets on reload)
```

Every module store (`loopsStore.ts`, `vaultStore.ts`, `financeReal.ts`…) is a thin wrapper around `useCollection`. This means:
- All data survives a page refresh (it's in localStorage).
- Replacing localStorage with a real database later = change `store.ts` only.

Storage keys follow the convention `gcos.<kind>.v<N>` (e.g. `gcos.docs.v4`). The version suffix is bumped when the seed data shape changes so fresh defaults load automatically for existing users.

### The AI snapshot — what gets sent to Claude

`app/src/lib/ai.ts` has two snapshot builders:

- `useGcSnapshot(date)` — today's planner data only (agenda, priorities, to-dos, habits, finance summary) — used for the daily brief.
- `useAssistantContext()` — the whole app (all ten pillars) — used for the ⌘J assistant.

Both return plain objects. Claude sees numbers and short strings, not your actual document files or transaction history.

### The per-day data model

Agenda entries, to-dos, gratitude, and reflection are each stored keyed by ISO date (e.g. `2025-06-24`). This single pattern powers three things:
- **Command Center** — shows today's records
- **Daily Log** — lets you scroll back to any date
- **AI snapshots** — picks the right day's data to summarise

---

## Technology choices

| Concern | Choice | Why |
|---------|--------|-----|
| UI framework | React 19 + TypeScript 6 | Strict types prevent an entire class of bugs in a data-heavy app |
| Bundler | Vite 8 | Near-instant hot reload during development |
| Styling | Tailwind CSS v4 | Design tokens in one file (`index.css`); no separate config |
| Routing | react-router-dom v7 | URL-based state — the back button works correctly everywhere |
| Charts | recharts v3 | Composable chart primitives that match the design system |
| Icons | lucide-react v1 | Consistent icon set, tree-shakeable |
| State | Custom hooks over `localStorage` | Zero dependencies; the seam makes DB migration trivial |
| AI (browser side) | `lib/ai.ts` snapshot builders | Browser only compresses data — no API keys in the browser |
| AI (server side) | Express v5 + `@anthropic-ai/sdk` | Minimal server; holds the Pro token safely |
| Parallelism | concurrently | One terminal starts both Vite and the server |

### Design language

All colours and fonts are defined as CSS custom properties in `app/src/index.css` using Tailwind v4's `@theme` block. No separate config file needed.

```
Accent colour    #1c4d8c
Headings         Orbitron (geometric, uppercase — used for nav labels)
Body             Rajdhani (clean, readable at small sizes)
Numbers / code   Fira Code (tabular, monospaced)
```

---

## Getting started

You need **Node.js 20+** and **npm 10+**.

### Step 1 — Clone and install

```bash
git clone <repo-url>
cd VELMAN_OS/app
npm install
```

### Step 2 — Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app works immediately — all data lives in the browser's localStorage, no server or database needed.

### Step 3 — Explore

- The sidebar shows all ten pillars. Click any to open it.
- Press **⌘K** (or Ctrl+K) to quick-capture a task, loop, or note from anywhere.
- Try filling in today's agenda and priorities on the Command Center.

---

## Enabling the AI assistant

The **Morning Brief** and the **Ask Assistant** chat (⌘J) require a local server backed by your Claude Pro subscription. The app works without it — these two features just stay greyed out.

### One-time setup (do this once, never again)

```bash
# Install the Claude Code CLI globally
npm i -g @anthropic-ai/claude-code

# Log in — this opens a browser tab to claude.ai
# After you approve, it prints a token starting with sk-ant-oat01-…
claude setup-token
```

### Add the token

Create a file called `.env` in the `VELMAN_OS/` root folder (not inside `app/`):

```
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...paste-your-token-here...
```

> This file is gitignored. It will never be committed or pushed to GitHub.

### Run everything together

```bash
cd VELMAN_OS/app
npm run dev:all
```

You will see two streams of output:

```
[web] ready in 312ms → http://localhost:5173
[ai]  Velman OS assistant server → http://localhost:8787
[ai]  model: sonnet
[ai]  auth:  Claude Pro/Max subscription ✓
```

Once the `[ai]` line shows `✓`, the **Ask Assistant** button in the sidebar goes active and the **Morning Brief** / **End-of-day wrap** buttons on the Command Center become clickable.

### Available scripts (run from `app/`)

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server only — no AI features |
| `npm run dev:all` | Vite + AI server together — full experience |
| `npm run server` | AI server only — if Vite is already running separately |
| `npm run build` | Type-check + production bundle |
| `npm run lint` | ESLint |

---

## Project status

**The core system is live and working.**

- ✅ Command Center — daily brief, agenda, priorities, needs-you roll-up
- ✅ Work — company cards, departments, headcount, task KPIs, company vault
- ✅ Daily Log — full history by date
- ✅ News — live Google News by business vertical
- ✅ Open Loops — waiting-on register with overdue tracking
- ✅ Habits — weekly grid, streaks, consistency %
- ✅ Health — readiness, sleep, HR, HRV, BMI (demo data, Apple Watch planned)
- ✅ Vault — personal documents with expiry tracking and 20-day alerts
- ✅ Subscriptions — monthly/yearly subs, due dates, spend totals
- ✅ Financial — net worth, portfolio P&L, goals, SIP/FIRE calculators
- ✅ AI Morning Brief — Claude reads today's snapshot, writes a ≤160-word brief
- ✅ AI Assistant (⌘J) — full-app Q&A across all ten pillars
- ✅ Quick Capture (⌘K) — add tasks, loops, notes from anywhere
- ✅ News ticker — live headlines scroll in the top bar

---

## Roadmap

- [ ] **Multi-device sync** — replace localStorage with PowerSync + SQLite so the same data appears on phone and desktop
- [ ] **Apple Watch / Apple Health ingest** — replace demo health figures with real data
- [ ] **Real bank and portfolio connectors** — replace demo finance data with live feeds
- [ ] **Mobile layout** — responsive design for phone use
- [ ] **Push notifications** — alerts for overdue loops and documents expiring soon
- [ ] **Lock screens** — PIN protection for Vault, Finance, and Work vault (code is in place, currently bypassed)
