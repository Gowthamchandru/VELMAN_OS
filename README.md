# VELMAN OS — Personal Operating System

A personal life-OS dashboard for Dr. Gowtham — founder, CEO, and doctor based in India. Built to replace scattered apps with a single, cohesive interface for daily planning, company management, finances, documents, and AI-assisted decision-making.

> **Stack:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS v4 · Claude Pro (local server)

---

## What It Does

| Module | Route | Purpose |
|--------|-------|---------|
| **Command Center** | `/` | Daily home — agenda, priorities, AI brief, needs-you alerts |
| **Work** | `/work` | Companies, departments, headcount, task KPIs, company vault |
| **Daily Log** | `/log` | Time-stamped history of completed items per day |
| **News** | `/news` | Live business news by vertical (Interiors, Restaurant, Tech…) |
| **Open Loops** | `/loops` | Waiting-on register with owner, due date, overdue tracking |
| **Habits** | `/habits` | Weekly habit grid (Mon–Sun) with streaks and consistency % |
| **Health** | `/health` | Readiness, sleep, HR, HRV, BMI, activity (Apple Watch planned) |
| **Vault** | `/vault` | Document store — govt IDs, certs, medical license, expiry alerts |
| **Subscriptions** | `/subscriptions` | Monthly/yearly subs tracker with due-date alerts and spend totals |
| **Financial** | `/finance` | Net worth, portfolio, holdings P&L, savings goals, SIP/FIRE calculators |

---

## Architecture

```
VELMAN_OS/
├── app/                        # React web application (source of truth)
│   ├── src/
│   │   ├── shell/              # Layout, nav, global shortcuts
│   │   │   ├── Shell.tsx       # Sidebar + topbar + news ticker
│   │   │   ├── registry.ts     # ← Single source of truth for all modules
│   │   │   ├── Assistant.tsx   # ⌘J AI chat drawer
│   │   │   └── QuickCapture.tsx # ⌘K quick-add palette
│   │   │
│   │   ├── modules/            # One folder per pillar page
│   │   │   ├── command-center/ # Home dashboard + AI brief
│   │   │   ├── work/           # Companies, departments, vault
│   │   │   ├── log/            # Daily history
│   │   │   ├── news/           # Live news by business vertical
│   │   │   ├── loops/          # Open loops / waiting-on register
│   │   │   ├── habits/         # Weekly habit tracking
│   │   │   ├── health/         # Health metrics (demo → Apple Watch)
│   │   │   ├── vault/          # Personal document store
│   │   │   ├── subs/           # Subscription management
│   │   │   ├── finance/        # Money OS (portfolio, net worth, goals)
│   │   │   └── planner/        # Shared agenda / todo / priority store
│   │   │
│   │   ├── lib/                # Shared utilities
│   │   │   ├── store.ts        # ← Reactive localStorage (seam for future DB)
│   │   │   ├── ai.ts           # Snapshot builders + Claude server calls
│   │   │   ├── time.ts         # IST-aware date/time helpers
│   │   │   └── data.ts         # Category colours, formatters
│   │   │
│   │   └── components/
│   │       └── ui.tsx          # Shared primitives: Card, Stat, Pill, Empty
│   │
│   ├── vite.config.ts          # Vite: @/ alias, Tailwind plugin, React plugin
│   ├── package.json            # App dependencies + dev:all / server scripts
│   └── .env.example            # Template for CLAUDE_CODE_OAUTH_TOKEN
│
├── server/
│   └── index.mjs               # Local Express server — Claude Pro bridge
│
├── .env                        # Your Claude Pro token (gitignored, never committed)
└── package.json                # Root scripts (server deps: express, cors, claude-sdk)
```

---

## How the Code Is Organised

### 1. Module Registry — the single source of truth

`app/src/shell/registry.ts` is the only place you register a new page. Everything else — routes, nav links, and widget slots — is derived from it automatically.

```ts
// Adding a new module = one object here, nothing else to touch
export const modules: ModuleManifest[] = [
  { id: 'command-center', title: 'Command Center', icon: LayoutDashboard, route: '/',     page: CommandCenter, nav: true },
  { id: 'work',           title: 'Work',           icon: Briefcase,        route: '/work', page: Work,          nav: true },
  { id: 'vault',          title: 'Vault',           icon: ShieldCheck,      route: '/vault', page: Vault,        nav: true },
  // ...
]
```

`App.tsx` generates routes from the registry. `Shell.tsx` generates the sidebar from the registry. No hardcoded menu items anywhere.

---

### 2. Reactive State — localStorage with a DB seam

`app/src/lib/store.ts` provides three hooks used by every module:

```ts
useCollection<T>(key, seed?)   // CRUD array persisted in localStorage
useLocalValue(key, default?)   // Single scalar persisted in localStorage
useEphemeral(key, default?)    // In-memory only — resets on page reload
```

All module stores (`loopsStore.ts`, `vaultStore.ts`, `financeReal.ts`, etc.) are thin wrappers over `useCollection`. Swapping localStorage for PowerSync or a backend DB in the future means changing one file.

Storage keys follow the pattern `gcos.<kind>` (e.g. `gcos.docs.v4`, `gcos.work.companies.v3`). The version suffix (`v3`, `v4`) is bumped whenever the seed data shape changes so fresh defaults load automatically.

---

### 3. AI Layer — snapshots, never raw data

The browser **never sends raw records** to Claude. `lib/ai.ts` assembles a compact, structured JSON snapshot, which is POSTed to the local server.

```
Browser                        server/index.mjs             Claude API
  │                                   │                          │
  │── POST /api/brief ────────────────▶                          │
  │   { snapshot, mode }              │── Claude Pro OAuth ──────▶
  │                                   │◀─ text ──────────────────│
  │◀─ { text } ───────────────────────│
```

**Two endpoints:**
- `POST /api/brief` — Morning brief or evening wrap (tight, scannable, ≤160 words)
- `POST /api/assistant` — Full-app Q&A (any question across all modules)

The server holds your Claude Pro OAuth token. The browser never sees it.

---

### 4. Per-Day Data Model

Agenda, to-dos, gratitude, and reflection records are keyed by ISO date (`2025-06-24`). This single pattern powers:
- **Command Center** — today's live view
- **Daily Log** — scroll back through any past day
- **AI snapshots** — build a brief for a specific date

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 + TypeScript 6 |
| Bundler | Vite 8 with `@vitejs/plugin-react` |
| Styling | Tailwind CSS v4 (`@theme` tokens in `index.css`, no config file) |
| Routing | react-router-dom v7 (client-side, URL-based state) |
| Charts | recharts v3 |
| Icons | lucide-react v1 |
| State | `useSyncExternalStore` over localStorage (custom, no Redux/Zustand) |
| AI server | Express v5 + `@anthropic-ai/sdk` + Claude Pro OAuth token |
| Dev runner | concurrently (web + AI server in one terminal) |

### Design tokens (`app/src/index.css`)

Tailwind v4 uses `@theme` blocks directly in CSS — no `tailwind.config.js` needed.

```css
--color-bg        /* page background — light grey  */
--color-surface   /* card surfaces  — white        */
--color-accent    /* brand blue     — #1c4d8c      */
--color-danger    /* red alerts                    */
--color-warn      /* amber warnings                */
--font-heading    /* Orbitron  — uppercase nav labels */
--font-sans       /* Rajdhani  — body text            */
--font-mono       /* Fira Code — numbers, kbd         */
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### 1. Clone and run (UI only)

```bash
git clone https://github.com/Gowthamchandru/VELMAN_OS.git
cd VELMAN_OS/app
npm install
npm run dev
# → http://localhost:5173
```

The app works fully offline without the AI server. All data lives in the browser's localStorage.

---

### 2. Enable the AI assistant (optional)

The morning brief and Ask Assistant (⌘J) features need a local server backed by your Claude Pro subscription.

**One-time setup — run once, never again:**

```bash
npm i -g @anthropic-ai/claude-code   # install CLI
claude setup-token                    # browser login → prints your token
```

**Add the token to `.env`** at the root of `VELMAN_OS/` (not inside `app/`):

```
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...your-token...
```

**Start everything together:**

```bash
cd VELMAN_OS/app
npm run dev:all
# [web] Vite dev server  → http://localhost:5173
# [ai]  Assistant server → http://localhost:8787
```

Once the `[ai]` line shows `auth: Claude Pro/Max subscription ✓`, the assistant is live.

> `.env` is gitignored. Your token never leaves your machine.

---

### 3. Scripts (run from `app/`)

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server only (no AI) |
| `npm run dev:all` | Vite + assistant server together |
| `npm run server` | Assistant server only |
| `npm run build` | Type-check + Vite production bundle |
| `npm run lint` | ESLint |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/src/shell/registry.ts` | **Module registry** — add a new page here, everything else auto-updates |
| `app/src/lib/store.ts` | **Reactive state** — `useCollection`, `useLocalValue`, `useEphemeral` |
| `app/src/lib/ai.ts` | **AI layer** — snapshot builders + `generateBrief`, `askAssistant` |
| `app/src/lib/time.ts` | Date/time utils (IST-aware, `todayKey`, formatting) |
| `app/src/components/ui.tsx` | Shared UI primitives (`Card`, `Stat`, `Pill`, `Empty`) |
| `app/src/index.css` | Tailwind v4 theme — all design tokens |
| `server/index.mjs` | Local Express server — Claude bridge, personas, auth |
| `app/.env.example` | Copy to `.env` and fill in your Claude Pro token |

---

## Adding a New Module

1. Create `app/src/modules/<name>/<Name>.tsx` (the page component)
2. Optionally create `app/src/modules/<name>/<name>Store.ts` using `useCollection`
3. Add one entry to `app/src/shell/registry.ts`

Routes and nav links appear automatically. No other files to touch.

---

## Data & Privacy

- All personal data (plans, finances, documents) stays in **your browser's localStorage** — nothing is uploaded to any cloud service.
- For AI features: only a **compact structured snapshot** is sent to `localhost:8787`. Your Claude Pro token never touches the browser.
- `.env` is gitignored and excluded from all commits.

---

## Roadmap

- [ ] PowerSync + SQLite — replace localStorage, enable multi-device sync
- [ ] Apple Health / Apple Watch data ingest — replace health demo data
- [ ] Real bank / portfolio data connectors — replace demo finance data
- [ ] Mobile-responsive layout
- [ ] Push notifications for overdue loops and document renewals
