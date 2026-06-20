# VELMAN OS

A personal, local-first **operating system for daily life** — a modular productivity dashboard for Dr. Gowtham (founder/CEO, doctor, India). It unifies the day's plan, work, money, health, documents, and news into one fast, editable web app, with every page built **bot-ready** so a single AI assistant can later read, file, and improve everything you tell it.

> The UI currently shows the working label **"GC OS"**; the repository/product name is **VELMAN OS**.

---

## What it does

| Module | Route | What it is |
|---|---|---|
| **Command Center** | `/` | The daily home — live agenda (real-time, editable), this-week priorities, to-dos with MIT stars, "Needs you today" (overdue loops, doc renewals, subscription dues), time-by-category, gratitude & reflection, AI daily brief, day-progress ring. A live **news ticker** sits in the top bar. |
| **Daily Log** | `/log` | A time-stamped recap of what got done each day (agenda blocks completed + tasks done) — your end-of-day review / history. |
| **News** | `/news` | Latest news per business vertical (Interiors, Restaurant, School, Tech — editable) pulled live from Google News, each item with a slot for the assistant's "how this helps your work" suggestion. |
| **Open Loops** | `/loops` | A waiting-on / follow-up register with real due dates, **auto-overdue** as dates pass, owner, and context filters. |
| **Habits** | `/habits` | Per-day habit & self-care tracking on the real current week, with streaks and weekly consistency %. |
| **Health** | `/health` | Readiness, sleep, activity, body, workouts, nutrition (demo data today; Apple Watch ingest planned). |
| **Vault** | `/vault` | DigiLocker-style document store — government IDs, school/college certificates, medical license — with **renewal reminders 20 days ahead**. |
| **Subscriptions** | `/subscriptions` | Monthly/yearly subscriptions with spend totals and due-date reminders. |
| **Financial** | `/finance` | Dashboard · Income · Investment · Saving · Spending. Investment is manual (Stocks: ETF/Direct/Funds/Options, Mutual Funds, Government Schemes); the rest is transaction-driven. |
| **Work** | `/work` | Your group of companies (TRI, TRG, CMIS, LOF, …) as cards → department headcounts, with a per-department "betterment suggestion" slot for the assistant. |

Reminders from Vault, Subscriptions, and Open Loops all surface together on the Command Center's **"Needs you today"** strip. A **Quick Capture** palette (⌘K) writes straight into Open Loops.

---

## Tech stack

- **React 19 + TypeScript + Vite** (SPA, no SSR)
- **Tailwind CSS v4** (`@theme` tokens in `src/index.css`) — light "LOF" theme: white surfaces, LOF-blue accent, Orbitron / Rajdhani / Fira Code fonts
- **react-router-dom** for routing
- **recharts** for charts; **lucide-react** for icons
- **@anthropic-ai/sdk** (browser) for the AI brief & document/statement parsing — runs only when you paste your own Anthropic key
- Interim persistence: a tiny reactive **localStorage** store (`src/lib/store.ts`) behind a single seam that a real synced database (PowerSync + SQLite, Stage 4) will replace

---

## Architecture

**Module-registry plug-in pattern.** Every page is a self-contained module. `src/shell/registry.ts` is the single source of truth — adding a pillar = adding one `ModuleManifest` (`{ id, title, icon, route, page, nav, widgets }`). `App.tsx` generates routes from it and `Shell.tsx` renders the nav; nothing else needs to know about a new module.

**The store seam.** `src/lib/store.ts` exposes `useCollection` (reactive CRUD over a localStorage-backed array), `useLocalValue`, `useEphemeral`, and helpers — all built on `useSyncExternalStore`. Modules never touch the seed directly; when sync lands, only this file changes.

**Per-day data model.** Daily records (agenda, to-dos, gratitude, reflection, habit logs) are keyed by date (`gcos.<kind>.YYYY-MM-DD`), which is what powers the Daily Log history and the to-do roll-over.

**Bot-ready everywhere.** Each module keeps editable stores and "suggestion" slots so the planned global assistant can write into them and add recommendations.

```
app/
├── src/
│   ├── shell/         # Shell, registry, Quick Capture, top bar (news ticker, clock)
│   ├── modules/       # one folder per pillar (command-center, news, loops, habits,
│   │                  #   health, vault, subs, finance, work, log, planner)
│   ├── lib/           # store, time, data, ai (Anthropic), types
│   ├── components/    # shared UI primitives (Card, Stat, Pill, …)
│   └── index.css      # Tailwind v4 theme tokens + base layer
└── (repo root)        # planning docs: ARCHITECTURE.md, PHASE0_PLAN.md, etc.
```

The code is documented inline — most files open with a comment explaining their role and any non-obvious decisions.

---

## Running locally

```bash
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

---

## Data & privacy

- All your data lives in **localStorage on this device** only (interim). Nothing is sent anywhere by default.
- The **AI features** (daily brief, document/statement parsing) call Anthropic **only with your own API key**, which is stored locally and never committed. Only a compact, structured snapshot — never raw records — is sent.
- Live news is fetched from public sources via a CORS proxy (read-only, no personal data sent).

> ⚠️ The app's **seed data** includes realistic personal-style content (sample finances, schedule). Keep this repository **private**, and replace the seeds with your own data in the UI.

---

## Roadmap

- **Global assistant** — one agent (your API key) you talk to; it analyzes each message and files it into the right module + suggests improvements (department betterment, news relevance, statement import).
- **Stage 4 infra** — Tauri shell + SQLite + PowerSync for durable, end-to-end-encrypted Mac↔iPhone sync; Apple Watch / Health Auto Export ingest; CSV/CAS finance import; scheduled briefs & notifications.

---

© Dr. Gowtham. Personal project — all rights reserved.
