# If This Were the Anthropic CEO's Dashboard

## 1. The shift, in one paragraph

GC OS was built to help one founder run *himself*: readiness, habits, personal finance, a few work bets. Re-point it at the CEO of a frontier AI lab and almost every assumption inverts. The stakes go from *personal* to *civilizational* — a missed eval gate or a diverging training run isn't a bad week, it's a regulatory event, a safety incident, or a quarter of burned compute. The clock goes from *daily* to *real-time* — a flagship run can NaN at 3am, a sentiment storm can metastasize in 60 minutes, and the binding constraint (compute) is metered by the second. The data goes from *open* to *compartmented* — model weights, eval results, and roadmap are the most sensitive secrets in tech, so every connector now carries a classification label and the privacy boundary becomes a load-bearing wall, not a setting. And the operator changes: a solo founder *reads* a dashboard, but a frontier-lab CEO cannot — there's too much, too fast, too consequential. So Claude stops being a feature and becomes the operator: an agentic chief-of-staff that ingests the systems-of-record, computes the deltas, drafts the artifact, and surfaces only the handful of numbers and irreversible decisions that actually need a human this week. The dashboard stops being a set of charts you look at and becomes a cockpit an AI flies *for* you — and a lab whose product is agentic AI now runs on agentic AI. It eats its own dog food.

---

## 2. New & upgraded modules

Each entry maps onto the existing `ModuleManifest` plug-in contract (id/title/icon/route/page + optional Command Center widgets) and reuses the RAG-banded `Card`/`Pill` pattern already in `Work.tsx`. So the cockpit grows by *adding manifests*, and every module pushes one glanceable tile back to the Command Center home.

### (a) Lab-specific — the modules a normal CEO cockpit doesn't have

**Compute & Training Control Tower** *(NEW — the frontier-lab heart)*
- *Purpose:* The factory floor. Make the lab's largest cost and binding constraint visible the way Bezos saw the WBR.
- *Key signals:* MFU/goodput per cluster (idle GPU = burned budget); allocation split (pretraining vs experiments vs inference-serving vs evals/safety); live training-run cards (loss curve, tokens/sec, $-spent-vs-run-budget, ETA, divergence/NaN flag); forward compute supply-vs-demand (contracted GPU-hours, delivery dates, $/GPU-hr trend); inference headroom vs serving demand (SLA-breach risk).
- *Sources:* Slurm/K8s schedulers, DCGM/Prometheus telemetry, W&B/internal harness logs, cloud + colo capacity contracts, FinOps cost feed → Datadog + PagerDuty connectors.
- *AI angle:* Claude is the on-call SRE-for-the-CEO — collapses 50 running jobs into "one flagship run at risk, here's the loss-curve anomaly and the on-call owner," projects completion dates and overruns, and drafts the kill-or-extend go/no-go memo.

**Model, Evals & Competitive Standing** *(NEW)*
- *Purpose:* Tell the CEO, in one glance, whether the lab is still *at the frontier* and where it's slipping.
- *Key signals:* benchmark deltas vs internal targets with **silent-regression alarms**; head-to-head standing vs OpenAI / Google / Meta / DeepSeek; research velocity and roadmap pacing; capability-trajectory (what the next checkpoint unlocks).
- *Sources:* internal eval-harness API; public leaderboards via WebFetch/WebSearch.
- *AI angle:* Claude runs continuous competitive intelligence and flags an eval regression *before sign-off*, not after a customer finds it.

**Safety, Evals & Responsible-Scaling Register** *(NEW — the license to operate)*
- *Purpose:* The no-model-ships-red gate. The risk-and-governance ledger that is uniquely Anthropic.
- *Key signals:* pre-deployment eval gate (which capability thresholds tripped, who signed off, RAG per model); RSP/ASL threshold proximity (are we approaching the next tier?); red-team/jailbreak backlog (severity, mitigation owner, SLA); incident register (misuse/safety events, post-mortems, recurrence); external-commitments tracker (regulator pledges, voluntary commitments) vs delivered.
- *Sources:* internal dangerous-capability eval suite; red-team tracker (Linear/Jira); commitments registry (Notion); model-release checklist system.
- *AI angle:* Claude pre-reads every eval report, flags any model nearing a threshold, drafts the responsible-scaling determination memo with evidence attached, and **physically blocks the "ship" button in the cockpit until the gate owner signs** — an agentic guardrail, not a readout. This module is what makes the cockpit *Anthropic's* and not a generic SaaS CEO's.

**AI Revenue & Usage** *(UPGRADE to Financial — the demand side of compute)*
- *Purpose:* Tie revenue to tokens. For an AI lab, usage *is* the business and the COGS at once.
- *Key signals:* API + enterprise ARR by segment; token throughput and per-customer concentration; gross margin **after inference compute** (the AI-margin killer — flag <70%); rate-limit/capacity friction costing revenue; design-partner pipeline.
- *Sources:* billing (Stripe), warehouse (BigQuery/Snowflake) + dbt, the Compute Control Tower's cost feed.
- *AI angle:* Claude joins usage to compute — "enterprise demand is up 30% but you're rate-limiting your top-3 accounts because the inference cluster is at 94%; here's the revenue at risk vs the cost to add capacity."

### (b) CEO cockpit — how the best operators run the day

| Module | Purpose (one line) | Key signals | AI angle |
|---|---|---|---|
| **Board & Investor Relations** *(NEW)* | Run the board cadence end-to-end; make the deck a byproduct. | Pre-read 72h countdown; the 3-5 metrics the board watches (variance framed as a *decision*); asks-of-the-board register; fundraise tracker (stage, raise, runway-at-close, dilution); per-director commitments log. | Claude drafts the whole deck from live data (Sequoia/Bain 7-section structure), writes the monthly investor update in the CEO's voice, and pre-mortems each director's likely objections. |
| **Strategy, OKRs & The Few Bets** *(UPGRADE to Work's North Star)* | A company-wide OKR spine + the 3-5 bets that define the year. | Quarterly OKRs (owner/target/confidence RAG); "the few bets" board; operating-cadence clock; alignment check (every OKR ladders to a bet — kill orphans). | Claude convenes the weekly review by pre-computing the three numbers that matter and challenges work that maps to no current bet. |
| **Org Health & Talent** *(NEW)* | The people cockpit — scarce research/eng talent is as gating as compute. | Headcount plan-vs-actual-vs-budget; **regretted attrition + key-people flight-risk watchlist**; eNPS/engagement; span-of-control; named pipeline for the 10 roles that matter. | Claude fuses signals humans miss — a top researcher's dropping activity + expiring equity cliff + a competitor's hiring spree = a flight-risk alert with a drafted retention play, *before* the resignation. |
| **Financial Command Center** *(UPGRADE to Financial)* | Promote personal finance to a company P&L cockpit. | ARR + NRR (target 120%+); gross margin w/ compute-COGS; net burn, runway (<18mo alert), burn multiple, Rule of 40, magic number; scenario engine. | Claude is the always-on FP&A analyst — computes Monday deltas from system-of-record, explains every move, runs plain-English scenarios ("what if we 2x the safety cluster?"). |
| **Decision Log & CEO Escalation Queue** *(NEW)* | The "CEO as final escalation" inbox + append-only decision ledger. | Escalation inbox tagged reversible (Type 2, decide fast) vs irreversible (Type 1, deliberate); decision log w/ rationale + scheduled "was this right?" review; SLA on what's blocked-on-CEO; delegation boundary. | Claude triages every ask into *CEO-must-decide / delegate-to-named-owner / FYI*, drafts a one-page memo (options, rec, reversibility), and re-surfaces past calls to score the CEO's calibration. |
| **Key-Relationship CRM** *(NEW)* | The handful of relationships a lab's destiny runs through. | Relationship cards by tier (board / investor / compute partner / key hire / regulator / press) w/ last-touch + next-touch; commitment ledger (both directions); cold-relationship alerts; auto-assembled pre-meeting briefs. | Before every external meeting Claude builds a brief from email history + last commitments + recent news; after, it extracts new commitments and schedules the follow-up. |
| **Comms, Brand & Crisis Command** *(NEW)* | Steady-state sentiment + a war-room-in-a-box. | Sentiment *velocity* + high-authority mention clustering; share-of-voice vs other labs; one-click crisis mode (roles, stakeholder map, pre-approved holding statements); <60-min response clock; linkage to the Safety incident register. | Claude monitors 24/7, triggers on weak early signals, and in crisis mode drafts the holding statement, all-hands note, and per-stakeholder FAQ from *verified facts* — turning a 4-hour scramble into a 30-min approval. |

### (c) The existing pillars carry over — re-scoped, not retired

- **Command Center (home)** → the *single pane of glass*. Each module contributes one widget: runway, compute utilization, next eval gate, decisions-awaiting-you, top flight-risk. This is where the CEO actually starts the day.
- **Work** → splits upward: its Verticals Board becomes the **Compute Control Tower** (verticals = clusters/runs), its North Star/roadmap becomes **Strategy/OKRs**, its delegation/waiting-on register feeds the **Decision Queue**, its capacity bars generalize into **Org Health**.
- **Health + Habits** → fuse with a calendar-audit layer into the **CEO Time, Energy & Personal OS**: actual calendar split vs target (~21% strategy / ~30% external), demanding work aligned to peak-readiness windows using the Health sleep/HRV signal, deep-work and recovery blocks defended. *Rationale: the CEO's clearest thinking on irreversible safety calls is the company's highest-leverage output — protecting it is a performance lever, not self-care.* Claude runs the audit weekly and reshuffles next week to put Type-1 decisions in peak-energy slots.
- **Financial** → upgraded into the **Financial Command Center** + **AI Revenue & Usage** (above).

---

## 3. The AI-native command layer — the single biggest idea

**Claude runs the cockpit.** Every module above is not a chart you read; it's a surface an agent operates. This is the upgrade that makes GC OS worthy of a frontier-lab CEO — and the reason the lab can credibly say it runs on its own product.

- **The proactive brief.** Each morning Claude has already read the night's run telemetry, the overnight eval results, the warehouse deltas, the calendar, and the inbox — and produces *one* brief: the 3 numbers that moved, the 1 run at risk, the 2 decisions that need you today, the 1 relationship going cold. Not 40 tiles. A page.
- **Anomaly detection across pillars.** The real value is the *cross-pillar join* no single tool sees: usage up + inference cluster maxed + margin dipping → a capacity *and* revenue *and* finance event, surfaced as one alert. A top researcher's signal + equity cliff + competitor hiring → one flight-risk play.
- **Drafting.** The board deck, the investor update, the responsible-scaling memo, the holding statement, the decision memo, the retention check-in — all drafted from live data in the CEO's voice, for approval, never auto-sent.
- **Decision support.** For everything that reaches the CEO, a one-pager: options, recommendation, reversibility (Type 1 vs Type 2), and what's reversible-so-decide-fast vs irreversible-so-deliberate.
- **Agent architecture:**
  - *Tools/MCP* — each connector (below) is an MCP server; Claude calls them with least-privilege scopes.
  - *Memory* — the append-only decision log + commitment ledger *are* the agent's long-term memory; it re-surfaces past calls on their review date.
  - *Guardrails* — write actions are gated. The Safety module's "ship" button is the canonical example: Claude can assemble the gate, but cannot clear it.
  - *Human-in-the-loop* — Claude drafts and recommends; the CEO approves anything that leaves the building or is irreversible. Read/compute/draft is autonomous; *send/ship/spend* is not.
  - *Privacy boundary* — a hard wall between the CEO's personal layer (Health/Habits/HRV, personal finance) and the company layer. Personal data never enters a company artifact; company secrets never leak into a personal context. Sensitivity labels travel with every record.

---

## 4. Making it work — the backbone

**The Connector Layer** is the one genuinely new piece of *infrastructure* (vs. modules). A shell-owned integration tier that mirrors the existing module registry: each external system is an MCP server (OAuth 2.1) that normalizes into the **local SQLite cache** GC OS already uses. Modules read from the cache, not from vendors directly — so the cockpit stays local-first and fast, and "demo tiles" become "live company data" by registering a connector.

- **Real-time vs batch.** Two lanes. *Real-time/streaming* for the things that can't wait: training-run telemetry (DCGM/Prometheus), PagerDuty incidents, sentiment velocity, SLA breaches — these push. *Batch/poll* for everything that's fine on a cadence: warehouse metrics (nightly dbt), HRIS, CRM, board docs, leaderboards. The brief consumes the batch lane; the alerts ride the real-time lane.
- **Non-negotiables for a frontier lab:**
  - *Access control* — every connector carries least-privilege scopes; every record carries a **sensitivity label** (public / internal / confidential / restricted-weights-and-evals). The agent's read scope and the human's view are both label-aware.
  - *Audit* — every agent action (read, draft, recommend, the rare write) is logged immutably. The decision log doubles as the governance trail the board and regulators will ask for.
  - *Secrecy* — local-first by default; the most sensitive feeds (eval results, weights metadata, roadmap) may never leave the device or a compartmented enclave. PowerSync syncs only what its label permits.
- **Easy vs hard.**
  - *Easy:* the CEO-cockpit connectors that already have clean SaaS APIs and MCP servers — Notion, Linear, Carta, Stripe/the warehouse, HRIS, calendar, media monitoring. The RAG-card UI and manifest pattern are done. Drafting is a solved Claude capability.
  - *Hard:* the lab-internal feeds with no off-the-shelf connector — the eval harness, the cluster scheduler, weights telemetry. The *secrecy/labeling* enforcement (getting it provably right, not just configured). The *cross-pillar joins* (data modeling, not plumbing). And the organizational trust to let an agent gate a ship decision — that's a culture problem, not a code one.

---

## 5. The 5 highest-leverage additions

1. **The Safety/RSP Register with a hard ship-gate.** The one module no other CEO cockpit has and the one that defines Anthropic. An agent that can *block ship until the gate is signed* turns safety from a slide into infrastructure. Existential downside protected; this is the bet that matters most.
2. **The Compute Control Tower as the spine, not a tile.** Compute is the largest cost and the binding constraint on cadence, margin, and runway. Making idle GPU-hours and a diverging flagship run *visible to the CEO in real time* is the single biggest operational lever in the building.
3. **Claude as the operator, not a feature.** The proactive one-page brief + cross-pillar anomaly detection + draft-everything chief-of-staff. This is what makes the cockpit usable by a person who has no time to read it — and the dog-fooding story that a frontier lab uniquely *must* tell.
4. **The Decision Log with reversibility tagging + calibration review.** Type 1 vs Type 2 triage kills decision fatigue, and the scheduled "was this right?" review turns the CEO's own judgment into a measured, improving asset — institutional memory the board trusts.
5. **The cross-pillar join as a first-class capability.** Revenue × compute × margin in one alert; researcher-signal × equity-cliff × competitor-hiring in one flight-risk play. Any one tool shows a tile; only an agent over the unified cache sees the *story*. That's where the irreplaceable value lives.

---

## 6. How it maps onto what we built

**Stays (re-scoped):** Command Center (now the single pane of glass), the `ModuleManifest` plug-in contract, the RAG `Card`/`Pill` pattern from `Work.tsx`, the local SQLite cache, PowerSync, the Anthropic-API AI layer, Cmd+K capture (now the universal "ask Claude / log a decision / capture a commitment" bar).

**New modules:** Compute & Training Control Tower · Model/Evals & Competitive Standing · Safety/RSP Register · Board & Investor Relations · Org Health & Talent · Decision Log & Escalation Queue · Key-Relationship CRM · Comms/Brand & Crisis Command. Plus one piece of infrastructure: the **Connector Layer**.

**Upgrades to existing:** Financial → Financial Command Center + AI Revenue & Usage · Work → splits into Compute Tower + Strategy/OKRs + feeds the Decision Queue + Org Health · Health + Habits → CEO Time/Energy Personal OS · Command Center → live single-pane-of-glass fed by every module's widget · the AI layer → the agentic command layer of §3.

**Tiered rollout:**

- **Tier 0 — Backbone (weeks).** Build the Connector Layer + sensitivity labeling + audit log. Nothing else is real-time or secret-safe without it.
- **Tier 1 — The two lab modules + the brief (the dog-food MVP).** Compute Control Tower (real-time telemetry) + Safety/RSP Register (the ship-gate) + Claude's proactive one-page morning brief. This alone is a frontier-lab cockpit no one else has.
- **Tier 2 — The financial & governance spine.** Financial Command Center + AI Revenue & Usage + Board/IR + Decision Log. Makes every board review a byproduct of live data — zero fire drills.
- **Tier 3 — The human and external layer.** Org Health & Talent + Key-Relationship CRM + Comms/Crisis Command + the CEO Time/Energy OS. The cross-pillar joins light up here.
- **Tier 4 — Full agentic autonomy (with guardrails).** Claude moves from draft-and-recommend to *act-within-bounds* on Type-2 reversible decisions, while irreversible/ship/spend stay human. The cockpit now flies itself, and the CEO is the final escalation — exactly as designed.