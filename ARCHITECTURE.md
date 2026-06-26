# GC Operating System — Architecture & Plan
### A personal, local-first productivity dashboard for Dr. Gowtham
*Prepared as a decision-ready brief — review, mark up, and let's discuss.*

---

## 1. Vision in one paragraph

**GC Operating System is a single, private, local-first cockpit that turns your static Excel weekly-planner into a living operating system for your day, your health, and your company.** It keeps the parts of the planner that already work — the 30-minute time-blocked agenda, the priorities checklist, the self-care and habit grids, the gratitude and reflection lines — and makes them *active*: tasks roll over automatically, health metrics flow in from your Apple Watch, company numbers sit one glance away, and a single morning brief tells you the three things that matter today. The core promise is **orientation in 60 seconds and nothing dropped**: every open loop, delegated task, awaited reply, and decision-to-revisit lives in one place, surfaced when it's due rather than remembered by you. It's built for *one* power user (you), runs on your own Mac and iPhone, and is designed to grow module-by-module over years without ever becoming someone else's product.

---

## 2. Module map

The two research catalogs overlapped heavily. I've **merged them into one canonical set** — collapsing duplicates (e.g. `execModules`'s "Command Center / Inbox" + `ceoKpis`'s "Daily Command Center" + "AI Daily Brief"; both "Time & Calendar" entries; both Health entries), resolving priority conflicts (I trust the founder-workflow dossier's "must-have" weighting on the cross-cutting capture/review layer over the generic tool-comparison dossier), and mapping each back to your planner data.

> **Naming note:** I'm calling the home surface the **Command Center** (Section 3 details it). The modules below are the things it aggregates.

---

### TIER 1 — CORE (build first)
*The spine. These reuse planner data directly and deliver value on day one. Without these the rest has nothing to aggregate.*

| Module | One-line responsibility | Core features | Key views / metrics | Time-saving automations | Planner data it reuses |
|---|---|---|---|---|---|
| **Today / Time-Block Agenda** | The planner's 30-min 07:00–23:30 grid, made live and category-tagged. | Editable 30-min block grid; category tags (Home/Work/Family/Health/…); drag-to-reschedule; named 90–120 min deep-work blocks. | Today's timeline; deep-work hours (protected vs interrupted); reactive-vs-planned split. | Auto-insert 10–20 min buffers between meetings; suggest best slot for a hard task; flag deep work scheduled in an energy dip. | **The time-blocked agenda + category tags** — the native spine. |
| **Tasks & Priorities** | The 15-item to-do list + weekly priorities, with rollover and projects. | Daily list (priority/due/subtasks); auto-rollover of unfinished items with aging counter; "This Week's Priorities" board; light projects (Kanban). | MIT hit-rate; priorities completed/week; overdue & aging tasks. | Auto-rollover; "delegate" action spawns a Waiting-On item (see Tier 1 Command Center). | **15-item to-do list + Priorities checklist.** |
| **Habits & Self-Care** | The self-care + habit grids as live, partly auto-checked trackers. | 7-day self-care grid (sleep 7h, water, 10k steps, 3 meals, gratitude, yoga); habit tracker (plan day, breaks, tidy, read, talk-to-5, screen limit, prep tomorrow); streaks. | Weekly completion %; streaks; habit consistency. | **HealthKit auto-checks** (steps/sleep/workout tick the box, no manual entry); nudges for missed water/steps in the brief. | **Daily Self-Care Checklist + Daily Habit Tracker.** |
| **Journal & Reflection** | Gratitude, "what went well," and the daily shutdown ritual. | 3 gratitude lines/day; "what went well today" reflection; end-of-day shutdown ("did I move my MITs?"). | Reflection streak; weekly rolled-up highlight reel. | AI weekly recap of patterns from your reflections; pre-loads tomorrow at shutdown. | **3 gratitude lines + "What went well today" reflection.** |

---

### TIER 2 — HIGH VALUE (the three confirmed modules + the founder layer)
*These are where the dashboard earns its keep for a CEO. Finance, Health, and Work are your confirmed three.*

| Module | One-line responsibility | Core features | Key views / metrics | Time-saving automations | Planner link |
|---|---|---|---|---|---|
| **Health / Fitness / Sleep** ✅ *confirmed* | Owns wearable data + the body-performance link. | Apple Watch sync (sleep stages, HRV, steps, activity rings, workouts, VO2max, resting HR); self-care targets vs actuals; readiness-aware planning. | Sleep/steps trends; activity rings; HRV; **health-adherence vs energy/MIT correlation**. | **Auto-pull from Apple Health** (zero manual entry — see §4); readiness flag feeds day planning. | Health blocks + self-care grid. |
| **Finance / Money** ✅ *confirmed* | Owns money tracking; separates personal vs company. | Personal vs company separation; net-worth & cash-flow; recurring bills/renewals with reminders; budgets; finance-tagged tasks flow in. | Net worth; cash-flow projection; upcoming obligations; runway/revenue glance. | Bill/renewal reminders surfaced in the morning brief; auto-categorized transactions (if bank-linked — see §4b). | "Finance" category + finance to-dos. |
| **Work / Company (company)** ✅ *confirmed* | Founder cockpit: priorities, people, decisions, KPIs. | Weekly priorities board; 1:1 / meeting hub; decision log; **company KPI glance**. | North-Star metric + 5 daily KPIs; weekly scorecard (last wk / target / forecast / notes / asks); OKR progress. | Auto pre-meeting brief; KPI threshold alerts; scorecard self-populates from CSV/source for the weekly review. | "Work" category + Priorities checklist. |
| **Weekly Review & Planning** | The keystone ritual that keeps the whole system trustworthy. | Guided GTD flow (Get Clear → Current → Creative); reviews open loops, MIT hit-rate, KPI scorecard, energy log; sets next week's priorities + pre-blocks deep work. | MIT hit-rate; time-by-category vs target; open loops carried forward. | **Pre-fills the entire review with the week's data** (no manual gathering); auto-drafts next week's deep-work blocks onto the grid. | "What went well" + Priorities as seeds. |
| **Time-Allocation & Energy** | Shows where your hours actually go vs where they should. | Aggregates category tags into time-spent; set target allocations; quick 1–5 energy rating per part of day; energy heatmap to find biological prime time. | Hours by category; actual-vs-target; strategic-work %; personal peak window. | **Computed straight from the grid (zero extra logging)**; weekly drift alert; suggests slots aligned to your energy curve. | **Category tags** drive this entirely. |
| **People / Light CRM** | Family/Social/Work relationships + the "talk to 5 people" habit. | Contacts + interaction timeline; relationship tags; keep-in-touch reminders; birthdays. | Who you owe a reply; relationships going cold; 30-day birthday window. | Keep-in-touch nudges; auto-log interactions from calendar/email (if linked). | "Talk to 5 people" habit; Family/Social categories. |
| **Goals & OKRs** | Quarterly/annual objectives → measurable key results. | Objectives with measurable KRs; per-goal roll-up; review prompts; links KRs to the North-Star. | OKR progress vs target; goals at risk. | Review prompts in the weekly ritual; auto-roll-up from linked tasks/KPIs. | Extends the Priorities concept upward. |

---

### TIER 3 — LATER (nice-to-have; add when the core is humming)

| Module | One-line responsibility | Notable features | Planner link |
|---|---|---|---|
| **Decision Journal** | Improve judgment by logging decisions + confidence, then reviewing prediction vs reality. | Decision/expected outcome/confidence %/alternatives; review-date reminders; calibration metric (confidence vs hit-rate). | New capability; pairs with Work + Finance. |
| **Inbox & Comms Batching** | Contain communication to 2–3 windows/day; reclaim deep work. | Scheduled comms windows on the grid; inbox-zero triage (do/delegate/defer/delete); AI thread & newsletter summaries. | "Limit screen time" habit. |
| **Focus & Energy (Deep Work)** | Automatic, timer-free tracking of where focus goes + a Focus Quality Score. | Passive time tracking; focus quality score; category mix. | Overlaps Time-Allocation; build only if you want passive auto-tracking. |
| **Learning / Reading** | The "read" habit → a read-later queue + highlights. | Read-later inbox; highlights library; spaced repetition; chat-with-highlights. | "Read" habit. |
| **Travel** | Trips/itineraries/packing for a traveling founder. | Trip records; auto-blocked travel days; packing checklists. | New capability. |

> **Opinionated cut:** I deliberately demoted *Focus & Energy* and *Inbox Batching* to Tier 3 even though one dossier rated them "high/must." Reason: their best features overlap with the Time-Allocation module and the Command Center's quick-capture, and both depend on integrations (passive trackers, email) that come late. Don't build them twice.

---

## 3. The Command Center / Home Dashboard

This is **not a module — it's the cross-cutting home surface** that every module feeds. It answers your explicit ask: *"track what's going on — ongoing items, issues, queries, follow-ups, waiting-on."* It opens by default.

The single most important piece here is the **Waiting-On / Open Loops register** — the GTD "Waiting-For" list. Every delegated task, open question, or awaited reply is logged with an owner, the ask, and a follow-up date, then chased proactively instead of from memory.

**Widgets (top to bottom, glanceable):**

1. **AI Daily Brief (hero, top).** One scannable card generated each morning: today's agenda + your **1–3 MITs** (Most Important Tasks, impact-ranked, with one pinned "Daily Highlight"), overdue follow-ups, 3–5 decisions needed today, KPI deltas, and a health/self-care nudge. A "what changed overnight" line. This is the headline time-saver — it ties every module into one 60-second read.
2. **Today's Timeline (left spine).** The live 30-min grid with your next deep-work block highlighted.
3. **Open Loops / Waiting-On register.** Status pipeline *Open → Waiting → Overdue → Closed*, grouped by context (company / Home / Finance / Health / Personal). Overdue items auto-escalate and turn red. One-tap "nudge" drafts a follow-up message.
4. **MITs + Top tasks.** Today's 1–3 must-dos with an end-of-day "did I move them?" check.
5. **Quick-Capture (Cmd+K, always available).** One keystroke to dump a thought/task/loop into the inbox from anywhere — triaged later. This is what keeps the system trustworthy.
6. **Company glance.** North-Star metric + the 5 daily KPIs as sparklines; anything breaching threshold flagged.
7. **Health rings + readiness.** Today's activity rings, sleep last night, a readiness signal that can soften or harden the day's plan.
8. **Self-care / habit ticks.** Today's grid, with HealthKit-auto-checked items already filled.

---

## 4. Apple Watch / Health integration

### VERDICT: **YES — fully achievable, but never directly from the web/desktop layer.**

The iron rule, confirmed independently by **all** the relevant dossiers: **HealthKit is on-device only.** There is no Apple cloud API, no OAuth, no webhook, no URL you can call with a token. A browser, a server, *and even your Tauri desktop app* cannot read Apple Health. **Something native on the iPhone must always be the bridge.** Critically, every aggregator (Terra/Vital/Rook/Spike) does *not* escape this — they all still require you to ship *their* native iOS SDK inside an app you build, while charging business-tier minimums ($300–$450/mo). They are the wrong tool for one user.

### Recommended path: **Health Auto Export → local webhook → Health module**

Use the consumer App Store app **Health Auto Export** (HealthyApps, ~$24.99 *lifetime*) as the bridge. Configure a **REST automation** that POSTs JSON (150+ metrics + workouts + rings) to a small authenticated endpoint your Health module owns, on a 1–2 hour schedule. No Xcode, no $99/yr Apple Developer Program, no App Store review, no app to maintain — a cheap consumer app does the hard HealthKit work and you just ingest JSON.

**Data that flows in:** sleep stages (awake/REM/core/deep), HRV (SDNN), resting & walking HR, steps, distance, active + basal energy, the three Activity Ring values, 70+ workout types (with GPS routes), SpO2, VO2max/cardio fitness, respiratory rate, mindful minutes, body measurements — essentially everything the Watch records.

**The one historical step:** do a single manual *"Export All Health Data"* once to seed your history from `export.xml`, then never touch it again (it's huge, slow, and schema-unstable — backfill only, never daily sync).

**Honest constraints:**
- **Locked-phone rule:** iOS blocks Health access while the phone is locked. "Real-time" really means "next time the phone is unlocked." For a dashboard you check a few times a day, fine — but **do not promise live streaming.**
- **Background throttling:** Low Power Mode / inactivity can delay syncs. Design the Health module to dedupe on sample timestamps and tolerate out-of-order, batched arrivals.
- **Privacy:** you're POSTing sensitive data. Keep the endpoint **local and authenticated** (bearer token via custom header, HTTPS). Do **not** route raw health data through third-party cloud (Make.com etc.).
- **Single-vendor dependency:** Health Auto Export is one indie dev. The free fallback is a vendor-independent **Apple Shortcuts** automation POSTing a handful of headline metrics (steps/HR/sleep/rings) to the same webhook.

**Effort:** **Low** — hours to wire up, ~$25 one-time. The Health *module* (storing + visualizing the JSON) is the real work, and that's just normal dashboard building.

**When to build a native companion instead:** only if you later want instant streaming, live in-workout data, or to turn this into a sellable product. Then the Tauri 2 iOS target (same codebase) can host a Swift/HealthKit plugin — but that's $99/yr, signing, consent prompts, and review rules. **Overkill today.** Start with Health Auto Export.

---

## 4b. Other useful integrations for a CEO

Ranked by realism. Same honesty about effort.

| Integration | Realistic? | Path | Effort | Notes |
|---|---|---|---|---|
| **Calendar (two-way)** | ✅ Yes | Google Calendar API / Microsoft Graph, or local CalDAV; sync into the Time-Block grid. | **Medium** | High value — the grid *is* a calendar. OAuth + token refresh is the main work. Start read-only, add write later. |
| **Email (triage + summaries)** | ⚠️ Partial | Gmail API / Graph for metadata + AI summaries; feeds Inbox Batching + Waiting-On. | **Medium-High** | Don't rebuild an email client. Pull threads needing follow-up; let "delegate" spawn a Waiting-On item. Defer to Tier 3. |
| **Finance / bank** | ⚠️ Partial | Plaid (US) / equivalent aggregator for transactions + balances → auto-categorized. | **Medium-High** | Region-dependent, often a monthly fee, and security-sensitive. Realistic alternative: **CSV import** from your bank for a local-first start, add live linking later. |
| **Task tools (Linear / Notion / Asana / ClickUp)** | ✅ Yes | Their official APIs (several are available as connectors in this environment). | **Medium** | Only worth it if you *already* live in one. Otherwise the native Tasks module is simpler and fully yours. |
| **Meeting notes (Granola / Fireflies / Zoom)** | ✅ Yes | APIs to pull transcripts/summaries → Work module 1:1 hub + Decision Journal. | **Medium** | Nice for the founder layer; Tier 3. |

**Opinionated stance:** Calendar first (it amplifies the spine). Everything else *after* the core modules are solid — integrations are where projects stall, so earn them.

---

## 5. Recommended tech stack

The two relevant dossiers are in full agreement here. One clear primary recommendation:

### PRIMARY (opinionated)

| Layer | Choice | Why |
|---|---|---|
| **Framework** | **React 19 + Vite + TypeScript** (SPA, no SSR) | Largest local-first/charting/Tauri ecosystem; SSR is wasted in an offline app. Vite gives fast HMR and trivially wraps in Tauri or ships as PWA. |
| **Shell / packaging** | **Tauri 2** | ~3–10 MB installers, ~30–50 MB RAM (vs Electron's 80–150 MB / 150–300 MB). Native macOS app **and** an iPhone build from *one codebase* — exactly your Mac+iPhone need, and the future home of a HealthKit plugin if ever wanted. Electron is disqualified: no iOS path. |
| **UI** | **shadcn/ui + Tailwind** (shell/primitives) + **Tremor** (dashboard widgets: KPI cards, tables, charts) | The 2025/26 default: copy-paste, you own the source, Radix-accessible, themeable. Tremor is purpose-built for analytics dashboards. |
| **Charts** | **Recharts / Tremor** default; **ECharts** reserved for heavy time-series | Recharts' JSX API covers most needs; drop to ECharts (WebGL, 100k+ points) only for large Health/Finance history. Don't rewrite the viz layer — swap individual charts. |
| **Data layer** | **SQLite in OPFS via SQLocal + Drizzle ORM** | **The load-bearing decision.** Real relational SQL with joins/aggregations *across* modules, typed schemas, per-module migrations, millions of rows — and a clean future path to sync. Reactive reads via **TanStack Query** over the SQLite layer. |
| **Module architecture** | **Compile-time module registry** | Each module = a self-contained folder exporting a **manifest** `{ id, nav entry, routes, widgets, own Drizzle schema + migrations, settings }`, registered in a central `modules[]` array. A thin shell owns layout, routing, theming, the **single** DB connection, and a shared query/event bus. Modules own their data + views. |
| **Sync / backup** | **Local-only on day one.** Backup = periodic encrypted SQLite-file copy to iCloud Drive / Time Machine. | Real sync engines (PowerSync, ElectricSQL) solve a *multi-user/multi-device* problem you don't have yet and demand a Postgres + upload API. Add later — the relational schema keeps that migration clean. PowerSync is the pick when Mac↔iPhone live sync becomes real. |

**Why this and not the alternatives, in one line each:** React+Vite = deepest ecosystem; **SQLite+Drizzle, not Dexie** = the only data choice that scales across many interrelated modules and into sync; Tauri 2, not Electron = tiny app + the iPhone target you specifically want; a module registry, not Module Federation = true modularity with zero micro-frontend infra.

**Two critical gotchas to handle early:** (1) OPFS SQLite runs in a Web Worker and may need COOP/COEP cross-origin-isolation headers — test persistence first. (2) Keep **one** DB connection in the shell and pass it down; never let modules open their own OPFS handle (locking/corruption risk).

### LIGHTER FALLBACK (zero native toolchain)

A pure **installable PWA**: React + Vite + shadcn/Tailwind/Tremor, **Dexie (IndexedDB)** instead of SQLite, same module-registry architecture. Installs to the Mac dock and iPhone home screen, works offline, no Rust/Xcode.
**Trade-offs:** no real native macOS integration, weaker cross-module relational queries (key-value, not SQL), and **no HealthKit access at all** — you'd rely on manual Health CSV/JSON import. Choose this *only* if avoiding native build tools matters more than relational power and auto Health sync. Given you specifically want Apple Watch data, the primary stack is the right call.

---

## 6. Data model sketch (high level)

**Shared core (owned by the shell):**

- **Day** — date; links to that day's blocks, tasks, habits, journal. The anchor entity.
- **TimeBlock** — day, start/end (30-min granularity), `Category`, task/label, `isDeepWork`, planned-vs-actual.
- **Category** — enum-ish lookup (Home, Work, Family, Health, Social, Personal, Finance, Leisure, Daily, Other) + target allocation %.
- **Task** — title, status, priority, due date, `isMIT`, `isDailyHighlight`, parent (subtasks), project ref, `delegatedTo` (→ spawns OpenLoop), rollover/aging counter.
- **Priority** — weekly priorities (the checklist), linked to a week + optional Goal.
- **Habit** + **HabitLog** — habit definition (self-care & habit-tracker items) + per-day check (manual or HealthKit-sourced).
- **JournalEntry** — day, 3 gratitude lines, "what went well" reflection, shutdown notes.
- **OpenLoop / WaitingOn** — the cross-cutting register: type (delegated/query/awaited-reply), owner, ask, context, status (Open→Waiting→Overdue→Closed), follow-up date, note thread.
- **EnergyRating** — day, part-of-day, 1–5 (feeds the energy heatmap).
- **CaptureItem** — raw Cmd+K inbox dumps awaiting triage.

**Per-module entities (each in its own Drizzle schema/migrations):**

- **Health:** `HealthSample` (metric type, value, unit, source, timestamp — deduped), `Workout`, `SleepSession`, `DailyActivity` (rings).
- **Finance:** `Account`, `Transaction` (category, personal/company flag), `RecurringBill`, `BudgetLine`, `NetWorthSnapshot`.
- **Work:** `KPI` + `KPIReading`, `WeeklyScorecard`, `Meeting`/`OneOnOne`, `DecisionLogEntry`.
- **Goals:** `Objective` + `KeyResult` (with progress, linked tasks/KPIs).
- **People:** `Contact`, `Interaction`, `KeepInTouchRule`.
- **Decision Journal:** `Decision` (context, expected outcome, confidence %, alternatives, review date, actual outcome).

---

## 7. Phased roadmap

Each phase is a **shippable, usable increment** — you use it before the next begins.

**Phase 0 — Foundation & shell (the skeleton that everything plugs into).**
Tauri 2 + React/Vite/TS scaffold; shadcn/Tailwind theme; SQLite/OPFS + Drizzle with the shared core schema; the module-registry contract; **one-time import of your existing Excel planner** (parse the time-blocked grid, categories, priorities, self-care/habit grids, gratitude, to-dos, reflections into the data model). *Outcome: your sheet, now a real local database, viewable in a shell.*

**Phase 1 — Core spine (Tier 1).**
Today/Time-Block Agenda + Tasks & Priorities + Habits & Self-Care + Journal, plus a first **Command Center** with Quick-Capture, MITs, today's timeline, and the **Open Loops / Waiting-On register**. *Outcome: a daily-driver that replaces the paper planner.*

**Phase 2 — Health module + Apple Watch.**
Health module schema + the local webhook endpoint; wire up **Health Auto Export** (and the one-time historical XML backfill); rings/sleep/HRV/steps views; **HealthKit auto-checks** onto the habit grid. *Outcome: your body data flows in automatically.*

**Phase 3 — Founder layer.**
Work/Company (KPI glance, scorecard, 1:1 hub, decision log), Finance (bills, net worth, personal/company split — CSV import first), Time-Allocation & Energy (computed from the grid), and the **Weekly Review ritual**. Upgrade the AI Daily Brief to pull from all of these. *Outcome: the CEO cockpit is real.*

**Phase 4 — Integrations.**
Two-way Calendar sync first; then email triage/summaries and/or live bank linking; People CRM; Goals/OKRs. *Outcome: the dashboard reaches into your real tools.*

**Phase 5 — Polish & later modules + (optional) sync.**
Decision Journal, Learning, Travel, Focus tracking. If/when you genuinely want Mac↔iPhone live sync, add PowerSync on the existing schema. *Outcome: the long tail, on demand.*

---

## 8. Open questions for Dr. Gowtham

Decisions needed before we build:

1. **Devices & the iPhone question.** Is the **iPhone app a "must-have now" or a "someday"?** If now, we commit to the Tauri iOS toolchain (Xcode, signing) early. If someday, we ship the macOS app first and add iOS later from the same codebase — and Health Auto Export still works either way.
2. **Sync appetite.** Are you happy with **local-only + iCloud file backup** to start (my recommendation), or do you need **live Mac↔iPhone sync** from day one? The latter front-loads real infrastructure cost; I'd defer it.
3. **Which modules first, beyond the spine?** Of the confirmed three, **what's the priority order — Health, Finance, or Work?** (My default: Health in Phase 2 because Apple Watch auto-sync is high-delight and low-friction; Work + Finance in Phase 3.)
4. **Integration appetite & data sensitivity.** Are you comfortable **OAuth-linking Google/Microsoft calendar and email**, and **bank-linking via Plaid** (a paid, security-sensitive aggregator) — or do you prefer to start with **CSV/manual import** and add live links only once you trust the system?
5. **AI features — how far?** The Daily Brief, newsletter/thread summaries, reflection-pattern recaps, and decision pre-fill all assume an LLM. **Local model, or a cloud API (e.g. Anthropic) with your data sent out?** This affects privacy posture and architecture.
6. **Company KPIs — what are they?** To build the Work cockpit we need your **actual North-Star metric and 5 daily KPIs for company**, and where they live today (a sheet? a tool? manual?) so we know whether the scorecard self-populates or is hand-entered.

---

*Files referenced are conceptual (no code written per scope). When you're ready, Phase 0's first concrete artifact is the Excel-planner parser + the shared-core Drizzle schema — that's the natural place to start the build conversation.*

---

A few synthesis calls I made that are worth flagging for our discussion: I **merged the two Command-Center/Daily-Brief concepts into one home surface** (they were near-duplicates across dossiers); I **demoted Focus-tracking and Inbox-Batching to Tier 3** because they overlap with Time-Allocation and Quick-Capture; and I **rejected the aggregator APIs entirely** (Terra/Vital/etc.) since both health dossiers agree they don't remove the native-app requirement yet cost 10–20× more than Health Auto Export. The biggest genuinely-open decision is **#5 (AI/privacy)** — it shapes the architecture more than any other answer.

---

# Part II — Module deep-dives (refined from Dr. Gowtham's handwritten plan)

*This part refines the Section 2 module map above using the four pillars you sketched — Health, Financial, Work, Habit Tracker — and adds the enhancements to make each better. India-specific (INR, SIP, no Plaid) and founder-specific decisions are locked here.*

## Module deep-dives & enhancements

### Health / Fitness / Sleep
**Purpose:** Turn the Apple Watch plus a few manual taps into a near-zero-effort body OS that tells you each morning how hard you can push today — and proves which health habits actually move your energy and output.

**Covers your sketch:** BMI/blood-pressure & body parameters → body-composition + vitals trends with Asian-Indian ranges; Food → India-first calorie/macro logging *plus* food-habits intelligence; Workout → auto-imported walking/exercise/running/other from the Watch; Sleep → stages, debt, and consistency.

**Core features**
- Apple Watch / HealthKit auto-sync via Health Auto Export → local webhook (sleep stages, HRV, resting/walking HR, steps, energy, rings, 70+ workout types with GPS, SpO2, VO2max, respiratory rate, body metrics); deduped, batch-tolerant, with one-time XML historical backfill.
- BMI & body-composition: weight/BMI/body-fat/waist with rolling averages, **Asian-Indian cut-offs** (overweight ≥23, obese ≥25), and goal-weight ETA.
- Blood pressure & vitals: systolic/diastolic/pulse with AHA range flags, extensible panel for fasting/PP glucose (India diabetes weighting), SpO2, resting HR, and a lab panel (HbA1c, lipids, vit D/B12, thyroid).
- Food, calorie & macro logging against an India-first DB (idli/dosa/roti/dal/biryani, regional + home-cooked, packaged brands), daily kcal/macro budget rings, water tracker, copy-yesterday and favourites.
- Food-habits intelligence: meal-timing, late-dinner/skipped-meal flags, eat-out frequency, protein adequacy, weekday-vs-weekend drift.
- Workout tracker auto-categorised into your four buckets with HR zones, pace/route, weekly training load, and steps target.
- Sleep tracker: stages, time-in-bed vs asleep, **14-day sleep debt**, and consistency/social-jetlag, with overnight HR/HRV/respiratory rate as recovery context.
- Health home & trends: today's rings + readiness, trend tiles with sparkline/rolling-avg/range-flag/arrow, and a 7d/30d/90d/1y toggle.

**✨ Additions to make it better**
- **Daily Readiness Score (0–100)** with a plain-English verdict, blending sleep, sleep debt, HRV vs baseline, resting HR vs baseline, and prior-day strain. `[must]`
- **Health ↔ Productivity correlation engine** — plain-language findings joining sleep/HRV/readiness with MIT hit-rate, deep-work hours and energy ratings (the killer feature only a unified local OS can build). `[must]`
- **Readiness-aware day planning** — feeds the score into the Today agenda and Daily Brief to soften red/amber days and front-load hard strategic work on green days. `[high]`
- **Barcode + AI photo meal logging** — cuts Indian-food logging from ~60s to ~5s, the difference between a habit that sticks and one abandoned in a week. `[high]`
- **Medication, checkup & lab reminders** routed through the brief + Open-Loops, with lab-PDF import auto-parsing values and setting the next due date. `[high]`
- **Trend anomaly & early-warning flags** — calm "worth noting" cards for elevated resting HR/respiratory rate, falling HRV, creeping BP, or sudden weight swings. `[high]`
- **Smart hydration & movement nudges**, quiet and focus-aware. `[nice]`
- **Weekly health review card** that slots into the existing Weekly Review ritual. `[nice]`

---

### Finance / Money
**Purpose:** Give a 60-second answer to "Am I OK?" across personal and company money — net worth, runway, what's due, and whether investments are on track — without spreadsheet drudgery.

**Covers your sketch:** Monthly spending → categorized India-tuned spend with MoM deltas; Saving/Stock/SIP/Real estate/Rental/etc. → a holdings table spanning the full Indian asset stack with SIPs first-class; Budgeting → live budget-vs-actual with salary-cycle support.

**Core features**
- **Personal vs company ledger separation** — a hard scope flag on every account/transaction/asset, with split support for mixed items and a single view-wide toggle.
- Categorized monthly spending against an India chart of accounts (Rent/EMI, groceries, fuel, utilities/recharge, domestic help, school fees, premiums, etc.) with drill-down and MoM/3-month deltas.
- Investment portfolio across savings, NSE/BSE stocks, MF (SIP & lumpsum), FD, PPF, NPS, EPF, gold/SGB, bonds, real estate, rental — each with invested/current/gain/annualized return; SIPs show amount, debit date, folio, units.
- Net-worth tracker (assets − liabilities) with monthly auto-snapshots and a 12-month trend.
- Budgeting with 80% amber / 100% red bars on calendar-month or salary-cycle.
- Recurring bills, EMIs & SIP register driving the morning-brief reminders.
- Rental income & property tracking (expected vs received, late-rent flag, market value, loan against).

**✨ Additions to make it better**
- **XIRR & true annualized returns** per holding, asset class and portfolio, with a benchmark column — the only honest number for SIP investing. `[must]`
- **Cash-flow projection & runway** for both household and company (months of runway, lowest projected balance). `[must]`
- **India tax-relevant tagging** — 80C/80D/80CCD(1B)/24(b) and STCG/LTCG lots with the ₹1.25L LTCG exemption, rolling up to a filing-ready year-end "tax pack." `[must]`
- **Net-worth & spend anomaly alerts in the morning brief** (SIP debits tomorrow, dining over budget, premium due, rent not received). `[must]`
- **CAS / statement import pipeline** — parse the CAMS/KFintech/NSDL/CDSL CAS PDF to bulk-load the whole MF/demat portfolio in one shot; broker/bank CSV mappers with saved column maps. `[high]`
- **Portfolio allocation & drift alerts** vs target, with sector/fund-overlap detection. `[high]`
- **Goal-based investing tracker** with required-monthly-SIP math, linked up to the Goals/OKRs module. `[high]`
- **company runway & founder-finance glance** (cash, burn, runway, upcoming GST/advance tax/payroll). `[high]`
- **What-if & SIP step-up / loan-prepay simulator.** `[nice]`
- **Local document vault** for policies, property papers, Form 16, FD receipts. `[nice]`

---

### Work — company Founder Operations Cockpit
**Purpose:** A 60-second "is the company on track and what needs me today" cockpit — priorities, verticals, delegated work, team load, schedule and strategy in one place, chasing you instead of you chasing them.

**Covers your sketch:** To-do list → founder-grade tasks with MITs and auto-rollover; Verticals + progress → first-class business-unit cards with RAG status, KPIs and roll-up; Assigning work → delegation that auto-spawns a Waiting-On; Workload splitting → a team-capacity heatmap; Calendar schedule → 2-way synced time-block grid with pre-briefs; Future/Strategy/Expansion → roadmap + OKRs + a scenario forecaster.

**Core features**
- Founder To-Do & Priorities with MIT flag, aging rollover, light Kanban, and optional Vertical/Owner tags.
- Business Verticals Board — owner, RAG status, 1–3 KPIs vs target, milestones, auto-computed % progress, portfolio view ranked by health.
- Delegation Tracker — assign with ask/due/cadence; auto-creates an Open-Loop; overdue items escalate to red with a one-tap drafted nudge.
- Team Capacity / Workload Split — people-by-week utilization heatmap with overload bands and drag-to-rebalance.
- Founder Calendar — Google/Microsoft/CalDAV 2-way sync, auto pre-brief per meeting, one-line post-meeting action capture.
- Strategy, Roadmap & OKRs — initiatives → projects → milestones timeline, quarterly OKRs that roll up to the North-Star.
- Expansion / Scenario Forecast — model new vertical/hire/city in INR (with statutory loading + GST), projecting burn/runway/break-even; baseline pulled from Finance.

**✨ Additions to make it better**
- **North-Star + Weekly Scorecard** (EOS-style 5–15 measurables, 13-week trailing, red cells) — pre-filled so the weekly review is decision-making, not data-gathering. `[must]`
- **Vertical RAG auto-flip + "needs attention" digest** — status flips on KPI breach/milestone slip/staleness; the brief surfaces only what changed, so you manage by exception. `[must]`
- **Delegation follow-up automation with draft nudges** — closes the #1 founder leak (delegated work that quietly dies). `[must]`
- **Capacity overload warnings at assignment time** with a "who has room" suggestion. `[high]`
- **1:1 & Meeting Hub** — rolling per-person agendas, auto pre-brief, captured actions/decisions; ~10–15 min saved per meeting. `[high]`
- **Decision Log** with confidence % and review date for judgment calibration over time. `[high]`
- **AI Weekly CEO Scorecard & brief** — generated company-state narrative + 3 suggested focus areas. `[high]`
- **Accountability map (who owns what)** — EOS-style chart exposing coverage gaps. `[nice]`
- **Strategy/roadmap board with quarter pacing** (ahead/on/behind). `[nice]`
- **Meeting-cost & reactive-vs-strategic glance** to defend deep-work time. `[nice]`

---

### Habit Tracker (Habits, Goals & Challenges)
**Purpose:** Turn static self-care/habit grids into a self-reinforcing system that auto-checks what the Watch already proves, makes consistency visible, and ties every habit up to a goal or challenge — so behaviour change runs on autopilot, not willpower.

**Covers your sketch:** Goal setting → measurable outcome/identity goals with goal→habit linkage; New challenge → time-bound sprints with countdown; Weight loss → flagship goal fed by Health body-metrics + calories; Food control → no-sugar/no-late-snack/hydration habits; Healthy habits, etc. → unlimited positive/quit habits seeded from your planner.

**Core features**
- Habit library (positive + quit) with schedule, target value/unit, reminders — seeded from your paper grids so day one isn't blank.
- Daily self-care + habit grid — the digital twin of your checklist, one-tap done, rendered as the Command Center "habit ticks" widget.
- Streaks & consistency % (rolling-window, not all-or-nothing), GitHub-style heatmap, and a streak-freeze/rest day to prevent guilt-driven abandonment.
- Goal setting with goal→habit linkage and auto roll-up from habit consistency + hard metrics (weight, calorie adherence); orphan habits flagged.
- Time-bound challenges with countdown, pass/fail ledger, optional ramp, and "graduate to permanent" on completion.
- Weight-loss & food-control control panel fusing the two flagship items with a projected goal date.
- Weekly habit review, pre-filled, feeding the existing Weekly Review.

**✨ Additions to make it better**
- **HealthKit auto-check (zero-tap completion)** — steps, workout minutes, mindful minutes, sleep ≥7h, stand goal tick themselves; kills the #1 reason trackers die. `[must]`
- **Gentle nudges in the AI Daily Brief** instead of nagging notifications, encouraging and never guilt-based. `[must]`
- **Habit stacking & implementation intentions** ("After I [anchor], I will [habit]"), chainable into named morning/shutdown routines. `[high]`
- **Identity-based framing** ("you showed up as someone who reads — 18 of 20 days") to sustain habits past the ~66-day automaticity mark. `[high]`
- **Two-minute rule & flexible scheduling** (minimum versions, X-times/week, planned rest) to survive busy founder days. `[high]`
- **Founder-grade gamification** — XP, clean milestone badges, self-defined real-world reward ledger; strictly toggleable, no kiddie RPG. `[nice]`
- **Readiness-aware suggestions** — auto-soften physical habits on low-recovery days. `[nice]`
- **Habit insights & correlations** (which habits actually move energy/focus/output). `[nice]`

---

### Command Center / OS layer
**Purpose:** Orient you in 60 seconds and guarantee nothing drops — one cross-cutting surface aggregating all four pillars into a daily brief, an everything-in-flight register, frictionless capture, and an AI that decides what matters today.

**Covers your sketch:** Not a named pillar — this is the connective layer the brief asks for. Work's delegation/workload seeds the Waiting-On register; calendar + to-do feed Today's Agenda + MITs; future/strategy and goals/challenges feed the reviews; all four pillars' headline numbers become the home glance tiles.

**Core features**
- Command Center home — AI brief hero, the 30-min time-block agenda spine, 1–3 MITs + pinned Highlight, an Open-Loops strip, and six glance tiles (health/readiness, money, company KPIs, habit streaks, weekly priorities, net-worth delta).
- AI Daily Brief — today's shape, impact-ranked MITs, overdue follow-ups, decisions needed, KPI deltas, a sleep/readiness nudge, and a "what changed overnight" line, ending on one recommended first move.
- Open-Loops / Waiting-On register (cross-pillar) — every delegation, awaited reply, decision-to-revisit, money item and health follow-up, with status pipeline, follow-up date and auto-escalation.
- Cmd+K universal quick-capture + Inbox triage with AI pre-classification (inbox-zero as the trust anchor) and command-palette actions.
- Weekly Review ritual, auto-pulled from every pillar (Get Clear → Get Current → Plan), outputting a one-page digest and seeding next week.
- Cross-pillar intelligence engine — SQL joins across Health × Tasks/Time × Finance × Habits × Goals with honest confidence flags.
- AI assistant ("what should I focus on today?", "what am I waiting on from X?") grounded in the local DB, with scoped, confirmed actions.
- Global search (SQLite FTS + optional semantic), unified rules-based reminders/notifications, and daily/weekly digests + encrypted local backup/export.

**✨ Additions to make it better**
- **Daily planning + shutdown bookends (Sunsama-style)** with an over-commitment warning when committed hours exceed available focus hours. `[must]`
- **Readiness-aware day shaping** — proactively soften low-recovery days, propose big strategic blocks on high-readiness days (blending signals, not sleep alone). `[high]`
- **Auto-nudge drafting for Waiting-On items** with an optional gentle→firm→"decision-by-X" escalation ladder. `[high]`
- **Voice + share-sheet capture on iPhone, with NL parsing** ("pay GST Friday ₹40k" auto-fills type/owner/amount/date). `[high]`
- **Decision queue + decision-journal hook** (confidence % and review date) as a first-class brief lane. `[nice]`
- **Streak-safe protection + smart snooze** that reschedules to the next realistic slot. `[nice]`
- **Personal North-Star + monthly "life dashboard" review** to catch slow drift (spending creep, goal slippage, declining sleep). `[nice]`

---

## Top 10 highest-leverage additions

1. **Health ↔ Productivity correlation engine** *(Health/OS)* — Proves in business terms which health habits drive output ("7h+ sleep → 78% MIT hit-rate vs 41%"); the one feature no standalone app can build, and the strategic justification for the whole unified OS.
2. **AI Daily Brief + readiness-aware day shaping** *(Command Center)* — Replaces opening four trackers with a 60-second read that already reshapes today around your recovery state; the single biggest daily time-saver.
3. **Delegation follow-up automation with draft nudges** *(Work)* — Stops delegated work from silently dying; one tap to chase instead of recalling context and composing — the highest-leverage founder fix.
4. **Daily Readiness Score (0–100)** *(Health)* — One morning number decides whether today is a push-and-train day or a recover-and-delegate day; ends guesswork about how hard to go.
5. **Cash-flow projection & runway (household + company)** *(Finance)* — Answers a founder's #1 money question — "how many months do we have?" — instantly, for both home and company.
6. **HealthKit auto-check for habits** *(Habits)* — Auto-completes ~half the grid (steps, sleep, workout, mindfulness) with zero taps, killing the manual-logging death spiral that kills every habit app.
7. **North-Star + Weekly Scorecard (auto-pulled)** *(Work/OS)* — Compresses the whole company state into a pre-filled one-pager so the weekly review is acting on red cells, not gathering numbers.
8. **India tax-relevant tagging + year-end tax pack** *(Finance)* — Turns a scattered year into a filing-ready 80C/LTCG summary; flags unused headroom before 31 March — real money saved, hours of CA back-and-forth avoided.
9. **CAS / statement import pipeline** *(Finance)* — Loads an entire MF/demat portfolio from one consented PDF (the realistic India auto-path since Plaid doesn't work here), replacing dozens of manual entries.
10. **Cmd+K capture + AI inbox triage with NL parsing** *(Command Center)* — Capture without forms from anywhere, classified for you — the difference between a system you trust and one you stop feeding.

---

## What this changes in the build plan

**New / extended data-model entities**
- **Work** is the biggest expansion beyond a task list: it needs **Vertical** (owner, RAG status, KPIs, milestones, progress roll-up), **Delegation/OpenLoop** (auto-spawned, owner, follow-up date, escalation), **Person/Capacity** (weekly hours, utilization), **Scorecard/Measurable** (13-week trailing), **Decision** (confidence %, review date), and **Scenario** (forecast assumptions → burn/runway/break-even).
- **Finance** extends the base ledger with **scope flag** (Personal/company/Mixed + split), **Holding** across all Indian asset classes, **NetWorthSnapshot**, **BudgetLine**, **RecurringObligation** (SIP/EMI/premium/tax), **Goal** (with required-SIP), **TaxTag/CapitalGainsLot**, and a **DocumentVault** entity.
- **Health** adds **Body/Vitals**, **FoodLog**, and **Readiness** tables on top of the existing HealthSample/Workout/SleepSession/DailyActivity, plus a **LabReport** import path.
- **Habits** adds **Goal** (shared spine with Work/Finance goals), **Challenge**, and **HabitLog** with rolling-consistency computation and HealthKit auto-check wiring.
- **Command Center** owns only **OpenLoop**, **CaptureItem**, **WeeklyReview**, **reminder rules**, and the **brief/digest archive** — everything else is computed via cross-module SQL joins, which is the architectural reason the relational SQLite layer must come first.

**India-specific decisions (locked in)**
- **No Plaid.** Finance is **manual / CSV / CAS-PDF-first**; UPI-SMS-assisted entry on iPhone; **Account Aggregator (Setu/Finvu)** is a deferred later phase, not v1.
- **Asian-Indian BMI cut-offs** (≥23 / ≥25) and **glucose/HbA1c weighting** given local diabetes prevalence; **India-first food DB** bundled locally.
- All money inputs in **INR** with lakh/crore grouping; forecasts include **statutory loading (PF/ESI/gratuity) + GST**; reminders understand **SIP debit dates, rent cycles, GST/advance-tax dues**.
- **IST + Indian festival/holiday awareness** for briefs, reminders, agenda and challenge rest days; **local-first/DPDP-friendly** — health and financial data stay on-device, only the structured snapshot is sent to the LLM (open question #5).

**Phase implications**
- Phase 0 seeds Habits + self-care grid from the **Excel planner import**; Health does a **one-time XML backfill** to establish baselines.
- The **Health Auto Export webhook** is the spine that must land early — it unblocks Readiness, habit auto-checks, and the correlation engine.
- The **cross-pillar intelligence engine, correlation insights, and AI assistant** are explicitly *last* (they depend on every module's data flowing), but the **shared OpenLoop/CaptureItem entities and Cmd+K capture** should ship early since every pillar produces into them.

---

# Part III — Locked decisions (2026-06-17)

1. **Devices:** Build the macOS (Tauri 2) app first; add the iPhone build later from the same codebase.
2. **Sync:** **Live Mac↔iPhone sync from day one** (overrides the earlier local-only default). Requires a sync-capable local-first data engine + a small backend in Phase 0. Hard requirement: **end-to-end encryption or self-hosting** so raw health/financial data is never readable on the server (DPDP-aligned).
3. **AI:** Anthropic cloud API; only a **structured snapshot** (not raw records) is sent off-device.
4. **First module after the core spine:** **Health + Apple Watch** (via Health Auto Export → local/relay endpoint).
5. **Region:** India — INR, SIP/MF/PPF/NPS/rental first-class, no Plaid, Asian-Indian health ranges, IST.
