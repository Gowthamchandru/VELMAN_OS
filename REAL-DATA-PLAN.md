# Converting Velman OS to Real Data

## 1. The one idea

Real data enters a personal dashboard exactly three ways — **manual entry** (forms, inline edit, Cmd+K capture), **file import** (Excel done; CSV; CAS/health PDFs), and **device/service sync** (Apple Watch now; calendar/bank later). Every module is just a different *mix* of those three. The single thing that unblocks all of them is one foundation: replace today's read-only seed/demo imports with an **editable, persistent, syncing PowerSync + Drizzle SQLite DB exposed through a repository layer** — sitting behind the exact seam `app/src/lib/data.ts` already established. Build that once, and every module conversion becomes a mechanical "swap the demo for a repo" change with the UI untouched.

## 2. Step 0 — the foundation (do this first, once)

This is the long pole. Everything else is gated on it. Ordered checklist:

| # | Step | Who | Notes |
|---|------|-----|-------|
| **F0** | `xcode-select --install` + `rustup` (Rust ≥ 1.77) | **You (user)** | Rust is **not installed** — confirmed no `~/.cargo`. Blocks the desktop shell and the health ingest listener. ~30 min. |
| **F1** | Add Tauri 2 to the existing Vite app (`src-tauri/` scaffold) | Me | No `src-tauri/` exists yet. macOS target first. |
| **F2** | Install `@powersync/tauri-plugin` + `cargo add tauri-plugin-powersync` + Drizzle; write `sync/`, `schema.ts`, `client.ts`, `crypto.ts` | Me | Use the **official PowerSync Tauri SDK** (native SQLite) — do *not* hand-roll wa-sqlite. It's alpha; Plan B is `@powersync/web` OPFS in the webview. Local schema is **declarative from `DrizzleAppSchema`** — no client migration files. |
| **F3** | Build `client.ts` (one `db = wrapPowerSyncWithDrizzle(...)`), per-module `repo.ts`, a `useWatched` hook; rewrite `data.ts` bodies; delete demos | Me | `db.watch` fires on any local-or-sync change → live UI + free optimistic writes. |
| **F4** | Port `importPlanner.mjs` → `excelImporter.ts`; seed once (`seeded_v1` flag, deterministic ids) | Me | First launch is non-empty and editable; idempotent on natural keys. |
| **F5** | Generic edit primitives (inline edit + Cmd+K capture) | Me | |
| **F6** | Stand up the self-hosted sync VM; wire backend connector; enable E2E cipher; prove sync with a 2nd instance | **You + me** | See cost below. |
| **F7** | Rust loopback ingest listener for Health Auto Export | Me | Enables Apple Watch sync. |

**What the sync backend actually costs and requires (honest):**
- **Local-only dev = $0.** You can run editable + persistent on-device immediately (F1–F5) with **no server, no cost** — the DB is real SQLite on your Mac. Sync (Mac↔iPhone) is the *only* part that needs a server.
- **When you want sync:** one India VM running Docker Compose = Postgres + `journeyapps/powersync-service` (Open Edition) + a thin Node upload endpoint + TLS. **~1–2 days to stand up, ~INR 500–1,500/mo.**
- **E2E encryption is real:** each synced health/finance row stores **one opaque AES-GCM cipher column**; the server holds **ciphertext only**. Decryption happens on-device into a local-only mirror the UI queries. The key lives in macOS Keychain and **never syncs**. Core planner data stays plaintext (it's not sensitive and keeps queries simple).

**My recommendation: start local-only.** Get real, editable data on screen this week. Provision the sync VM only once single-device editing feels good — sync is an add-on, not a prerequisite.

## 3. Per-module: where real data comes from

| Module | Manual entry | File import | Device/service sync | What you supply *first* |
|---|---|---|---|---|
| **Planner core** (agenda, tasks, MITs, habits, journal, priorities) | **Dominant.** Inline edit on every span; Cmd+K → `capture_item` triaged into task / open-loop / time-block / journal. Daily rollover bumps unfinished tasks + copies unchecked priorities forward | One-time Excel seed (already built → `excelImporter.ts`, now idempotent) | *Later:* 2-way Google/MS Calendar (read-first, then write-back) via nullable `externalSource`/`externalId` added now | Nothing — the Excel seed already populates it; just start editing |
| **Health** | Weight/body-fat/waist (→ BMI computed, `bmiCategoryIndia`), BP (`bpCategory` — Watch can't measure it), **India-first food/water log** (HealthKit has no food DB), lab values (HbA1c, lipids, Vit D/B12) | One-time `export.xml` backfill (iPhone → *Export All Health Data*); CAS-style lab PDFs later | **Primary: Apple Watch** → iPhone Health → *Health Auto Export* app → REST POST → Tauri Rust loopback listener → dedupe → upsert. Covers steps, activity rings, sleep stages, HRV/RHR/HR, workouts | The *Health Auto Export* iOS app (paid) + one REST automation pointed at your Mac; height for BMI |
| **Financial** | Forms + inline edit + Cmd+K into `fin_*` tables; holdings the CAS misses; 80C/80D limits | **CSV** (bank/broker, saved column maps, de-duped); **CAS PDF** via `casparser` on-device Tauri sidecar (CAMS/KFintech → MF txns→XIRR; NSDL/CDSL → demat holdings; password = PAN+DOB) | *Post-v1:* Setu/Finvu Account Aggregator. **Never Plaid.** | One CAS PDF + one bank CSV to test the importers |
| **Work** | **Dominant.** KPIs + readings (RAG auto-flip, 13-week scorecard), verticals/milestones, open-loops (delegation w/ escalation), team allocation (overload warnings), initiatives, scenarios | KPI CSV → upsert `kpi_reading` keyed by `kpiId`+`date` (uses installed `xlsx`) | *Later:* optional task-tool sync via `externalSource`/`externalId` | Your real KPIs (names, targets, RAG thresholds) |

Computed/derived (on-device, not entered): Health **readiness** (no native HealthKit metric — computed nightly from HRV/RHR baselines + sleep + strain; needs ~2 weeks to baseline); Finance **XIRR / net worth / allocation / runway**; **Health↔productivity correlation** (joins health + task tables).

## 4. The migration mechanic

Every demo/seed file dies the same way: the UI keeps importing the **same function names from the same seam**; only the function *bodies* change from "return demo constant" to "Drizzle query that `watch`es the DB."

**Before** (today — Health imports the demo directly, no seam):
```ts
// Health.tsx
import { readiness, activity, body, bp } from './healthDemo'
// ...renders readiness, activity, body, bp directly
```

**After** (introduce the seam, then back it with a repo):
```ts
// modules/health/data.ts  ← the seam (mirrors lib/data.ts). Keep India logic here.
export function getReadiness() { return healthRepo.readiness() }  // Drizzle .watch over local SQLite
export function getActivity()  { return healthRepo.activity() }
export { bmiCategoryIndia, bpCategory } from './ranges'           // moved out of the demo

// Health.tsx — one mechanical pass, never changes again:
import * as health from './data'
// ...health.getReadiness(), health.getActivity()
```

The same move for `lib/data.ts` (planner — seam already exists, just rewrite bodies to `coreRepo`), `financeDemo.ts` → `financeRepo.ts`, `workDemo` → `workRepo.ts`. Each repo exposes `list/get/create/update/remove/watch`; every write stamps `updatedAt` + `lastWriterId`, `remove` = soft delete (`deletedAt`), and `db.watch` makes the UI live and optimistic for free. **Planner's first move is establishing the seam parity — Health has *no* seam today, so its half-day first task is just creating `modules/health/data.ts` and rewiring the 8 cards, doable now with zero new deps.**

## 5. Recommended sequence

Fastest path to *"my own real data on screen"*:

1. **Foundation F0–F5 (local-only).** Rust + Tauri + PowerSync/Drizzle + repos + Excel re-seed + generic edit. End state: planner is **real, editable, persistent** on your Mac — no server yet.
2. **Planner core repos.** It's the **daily driver** and already has the seam + seed; converting it gives you the most-used surface as real data immediately.
3. **Health via Apple Watch** (after F7 ingest listener). **Highest delight per unit effort** — once the endpoint exists, your real steps/sleep/HRV/workouts flow in automatically with near-zero ongoing manual work. Add the weight/BP/food manual forms alongside.
4. **Health `export.xml` backfill** (one-time) so charts have history, not just "going forward."
5. **Finance** — forms first (net worth visible fast), then CSV importer, then CAS-PDF via `casparser`. Mostly forms + import, low sync complexity.
6. **Work** — KPI/vertical/open-loop forms + KPI CSV import. Almost entirely manual + one import.
7. **Sync backend (F6)** — provision the India VM once single-device feels right; enable E2E cipher for health + finance; verify Postgres holds ciphertext only.
8. **Later integrations** — Calendar 2-way, Account Aggregator (Setu/Finvu), task-tool sync. The `externalSource`/`externalId` columns added in step 1 make these a merge, not a rewrite.

Rationale: planner = most-used, lowest-friction (seam + seed exist). Health = biggest "wow" because the Watch does the data entry for you. Finance/Work are deliberately later — they're mostly forms and imports, so they benefit from the edit primitives the earlier modules force you to build.

## 6. What I need from you to start

1. **Local-only first, or provision sync now?** I strongly recommend **local-only** to get real data on screen this week; we stand up the ~INR 500–1,500/mo India sync VM once single-device editing feels good. Confirm.
2. **Install Rust now** — run `xcode-select --install` then `rustup` (Rust ≥ 1.77). This is the one blocker only you can clear; nothing desktop-side proceeds without it.
3. **Buy + configure the *Health Auto Export* iOS app** (paid) and grant Health read permissions — so I can wire the ingest listener and you get Apple Watch data flowing. (You'll also paste in a bearer token I generate, stored in Keychain.)
4. **A real CAS PDF + a bank CSV** to test the finance importers (CAS password = PAN+DOB; nothing leaves your device).
5. **Your real Work KPIs** — names, targets, and RAG thresholds — plus any one-time profile values (height for BMI, goal weight, 80C/80D limits) so the dashboards show *your* numbers, not placeholders.