# Phase 0 Build Plan — Velman OS

> Foundation phase. Outcome: your Excel planner becomes a **live, E2E-encrypted, Mac↔iPhone-syncing, on-device SQLite database** rendered in the app shell, with the **Health module wired to receive Apple Watch data**. Everything after this plugs into the spine built here.

---

## 1. Goal & Acceptance Criteria

**Goal.** Stand up the spine (shell + sync-capable data layer + module registry), import the planner once, and ship a stub Command Center plus a Health module that can already ingest Apple Watch JSON — so Phase 1 modules have something real to plug into.

**Acceptance criteria (all must pass; each is independently testable):**

| # | Criterion | How to verify |
|---|---|---|
| A1 | App builds and launches as a native macOS app (Tauri 2). | `pnpm tauri dev` opens the window; Command Center renders as the index route. |
| A2 | A single PowerSync+Drizzle SQLite connection is owned by the shell; no module opens its own handle. | Grep: only `shell/db/client.ts` calls `PowerSyncDatabase`/`wrapPowerSyncWithDrizzle`. |
| A3 | All core + Health migrations run in dependency order on boot, idempotently. | Fresh launch creates tables; second launch is a no-op (no errors, no dupes). |
| A4 | The Excel planner imports into the DB. | Run importer on `Dr.Gowtham's Calendar .xlsx`; assert row counts: 10 categories, 7 days for the `Example` week, time_blocks for non-blank agenda rows, 15 todo slots, 3×7 gratitude lines, 7-day priorities, self-care + habit definitions with their grids. Re-running the import does **not** duplicate (idempotent on natural keys). |
| A5 | Live sync works Mac↔(second client). | Insert a `task` on client A; it appears on client B within seconds. Soft-delete on A propagates as a tombstone (row vanishes from B's filtered reads). |
| A6 | The server only ever holds **ciphertext** for Health/Finance payloads. | Inspect the self-hosted Postgres: Health rows show an opaque `cipher` blob; `id/updatedAt/deletedAt` are the only readable metadata. Decryption succeeds only on-device via the Keychain key. |
| A7 | Health ingest endpoint accepts authenticated Apple Watch JSON. | `POST /ingest/health` with the correct bearer token upserts `health_sample` rows (deduped on `dedupeKey`); wrong/no token → 401; replaying the same payload creates **zero** new rows. |
| A8 | A widget on the Command Center reflects ingested data live. | After a successful ingest, the `health.rings` stub widget re-queries (via the event bus) and updates without a manual refresh. |
| A9 | One broken module cannot blank the home screen. | Throw inside a widget render; its `WidgetSlot` error boundary shows a fallback, the rest of the Command Center still renders. |
| A10 | Times stored UTC, displayed IST; dates anchored on `dateKey` (YYYY-MM-DD, IST). | Insert a block at a known instant; stored as epoch-ms UTC, rendered in IST. |

Phase 0 is **done** when A1–A10 are green on the Mac, with a second sync client simulated (a second Tauri instance or the PowerSync test harness) standing in for the not-yet-built iPhone.

---

## 2. Locked Stack (Final)

| Layer | Choice | Notes / privacy posture |
|---|---|---|
| Framework | **React 19 + Vite + TypeScript** (SPA, no SSR) | Offline app; SSR wasted. |
| Shell / packaging | **Tauri 2** (macOS now, iOS later, same codebase) | Rust side also hosts the local Health ingest listener. |
| UI | **shadcn/ui + Tailwind** (shell/primitives) + **Tremor** (widgets) | One token set; `darkMode: 'class'`; CSS variables (`--background/--foreground/--primary/--card`) shared by shadcn + Tremor; `ThemeProvider` persists to localStorage. |
| Charts | **Recharts / Tremor** default; **ECharts** for heavy series | Swap individual charts, never the layer. |
| ORM / schema | **Drizzle ORM** (kept) | Wrapped via `wrapPowerSyncWithDrizzle`; sync schema derived with `DrizzleAppSchema`. |
| **Sync engine** | **PowerSync — self-hosted Open Edition** | The only finalist that keeps real local SQLite **and** first-class Drizzle **and** mature iOS Swift SDK **and** a documented true-E2E pattern **and** is fully self-hostable. Chosen over Turso/libSQL (at-rest only, offline-write-immature) and all plaintext-server engines (Electric/Triplit/Zero/Instant/Convex). |
| Local store | **PowerSync bundled SQLite** (wa-sqlite on Mac/web; op-sqlite/SQLCipher on iOS) | **Replaces** the originally-planned SQLocal/OPFS handle. Shell owns the single connection. |
| **Sync backend** | **Self-hosted `journeyapps/powersync-service` (Docker)** watching a **Postgres you control**, + a thin authenticated **write/upload (CRUD) endpoint** | One small India-region VM for 1 user / 2 devices. Postgres-on-device acceptable for dev. |
| **Privacy** | **True E2E** for Health + Finance via **app-level AES-GCM field encryption**; key on-device in **Apple/macOS Keychain** | Server stores only ciphertext + sync metadata. At-rest encryption on every platform. DPDP-aligned. |
| Reactive reads | **TanStack Query** over the Drizzle/PowerSync layer | Invalidated by the shared event bus. |
| AI boundary | **Anthropic cloud API**; only a **structured snapshot** computed from the *decrypted local view* leaves the device | Raw records and ciphertext never leave. |
| Money type (fwd) | **integer paise** (BIGINT), never float | Flagged now so Finance extends cleanly. |

---

## 3. Repository Layout

```
app/
├─ src-tauri/
│  ├─ src/
│  │  ├─ main.rs                 # Tauri bootstrap; starts the local ingest listener
│  │  └─ ingest.rs              # local authenticated HTTP listener (loopback) for Health Auto Export
│  ├─ Cargo.toml
│  └─ tauri.conf.json
│
├─ src-frontend/
│  ├─ shell/
│  │  ├─ app/
│  │  │  ├─ bootstrap.ts        # open DB → topo-sort modules → migrate → init → register ingest → router → render
│  │  │  └─ router.tsx          # Command Center = index; module routes mounted under their navId
│  │  ├─ db/
│  │  │  ├─ client.ts           # THE single PowerSync + Drizzle connection (owned here only)
│  │  │  ├─ sync.ts             # syncColumns() helper (the sync envelope)
│  │  │  ├─ schema.ts           # DrizzleAppSchema assembled from all module schemas
│  │  │  ├─ crypto.ts           # AES-GCM encrypt/decrypt; key from Keychain
│  │  │  └─ migrate.ts          # runs module migrations in dependency order
│  │  ├─ registry/
│  │  │  ├─ types.ts            # ModuleManifest contract
│  │  │  └─ modules.ts          # central modules[] = [core, health]  (add a module = one line)
│  │  ├─ bus/
│  │  │  └─ eventBus.ts         # shared query/event bus (e.g. 'health.ingested')
│  │  ├─ command-center/
│  │  │  ├─ CommandCenter.tsx   # reads registry, flattens/sorts widgets, 12-col grid
│  │  │  └─ WidgetSlot.tsx      # per-widget error boundary
│  │  ├─ ingest/
│  │  │  └─ server.ts           # shell-served HTTP router that module ingest routes register into
│  │  └─ ui/
│  │     ├─ theme/ThemeProvider.tsx
│  │     └─ layout/             # nav, shell chrome
│  │
│  └─ modules/
│     ├─ core/
│     │  ├─ manifest.ts
│     │  ├─ schema/             # day, category, time_block, task, priority, habit, habit_log,
│     │  │                      # journal_entry, open_loop, capture_item, energy_rating
│     │  ├─ migrations/
│     │  ├─ import/
│     │  │  └─ excelImporter.ts # the planner parser
│     │  ├─ seed/categories.ts  # 10 categories + hex from xlsx
│     │  └─ widgets/
│     └─ health/
│        ├─ manifest.ts
│        ├─ schema/             # health_sample, health_workout, health_sleep_session,
│        │                      # health_daily_activity, health_body_metric, health_food_log,
│        │                      # health_readiness, health_lab_report, health_lab_value
│        ├─ migrations/
│        ├─ ingest/healthIngest.ts   # POST /ingest/health handler (upsert + emit health.ingested)
│        └─ widgets/RingsWidget.tsx  # the health.rings stub
│
├─ package.json
├─ vite.config.ts
├─ tailwind.config.ts
└─ drizzle.config.ts
```

---

## 4. Data Model (Phase 0 core + Health), tightened for PowerSync

### 4.1 The sync envelope — `syncColumns()` mixed into **every** table

```ts
// shell/db/sync.ts
export const syncColumns = {
  id:            text('id').primaryKey(),          // UUIDv7, client-generated — NEVER autoincrement
  createdAt:     integer('created_at').notNull(),  // epoch-ms UTC
  updatedAt:     integer('updated_at').notNull(),  // epoch-ms UTC — the LWW clock
  deletedAt:     integer('deleted_at'),            // null = live; soft-delete tombstone
  deviceId:      text('device_id').notNull(),      // creating device
  lastWriterId:  text('last_writer_id').notNull(), // last-writing device (LWW tiebreak)
  schemaVersion: integer('schema_version').notNull().default(1),
};
```

All reads filter `deletedAt IS NULL`. Never hard-DELETE a synced row.

### 4.2 Core tables (owned by the shell, `core` module)
`day` (natural key `dateKey`, plus `weekKey`, `isoWeekday`, holiday flags) · `category` (10 rows seeded from xlsx F63:F72 / N63:N72) · `time_block` (30-min grid, planned-vs-actual, `categoryId`/`taskId` FKs) · `task` (todos + MITs, self-ref subtasks, rollover/aging, `openLoopId`, nullable forward FKs `projectId`/`goalId`) · `priority` (weekly, `weekKey`) · `habit` + `habit_log` (self-care + habit grids; `(habitId, dateKey)` unique) · `journal_entry` (gratitude/reflection, `dateKey` unique) · `open_loop` (polymorphic `sourceModule`/`sourceId`) · `capture_item` (Cmd+K inbox) · `energy_rating` (`(dateKey, partOfDay)` unique). *(Full column definitions per the schema dossier §1.)*

### 4.3 Health tables (`health` module, prefixed `health_`)
`health_sample` (generic metric/value/unit, `dedupeKey` unique — the workhorse) · `health_workout` · `health_sleep_session` · `health_daily_activity` (1/day, rings) · `health_body_metric` (Asian-Indian range flags) · `health_food_log` · `health_readiness` (1/day, 0–100) · `health_lab_report` + `health_lab_value` (spawns recheck open_loop). *(Full definitions per schema dossier §2; Asian-Indian cut-offs stored as `range_profile`/`range_flag` metadata, not hard-coded.)*

### 4.4 Conflicts between the schema design and PowerSync — flagged and resolved

| # | Conflict | Resolution (LOCKED for Phase 0) |
|---|---|---|
| **C1** | Schema dossier used **UUIDv7**; PowerSync examples use `crypto.randomUUID()` (v4). | Use **`crypto.randomUUID()` (v4)** as the PK generator — it's what PowerSync documents and guarantees collision-free across offline devices. Keep `createdAt` for time-sorting (we don't need the PK itself to be time-sortable). Resolves the sync dossier's "UUID PK" requirement without depending on a v7 lib. |
| **C2** | Drizzle uses **typed column modes** (`{ mode: 'boolean' }`, date types, JSON). PowerSync's SQLite is **text/integer/real only**. | **Store booleans as `integer` (0/1), dates as epoch-ms `integer` or ISO `text`, JSON as `text`.** Drizzle's `{ mode: 'boolean' }` is fine (it maps to integer under the hood) but **no native date/json column types**. `hrZonesJson`, `routeGeoJson`, `notes`-as-thread are `text`. |
| **C3** | FKs and `references()` everywhere. PowerSync's local SQLite **does not enforce FK constraints** (sync can apply rows out of order). | Keep `references()` for **Drizzle type-safety and intent**, but **do not rely on DB-level FK enforcement or `ON DELETE`**. Enforce integrity in app code; soft-delete cascades are handled in code, not by the engine. Add the **indexes** the dossier specifies (they matter for query speed). |
| **C4** | Composite-unique constraints (`(habitId, dateKey)`, `dedupeKey` unique) are the dedupe/idempotency mechanism. PowerSync syncs row-by-row and won't honor a remote unique violation the way a single writer would. | Keep the unique indexes **locally** for importer/ingest idempotency (upsert-on-conflict). For **cross-device** dedupe, make the **deterministic key the basis of the row `id`** where it's the true natural identity — e.g. `health_sample.id = hash(dedupeKey)`, `health_daily_activity.id = hash(dateKey)`, `journal_entry.id = hash(dateKey)`. Same logical record → same `id` on both devices → PowerSync merges (LWW) instead of creating a duplicate. This is the load-bearing fix for A4/A7 under sync. |
| **C5** | **E2E encryption** vs PowerSync needing readable metadata for ordering/tombstones. | Per sensitive row (Health/Finance), encrypt the **payload columns** into a single `cipher` **text** column (AES-GCM); leave the **sync envelope** (`id`, `createdAt`, `updatedAt`, `deletedAt`, `deviceId`, `lastWriterId`, `schemaVersion`) as server-visible plaintext metadata. Decrypt into a **PowerSync local-only (non-synced) table** or in memory for querying/charts. Core planner tables (non-sensitive) sync as plaintext columns for now. |
| **C6** | Range flags **computed and stored** at write time. | Acceptable for Phase 0 (fast reads, explainable). Documented caveat: tuning the `asian_indian` thresholds later needs a backfill recompute. (Open question O-D below if you'd rather compute live.) |

**Resolved open questions baked into Phase 0 defaults** (confirm in §10 if you disagree): sleep attributed to the **wake-day** `dateKey`; corrected Health re-sends **UPSERT** (value dropped from the dedupe identity so corrections overwrite); energy buckets = **morning/midday/afternoon/evening**; delegation owners are **free text** until the People module.

---

## 5. Excel Importer (field mapping + approach)

**Approach.** A one-time, **idempotent** parser (`modules/core/import/excelImporter.ts`) run from a dev/setup action. Reads the workbook, **skips any `TEMPLATE` sheet**, imports the `Example` sheet (and any `WeekOf…` tabs). Upserts on natural keys so re-running never duplicates. Anchors: **AA, AW, BS, CO, DK, EG, FC**, stride **22 columns**.

**Per-cell offsets within a day block** (validated against the workbook): time = anchor **+1**, category = anchor **+4**, task = anchor **+10**.

| xlsx region (sheet `Example`) | Read | Target table |
|---|---|---|
| Categories `F63:F72` + hex `N63:N72` | labels + colors | `category` (seed — run first) |
| Week header `D5` (weekStart), `D7` | per sheet | `day.weekKey` / upsert week context |
| Day-block anchors, row 4 date | 7 blocks | `day` (upsert on `dateKey`) |
| Agenda rows **12–49** | time(+1), category(+4), task(+10); **skip blank task** | `time_block` (+ `category` FK) |
| To-dos rows **52–66** | number, checkbox bool, text | `task` (`sortOrder`, `status`) |
| Gratitude rows **7–9** | 3 lines | `journal_entry.gratitude1..3` |
| Reflection row **69** | text | `journal_entry.wentWell` |
| Priorities cols **M** (text) + **L** (checkbox), rows **8–15** | per week | `priority` (`weekKey`, `isDone`, `sortOrder`) |
| Self-care `D18:D25`, grid cols **R..X** | labels + 7-day bools | `habit` (group=`self_care`) + `habit_log` |
| Habits `D30:D36`, grid cols **R..X** | labels + 7-day bools | `habit` (group=`habit_tracker`) + `habit_log` |

Health tables are **not** seeded from xlsx — they fill from the Phase 2 XML backfill and the ingest webhook.

---

## 6. Module Registry + Shell

### 6.1 The `ModuleManifest` contract

```ts
// shell/registry/types.ts
export interface ModuleManifest {
  id: string;                 // 'core' | 'health'
  title: string;
  icon: React.ComponentType;
  dependsOn: string[];        // topo-sort key; core has []
  nav: NavEntry[];            // sidebar entries
  routes: RouteDef[];         // mounted under the shell router
  widgets: WidgetDef[];       // { id, priority, component, query }  → Command Center
  data: {                     // module-owned Drizzle schema + migrations
    schema: Record<string, AnySQLiteTable>;
    migrations: Migration[];
  };
  settingsSchema?: ZodSchema; // module settings shape
  ingest?: IngestRoute[];     // { path, method, auth, schema, handler }
  init?: (ctx: ShellCtx) => Promise<void>;
}
```

Central registry: `modules = [core, health]`. **Adding a module is one line** — compile-time, no plugin loader.

### 6.2 Bootstrap flow (`shell/app/bootstrap.ts`)
1. Open the **single** PowerSync DB; `wrapPowerSyncWithDrizzle`; assemble `DrizzleAppSchema`.
2. Unlock/derive the encryption key from the **Keychain** (create on first run).
3. **Topo-sort** modules by `dependsOn` (core first).
4. Run **every module's migrations** in that order (idempotent).
5. Load settings → run each `init()` → **register ingest routes** into the shell ingest server.
6. Start the **Rust local listener** (loopback, authenticated).
7. Build the router: **Command Center as index** + module routes; render.

### 6.3 Command Center (shell-owned)
Reads the registry, **flattens + filters + sorts** module widgets by `priority`, renders a **12-column grid** of `WidgetSlot`s. **Each `WidgetSlot` is an error boundary** (A9). Widgets query the shared DB via TanStack Query and re-fetch on bus events. Phase 0 ships **one stub widget: `health.rings`**.

### 6.4 Health ingest (module-owned, shell-served)
`POST /ingest/health` · bearer required · validates the Health Auto Export JSON · handler **upserts `health_sample` deduped on `id = hash(metric|startTs|endTs|sourceDevice)`** · emits **`health.ingested`** on the bus → `RingsWidget` re-queries.

**Flow:** iPhone Health Auto Export → POST with bearer → Tauri loopback listener verifies token == `settings.ingestToken` → handler upserts → bus emits → widget updates. Listener is **local + authenticated only**, no third-party cloud; raw rows stay in local SQLite; PowerSync syncs only ciphertext.

---

## 7. Step-by-Step Task Checklist

**A. Scaffold**
- [ ] `pnpm create vite` (React+TS) inside `app/src-frontend`; add Tauri 2 (`src-tauri`); confirm `pnpm tauri dev` opens a window. *(A1)*
- [ ] Add Tailwind + shadcn/ui + Tremor; wire `ThemeProvider` (dark class + CSS-var tokens, persisted). 
- [ ] Add Drizzle + drizzle-kit; `drizzle.config.ts`.

**B. Data layer + sync**
- [ ] Install PowerSync web SDK; create the **single** connection in `shell/db/client.ts`; `wrapPowerSyncWithDrizzle`. *(A2)*
- [ ] Implement `syncColumns()`; set PK generator to `crypto.randomUUID()` (C1).
- [ ] Implement `crypto.ts` (AES-GCM) + Keychain key storage; define the encrypted `cipher` pattern + a local-only decrypt table (C5).
- [ ] Stand up the **self-hosted PowerSync service + Postgres** + the thin write/upload endpoint (see §8); point the client at it. *(A5, A6)*

**C. Schema + migrations**
- [ ] Write core Drizzle schema (10 tables) applying C2–C4 (integer bools, no FK enforcement reliance, deterministic `id` where natural identity exists).
- [ ] Write Health schema (9 tables).
- [ ] `migrate.ts` runs module migrations in dependency order, idempotently. *(A3)*
- [ ] Seed the 10 categories from xlsx hex.

**D. Importer**
- [ ] Build `excelImporter.ts` per §5 mapping; idempotent upserts on natural keys; skip `TEMPLATE`.
- [ ] Run against `Dr.Gowtham's Calendar .xlsx`; assert row counts; re-run to confirm no duplicates. *(A4, A10)*

**E. Shell + Command Center stub**
- [ ] `ModuleManifest` type + `modules[]`; `core` + `health` manifests.
- [ ] `bootstrap.ts` (open → topo-sort → migrate → init → ingest → listener → router → render).
- [ ] Command Center: registry-driven 12-col grid; `WidgetSlot` error boundary. *(A9)*
- [ ] `eventBus.ts`.

**F. Health module stub + ingest endpoint**
- [ ] `RingsWidget` (`health.rings`) reads `health_daily_activity`/`health_sample`.
- [ ] Rust `ingest.rs` loopback listener; bearer check against `settings.ingestToken`.
- [ ] `healthIngest.ts` handler: validate JSON → upsert deduped → emit `health.ingested`. *(A7, A8)*

**G. Verify**
- [ ] Run the full A1–A10 acceptance matrix; simulate the second sync client (second Tauri instance / PowerSync harness).
- [ ] Confirm Postgres shows **only ciphertext** for Health rows. *(A6)*

---

## 8. Sync Backend Setup (honest cost/effort)

You must stand up **three things**. Recommendation: **self-host** (it's what satisfies the E2E + DPDP requirement and is cheap for one user).

1. **Postgres** (the source-of-truth the service watches) — managed or on the same VM.
2. **PowerSync service** — `docker run journeyapps/powersync-service` (Open Edition, feature-equivalent to Cloud). Needs sync rules + a JWT-issuing auth config.
3. **A thin write/upload endpoint** — a small Node service the client posts CRUD batches to, which applies them to Postgres. You write this (~a day; PowerSync ships a reference implementation).

| Path | What you run | One-time effort | Ongoing cost |
|---|---|---|---|
| **Self-host (recommended)** | One small **India-region VM** (e.g. 1–2 vCPU / 2–4 GB): Docker Compose with Postgres + powersync-service + the write endpoint + a reverse proxy w/ TLS | **~1–2 days** (Compose, TLS cert, JWT keys, sync rules, write endpoint, point client at it) | **~₹500–1,500/mo** VM + domain; that's it |
| Dev shortcut | Postgres + service **on your Mac** (localhost) | hours | ₹0 (no real device-to-device sync until the VM exists) |
| PowerSync Cloud | Managed service + your own Postgres | ~half a day | Free/low tier for 1 user — **but** only acceptable here because **E2E means the cloud sees ciphertext anyway**; self-host still preferred for full sovereignty |

**Honest caveats.** PowerSync is the **most-infra finalist**: you run a container + Postgres + a small endpoint, and **E2E is a pattern you implement** (AES-GCM field crypto + Keychain key), not a toggle. For 1 user / 2 devices the load is trivial, but it is real ops you own. The Turso/libSQL fallback is lighter to run but is **at-rest only** (no E2E) and had immature offline writes in 2025 — only fall back if the PowerSync ops genuinely block you, and if so, self-host `sqld` to keep data sovereignty.

---

## 9. Deferred to Phase 1+

- **All Tier-1 module UIs** — live Time-Block Agenda, Tasks & Priorities, Habits & Self-Care, Journal (Phase 1). Phase 0 only imports their **data** and ships stubs.
- **Real Command Center** — AI Daily Brief, Open-Loops register UI, Cmd+K capture/triage, MITs (Phase 1). Phase 0 is a registry-driven grid with one stub widget.
- **Health module proper** — rings/sleep/HRV/readiness views, correlation engine, Asian-Indian range UI, food logging, lab-PDF import (Phase 2). Phase 0 only proves **ingest + dedupe + one stub widget**.
- **Health Auto Export wiring + one-time `export.xml` backfill** (Phase 2). Endpoint exists in Phase 0; the consumer-app automation and historical seed come later.
- **Finance, Work, Goals, People** schemas + UIs (Phase 3+). The core is shaped so they extend **without core migrations** (shared `category`, polymorphic `open_loop`, nullable forward FKs, integer-paise convention).
- **Calendar / email / bank integrations** (Phase 4).
- **AI snapshot → Anthropic** (Phase 3+; boundary is designed now: snapshot from the decrypted local view only).
- **iPhone build** (Tauri iOS target later; sync engine + schema chosen so it's a packaging step, not a re-architecture).

---

## 10. Decisions Still Needed Before Coding (genuine blockers only)

- **O-A — Confirm the sync engine = PowerSync (self-hosted Open Edition).** This plan is built on it; flipping to the Turso/libSQL fallback changes the data layer and drops E2E for at-rest-only. **Blocks Step B.**
- **O-B — Confirm hosting: self-host VM (recommended) vs PowerSync Cloud-with-E2E vs localhost-dev-only for now.** Determines whether A5/A6 are testable in Phase 0 or deferred to when the VM exists. **Blocks Step B / §8.**
- **O-C — Encryption scope: encrypt only Health + Finance tables (recommended), or the whole DB?** Phase 0 default encrypts the two sensitive modules' payloads; core planner tables sync as plaintext columns. **Blocks `crypto.ts` / C5.**
- **O-D — Range flags: stored-at-write (current default, needs backfill on threshold changes) vs computed live in the view layer?** Affects `health_body_metric` / `health_lab_value` write path (C6).
- **O-E — Does the **ingest bearer token** sync to the iPhone, or stay device-local?** Affects whether `settings.ingestToken` is a synced row or a Keychain-only secret. (Recommendation: **device-local**, never synced.)

*(Non-blocking confirmations already defaulted in §4.4: sleep→wake-day attribution; corrected Health re-sends UPSERT; 4 fixed energy buckets; delegation owners free-text until the People module. Override any of these if needed — they don't block the start.)*