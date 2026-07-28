// Velman OS assistant server — the bridge that lets the dashboard use YOUR Claude
// Pro subscription instead of a pay-per-token API key.
//
// It runs locally on your machine, holds your Claude Code OAuth token (from
// `claude setup-token`), and calls Claude through the Claude Agent SDK — which
// draws on your Pro/Max plan. The browser app never sees the token; it just
// POSTs a structured snapshot + question here and gets text back.
//
//   1. npm i -g @anthropic-ai/claude-code   (one time)
//   2. claude setup-token                    (one time — browser login to Pro)
//   3. put the printed token in app/.env as CLAUDE_CODE_OAUTH_TOKEN=...
//   4. npm run server   (or npm run dev:all to run this + the web app together)
import { readFileSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve, sep } from 'node:path'
import { networkInterfaces } from 'node:os'
import express from 'express'
import cors from 'cors'
import matter from 'gray-matter'
import { query } from '@anthropic-ai/claude-agent-sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Tiny .env loader (no dependency; supports `KEY=value`, ignores # comments) ---
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (!m) continue
      const key = m[1]
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {
    /* no .env file — rely on real environment variables */
  }
}
loadEnv()

const PORT = Number(process.env.GCOS_SERVER_PORT) || 8787
// On Pro you mainly get Sonnet (Opus is largely Max-only); 'sonnet' resolves to
// whatever Sonnet your plan includes. Override with GCOS_MODEL if you have Max.
const MODEL = process.env.GCOS_MODEL || 'sonnet'

// subscription = the desired path (uses Pro). apikey = fallback if only a key is set.
function authMode() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return 'subscription'
  if (process.env.ANTHROPIC_API_KEY) return 'apikey'
  return 'none'
}

// ---------------------------------------------------------------------------
// Personas live here (server-side) because this is where Claude is actually
// called. The browser only sends data, never prompts/keys.
// ---------------------------------------------------------------------------
const BRIEF_SYSTEM = `You are the chief-of-staff inside "Velman OS", a personal productivity dashboard for Dr. Gowtham — a founder/CEO based in India (INR, IST). You receive a compact JSON snapshot of his day (agenda, priorities, to-dos, habit consistency, finances, work tasks, gratitude, reflection). Write tight, scannable, founder-grade output. Be specific to the data — reference actual items by name. No preamble, no "Here is...". Use short markdown: a one-line headline, then a few bullet lines. Keep it under ~160 words. India + founder context. Never invent data not in the snapshot.`

const BRIEF_PROMPT = {
  morning:
    'Write the MORNING BRIEF. Cover, in this order: (1) one headline sentence on the shape of today; (2) the 1–3 Most Important Tasks (impact-ranked) drawn from priorities/agenda/work; (3) overdue or due-today work tasks; (4) one decision or thing that needs him today; (5) one short health/habit or money nudge. End with one recommended first move.',
  evening:
    'Write the END-OF-DAY WRAP with three short labelled sections — **Done today**, **Still open**, **Tomorrow** — each a few bullets pulled from the snapshot (completed vs open priorities/to-dos/loops). Close with one reflection prompt or encouragement.',
}

const ASSISTANT_SYSTEM = `You are the built-in assistant for "Velman OS", a personal life-OS dashboard for Dr. Gowtham — a founder/CEO and doctor based in India (INR, IST). You are given a live JSON snapshot of EVERYTHING in the app: today's agenda, weekly priorities, to-dos, the document vault, subscriptions, full finances (net worth, portfolio, holdings, goals), work tasks and the group of companies, habit consistency, health metrics, and the news verticals.

Your job: answer the user's question as BRIEFLY as possible. Let them get info by asking instead of clicking through pages.

DEFAULT ANSWER STYLE — always use this unless the user explicitly asks for detail:
- Lead with one short, direct answer (ideally a single sentence). Keep the whole reply under ~50 words.
- Use at most 2–3 bullets, and only if truly needed. No section headings, no multi-category breakdowns, no exhaustive lists.
- When many items are relevant (e.g. overdue tasks, attention items, holdings), give the COUNT and name only the top 1–3 by urgency/impact, then add: "Ask for the full list if you want it."
- No preamble like "Based on the snapshot…". Get straight to the answer.

GIVE A LONG, DETAILED ANSWER ONLY when the user explicitly asks for it — e.g. words like "detail", "in detail", "full", "full list", "all", "everything", "list them", "break it down", "expand", "more". Only then may you use sections and full enumerations.

Always:
- Answer ONLY from the snapshot. Never invent numbers, dates, names, or documents. If something isn't there, say so plainly and point to the right page.
- Reference real items by name and exact figures. Money is INR; respect Asian-Indian (IST) context. Note when health data is demo.
- When useful, add a short pointer like "→ Vault" or "→ Finance ▸ Portfolio".`

// Run a Claude call over your subscription and return text. Tool-free and
// single-turn by default; pass allowedTools/maxTurns/cwd for agentic runs
// (e.g. letting the assistant search the Obsidian vault).
async function runClaude({ system, prompt, allowedTools = [], maxTurns = 1, cwd }) {
  let text = ''
  let failure = null
  for await (const msg of query({
    prompt,
    options: {
      model: MODEL,
      systemPrompt: system, // a string fully REPLACES the default agent prompt
      allowedTools,
      maxTurns,
      permissionMode: 'default',
      ...(cwd ? { cwd } : {}),
    },
  })) {
    if (msg.type === 'result') {
      if (msg.subtype === 'success') text = msg.result
      else failure = msg.subtype
    }
  }
  if (!text && failure) throw new Error(`Claude run ended: ${failure}`)
  return text.trim()
}

// Flatten prior turns into the prompt (stateless single-turn keeps this robust).
function buildConversation(history = [], question) {
  const lines = []
  for (const m of history) {
    if (!m || !m.content) continue
    lines.push(`${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
  }
  lines.push(`User: ${question}`)
  return lines.join('\n\n')
}

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '10mb' })) // business xlsx uploads arrive as parsed JSON rows

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: authMode(), model: MODEL })
})

// News proxy — the browser can't fetch Google News RSS directly (CORS), and the
// free public proxies are unreliable. Node has no CORS restriction, so we fetch
// server-side and return the raw XML. Locked to Google News to avoid becoming an
// open proxy (SSRF guard).
app.get('/api/news', async (req, res) => {
  const target = req.query.url
  if (typeof target !== 'string' || !/^https:\/\/news\.google\.com\//.test(target)) {
    return res.status(400).json({ error: 'Only Google News RSS URLs are allowed.' })
  }
  try {
    const r = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Velman OS news proxy)', Accept: 'application/rss+xml, application/xml, text/xml' },
    })
    if (!r.ok) return res.status(502).json({ error: `Upstream ${r.status}` })
    const xml = await r.text()
    res.set('Content-Type', 'application/xml; charset=utf-8')
    res.send(xml)
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'Failed to fetch news.' })
  }
})

app.post('/api/brief', async (req, res) => {
  const { snapshot, mode } = req.body ?? {}
  if (authMode() === 'none') return res.status(401).json({ error: 'No Claude credentials. Run `claude setup-token` and put CLAUDE_CODE_OAUTH_TOKEN in app/.env.' })
  if (!snapshot || !BRIEF_PROMPT[mode]) return res.status(400).json({ error: 'Expected { snapshot, mode: "morning" | "evening" }.' })
  try {
    const text = await runClaude({
      system: BRIEF_SYSTEM,
      prompt: `${BRIEF_PROMPT[mode]}\n\nToday's snapshot (JSON):\n${JSON.stringify(snapshot, null, 2)}`,
    })
    res.json({ text })
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'Claude call failed.' })
  }
})

// The vault, when configured, turns the assistant into a second-brain agent:
// it may Grep/Glob/Read the user's Obsidian notes to answer from them.
const VAULT_ASSISTANT_EXTRA = `

SECOND BRAIN — the user's Obsidian vault is your working directory. When the question concerns their notes, knowledge, ideas, people, projects, or anything the app snapshot does not cover, SEARCH the vault (Grep/Glob, then Read the best match) before answering. Cite which note the answer came from ("from [[Note Name]]"). Keep the same brevity rules. Never modify files.`

app.post('/api/assistant', async (req, res) => {
  const { context, history, question } = req.body ?? {}
  if (authMode() === 'none') return res.status(401).json({ error: 'No Claude credentials. Run `claude setup-token` and put CLAUDE_CODE_OAUTH_TOKEN in app/.env.' })
  if (!context || !question?.trim()) return res.status(400).json({ error: 'Expected { context, history, question }.' })
  try {
    const vault = vaultRoot()
    const text = await runClaude({
      system: `${ASSISTANT_SYSTEM}${vault ? VAULT_ASSISTANT_EXTRA : ''}\n\nLive snapshot of the app (JSON):\n${JSON.stringify(context, null, 2)}`,
      prompt: buildConversation(history, question.trim()),
      ...(vault ? { allowedTools: ['Read', 'Grep', 'Glob'], maxTurns: 12, cwd: vault } : {}),
    })
    res.json({ text })
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'Claude call failed.' })
  }
})

// ---------------------------------------------------------------------------
// Business finance analyst — turns an uploaded spreadsheet (already parsed to
// rows in the browser) into ONE normalized analysis shape the UI renders for
// every statement type: KPIs, a pie breakdown, a trend series, insights, and a
// cleaned table. Runs on the same Pro subscription via runClaude (no tools).
// ---------------------------------------------------------------------------
const BIZ_ANALYZE_SYSTEM = `You are the business-finance analyst inside "Velman OS" for Dr. Gowtham, a founder in India (money in INR unless the sheet clearly uses another currency). You receive the raw contents of ONE uploaded spreadsheet (sheet names + rows as arrays, first rows usually headers) for ONE statement type of ONE business vertical. Clean it, understand it, analyze it.

Reply with ONLY one JSON object — no prose, no markdown fences — exactly this shape:
{
  "title": "short human title for this statement",
  "period": "period covered if detectable (e.g. \\"Apr–Jun 2026\\"), else null",
  "months": ["2026-04", "2026-05", "2026-06"],
  "kpis": [ { "label": "Total revenue", "value": "₹12.4L", "tone": "good" } ],
  "breakdown": [ { "name": "Rent", "value": 45000 } ],
  "trendNames": ["Revenue", "Expenses"],
  "trend": [ { "label": "Apr 2026", "month": "2026-04", "Revenue": 120000, "Expenses": 90000 } ],
  "insights": [ "plain-language finding with real numbers" ],
  "table": { "columns": ["..."], "rows": [ ["...", 123] ] }
}

Rules:
- kpis: 3-4, the numbers a founder checks first for THIS statement type (e.g. balance sheet → total assets / liabilities / equity / current ratio; break-even → break-even units & revenue, margin of safety; invoices → outstanding, overdue count; inventory → stock value, low-stock items). tone: "good" | "bad" | "neutral".
- breakdown: the most meaningful composition for a pie chart, at most 8 slices — merge the tail into "Other". Values are plain numbers (INR).
- months: the ISO YYYY-MM months the data actually covers, in order ([] only if truly undetectable). This powers period filtering, so infer hard: from column headers, row dates, sheet names, or the file name. A yearly figure covers all 12 months of that year.
- trend: chronological points if the data has a time dimension (else empty array), up to 24. EVERY trend point must carry "month" as YYYY-MM (for a yearly row use the year's first month). "label" is the human form ("Apr 2026"). trendNames lists the 1-2 numeric series keys used in trend objects.
- insights: 3-5 specific, plain-language observations with real figures — what's healthy, what's off, what to act on. Never generic filler.
- table: the cleaned, normalized data — clear headers, consistent columns, at most 60 rows (note "showing first 60" in insights if truncated). Numbers as numbers, not strings.
- If the sheet doesn't look like the stated statement type, still analyze what it IS and say so in the first insight.
- Never invent rows that aren't in the data; derived totals/ratios are fine.`

const BIZ_REPORT_SYSTEM = (today) => `You are the fractional CFO inside "Velman OS", writing for Dr. Gowtham (founder, India, INR, IST). Today is ${today}. You receive: a business vertical's name, the user's REPORT REQUEST in free text (e.g. "report for July 2026", "Q2 2026", "first half of this year", "FY 2025-26", "last year"), and the analyzed data of the vertical's financial statements — each tagged with the ISO months it covers, plus KPIs, breakdowns, monthly trend points, insights, and tables.

First, resolve the requested period from the free text (resolve relative phrases against today; if a quarter/half could be calendar or Indian fiscal, pick the more natural reading and STATE your interpretation, e.g. "Q2 2026 (Apr–Jun)"). Then use ONLY data belonging to that period — filter by each statement's months and each trend point's month. Figures spanning a wider range than the period: use them only if you can attribute the period's share; otherwise mention them as context.

Write clean markdown (no code fences), max ~550 words:
# <Vertical> — <resolved period> report
## Executive summary   (3-4 sentences: your period interpretation if non-obvious, overall health, the one number that matters, the one risk)
## Performance         (revenue/profit/cash movements within the period, with real figures)
## Statement highlights (one tight bullet per statement that has data IN the period)
## Data gaps           (statements with no data for this period — one line; omit the section if none)
## Risks & watch-outs  (2-3 bullets)
## Recommendations     (3 numbered, concrete actions for the next period)

Only use figures present in the data. Never invent numbers.`

app.post('/api/business/analyze', async (req, res) => {
  const { verticalName, typeLabel, fileName, sheets } = req.body ?? {}
  if (authMode() === 'none') return res.status(401).json({ error: 'No Claude credentials. Run `claude setup-token` and put CLAUDE_CODE_OAUTH_TOKEN in .env.' })
  if (!typeLabel || !Array.isArray(sheets) || !sheets.length) return res.status(400).json({ error: 'Expected { verticalName, typeLabel, fileName, sheets }.' })
  try {
    const text = await runClaude({
      system: BIZ_ANALYZE_SYSTEM,
      prompt: `Vertical: ${verticalName || 'Business'}\nStatement type: ${typeLabel}\nFile: ${fileName || 'upload.xlsx'}\n\nSpreadsheet contents (JSON):\n${JSON.stringify(sheets)}`,
    })
    const analysis = extractJson(text)
    if (!analysis?.kpis || !analysis?.table) throw new Error('The analyst returned an unexpected shape — try re-uploading.')
    res.json({ analysis })
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'Analysis failed.' })
  }
})

app.post('/api/business/report', async (req, res) => {
  const { verticalName, request, statements } = req.body ?? {}
  if (authMode() === 'none') return res.status(401).json({ error: 'No Claude credentials. Run `claude setup-token` and put CLAUDE_CODE_OAUTH_TOKEN in .env.' })
  if (!verticalName || typeof request !== 'string' || !request.trim() || !Array.isArray(statements) || !statements.length) {
    return res.status(400).json({ error: 'Expected { verticalName, request, statements } with at least one analyzed statement.' })
  }
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const text = await runClaude({
      system: BIZ_REPORT_SYSTEM(today),
      prompt: `Vertical: ${verticalName}\nReport request: ${request.trim()}\n\nAnalyzed statements (JSON):\n${JSON.stringify(statements)}`,
    })
    res.json({ report: text })
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'Report generation failed.' })
  }
})

// ---------------------------------------------------------------------------
// Obsidian vault bridge — the "second brain" connection. The vault is a plain
// folder of .md files (set OBSIDIAN_VAULT in .env); this server is the only
// thing that touches the disk, the browser just calls these endpoints.
//
// Design rules (deliberate, they keep two-way flow from breaking):
//   - Tasks live as one file each in <vault>/Tasks with YAML frontmatter.
//   - The app owns the frontmatter fields it knows; the NOTE BODY belongs to
//     Obsidian and is preserved byte-for-byte on every rewrite.
//   - Files are never deleted — a deletion becomes `archived: true`.
//   - Conflicts resolve last-write-wins per task via the `updated` stamp.
//   - Filenames are `<id>-<slug>.md`; identity is the frontmatter id, so
//     renaming a file in Obsidian never orphans a task.
// ---------------------------------------------------------------------------
const VAULT_TASKS_DIR = process.env.OBSIDIAN_TASKS_DIR || 'Tasks'
const VAULT_INBOX_DIR = process.env.OBSIDIAN_INBOX_DIR || 'Inbox'

function vaultRoot() {
  const p = process.env.OBSIDIAN_VAULT
  return p ? resolve(p) : null
}

// Resolve a path inside the vault, rejecting anything that escapes it.
function safeVaultPath(rel) {
  const root = vaultRoot()
  if (!root) throw new Error('No vault configured.')
  const abs = resolve(root, rel)
  if (abs !== root && !abs.startsWith(root + sep)) throw new Error('Path escapes the vault.')
  return abs
}

// All .md files under a folder, skipping dot-dirs (.obsidian, .trash, .git).
async function walkMd(dir, out = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) await walkMd(p, out)
    else if (e.name.toLowerCase().endsWith('.md')) out.push(p)
  }
  return out
}

// YAML may hand back Date objects or strings — normalize both.
const isoStamp = (v) => {
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string' && v) {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return new Date(t).toISOString()
  }
  return null
}
const isoDay = (v) => {
  const s = isoStamp(v)
  return s ? s.slice(0, 10) : null
}
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'note'

const TASK_STATUSES = ['Backlog', 'In Progress', 'Review', 'Done', 'On Hold']
const TASK_PRIORITIES = ['Urgent', 'High', 'Med', 'Low']

// Frontmatter → app task shape (invalid vocab falls back to safe defaults).
function vaultTask(data, fileMtimeIso) {
  if (!data?.id || !data?.title) return null
  return {
    id: String(data.id),
    title: String(data.title),
    category: String(data.category || 'Work'),
    priority: TASK_PRIORITIES.includes(data.priority) ? data.priority : 'Med',
    status: TASK_STATUSES.includes(data.status) ? data.status : 'Backlog',
    assignee: String(data.assignee ?? 'You'),
    due: isoDay(data.due),
    notes: String(data.notes ?? ''),
    createdAt: isoDay(data.created) ?? fileMtimeIso.slice(0, 10),
    updated: isoStamp(data.updated) ?? fileMtimeIso,
  }
}

// App task → frontmatter, keeping any extra fields the user added in Obsidian.
function taskFrontmatter(t, existing = {}) {
  return {
    ...existing,
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    category: t.category,
    assignee: t.assignee,
    due: t.due || null,
    notes: t.notes || '',
    created: existing.created ?? t.createdAt,
    updated: t.updated || new Date().toISOString(),
    tags: Array.isArray(existing.tags) && existing.tags.length ? existing.tags : ['velman-task'],
  }
}

// Every task file in <vault>/Tasks, keyed by frontmatter id.
async function readVaultTasks() {
  const files = await walkMd(safeVaultPath(VAULT_TASKS_DIR))
  const byId = new Map()
  for (const f of files) {
    try {
      const parsed = matter(await readFile(f, 'utf8'))
      if (!parsed.data?.id) continue
      const st = await stat(f)
      byId.set(String(parsed.data.id), { file: f, data: parsed.data, body: parsed.content, mtime: st.mtime.toISOString() })
    } catch {
      /* skip unparseable files */
    }
  }
  return byId
}

app.get('/api/vault/status', async (_req, res) => {
  const root = vaultRoot()
  if (!root) return res.json({ configured: false })
  try {
    const s = await stat(root)
    if (!s.isDirectory()) throw new Error('not a directory')
    const notes = (await walkMd(root)).length
    let tasks = 0
    try {
      tasks = (await readVaultTasks()).size
    } catch {
      /* Tasks dir may not exist yet */
    }
    res.json({ configured: true, path: root, exists: true, notes, tasks, tasksDir: VAULT_TASKS_DIR, inboxDir: VAULT_INBOX_DIR })
  } catch {
    res.json({ configured: true, path: root, exists: false, error: 'OBSIDIAN_VAULT does not exist or is not a folder.' })
  }
})

// Two-way task sync, server-authoritative merge. The client sends its tasks and
// delete-tombstones; the reply is the canonical list the client should adopt.
app.post('/api/vault/tasks/sync', async (req, res) => {
  const { tasks, deleted } = req.body ?? {}
  if (!vaultRoot()) return res.status(400).json({ error: 'No OBSIDIAN_VAULT configured in .env.' })
  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'Expected { tasks: [], deleted?: [] }.' })
  try {
    await mkdir(safeVaultPath(VAULT_TASKS_DIR), { recursive: true })
    const byId = await readVaultTasks()
    const counts = { created: 0, updated: 0, archived: 0 }
    const now = new Date().toISOString()

    const deletedIds = new Set()
    for (const d of Array.isArray(deleted) ? deleted : []) {
      if (!d?.id) continue
      deletedIds.add(String(d.id))
      const f = byId.get(String(d.id))
      if (f && !f.data.archived) {
        await writeFile(f.file, matter.stringify(f.body, { ...f.data, archived: true, updated: now }))
        f.data.archived = true
        counts.archived++
      }
    }

    for (const t of tasks) {
      if (!t?.id || deletedIds.has(String(t.id))) continue
      const f = byId.get(String(t.id))
      if (!f) {
        const file = join(safeVaultPath(VAULT_TASKS_DIR), `${t.id}-${slugify(t.title || 'task')}.md`)
        await writeFile(file, matter.stringify('', taskFrontmatter(t)))
        counts.created++
      } else if (!f.data.archived) {
        const local = Date.parse(t.updated ?? '') || 0
        const remote = Date.parse(isoStamp(f.data.updated) ?? f.mtime) || 0
        if (local > remote) {
          await writeFile(f.file, matter.stringify(f.body, taskFrontmatter(t, f.data)))
          counts.updated++
        }
      }
    }

    const canonical = []
    for (const f of (await readVaultTasks()).values()) {
      if (f.data.archived) continue
      const t = vaultTask(f.data, f.mtime)
      if (t) canonical.push(t)
    }
    res.json({ ok: true, tasks: canonical, counts, clearedTombstones: [...deletedIds] })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Vault sync failed.' })
  }
})

app.get('/api/vault/search', async (req, res) => {
  const root = vaultRoot()
  if (!root) return res.status(400).json({ error: 'No OBSIDIAN_VAULT configured.' })
  const q = String(req.query.q ?? '').trim().toLowerCase()
  if (!q) return res.json({ results: [] })
  try {
    const results = []
    for (const f of await walkMd(root)) {
      if (results.length >= 30) break
      const rel = f.slice(root.length + 1)
      let snippet = ''
      let hit = rel.toLowerCase().includes(q)
      if (!hit) {
        try {
          const raw = await readFile(f, 'utf8')
          const i = raw.toLowerCase().indexOf(q)
          if (i !== -1) {
            hit = true
            snippet = raw.slice(Math.max(0, i - 60), i + 100).replace(/\s+/g, ' ').trim()
          }
        } catch {
          /* unreadable file — skip */
        }
      }
      if (hit) {
        const st = await stat(f).catch(() => null)
        results.push({ path: rel.replaceAll(sep, '/'), snippet, modified: st?.mtime?.toISOString() ?? null })
      }
    }
    res.json({ results })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Vault search failed.' })
  }
})

app.get('/api/vault/note', async (req, res) => {
  if (!vaultRoot()) return res.status(400).json({ error: 'No OBSIDIAN_VAULT configured.' })
  const p = String(req.query.p ?? '')
  if (!p.toLowerCase().endsWith('.md')) return res.status(400).json({ error: 'Only .md notes can be read.' })
  try {
    const content = await readFile(safeVaultPath(p), 'utf8')
    res.json({ path: p, content })
  } catch {
    res.status(404).json({ error: 'Note not found.' })
  }
})

// Quick capture → a new note in <vault>/Inbox for later triage in Obsidian.
app.post('/api/vault/capture', async (req, res) => {
  if (!vaultRoot()) return res.status(400).json({ error: 'No OBSIDIAN_VAULT configured.' })
  const { title, text } = req.body ?? {}
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Expected { title?, text }.' })
  try {
    const dir = safeVaultPath(VAULT_INBOX_DIR)
    await mkdir(dir, { recursive: true })
    const now = new Date()
    const stampName = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const name = `${stampName}-${slugify(title?.trim() || text.trim().slice(0, 30))}.md`
    const body = title?.trim() ? `# ${title.trim()}\n\n${text.trim()}\n` : `${text.trim()}\n`
    await writeFile(join(dir, name), matter.stringify(body, { created: now.toISOString(), source: 'velman-os', tags: ['inbox'] }), { flag: 'wx' })
    res.json({ ok: true, path: `${VAULT_INBOX_DIR}/${name}` })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Capture failed.' })
  }
})

// ---------------------------------------------------------------------------
// Flight booking agent — researches live options across booking sites with the
// Agent SDK's web tools, on the same Pro subscription. RESEARCH ONLY: it never
// books or pays; the UI hands the user to the booking site for manual payment.
// ---------------------------------------------------------------------------
const FLIGHTS_SYSTEM = (today) => `You are the flight-booking RESEARCH agent inside "Velman OS" for Dr. Gowtham (based in India; money in INR; timezone IST). Today is ${today} (IST).

You receive a natural-language flight request (e.g. "book a ticket from Chennai to Dubai on 21 July, business class"). Do this:

1. PARSE it: origin city + IATA code, destination city + IATA code, depart date (resolve relative dates against today; if none given pick the nearest sensible date and flag it in "advice"), optional return date, cabin (Economy / Premium Economy / Business / First — default Economy), passengers (default 1).
2. RESEARCH live options with WebSearch (and WebFetch on promising results pages): check Google Flights, Skyscanner, MakeMyTrip, Cleartrip, EaseMyTrip, Yatra and the airlines that fly the route (IndiGo, Air India, Air India Express, Emirates, flydubai, SpiceJet, ...). Collect 6-12 concrete flight options across sites for the requested cabin. TIME BUDGET: the user is waiting live — do at most ~8 searches and ~6 page reads total; as soon as you have 6 solid options, STOP researching and compile.
3. COUPONS: search for currently-valid coupon codes / bank-card offers on those booking sites for flights, and list them per site.
4. Reply with ONLY one JSON object — no prose before or after, no markdown fences — exactly this shape:
{
  "parsed": { "from": "Chennai", "fromCode": "MAA", "to": "Dubai", "toCode": "DXB", "departDate": "YYYY-MM-DD", "returnDate": null, "cabin": "Business", "passengers": 1 },
  "options": [ { "airline": "Emirates", "flightNo": "EK 545", "depart": "09:35", "arrive": "12:20", "duration": "4h 15m", "stops": 0, "cabin": "Business", "priceINR": 78500, "approx": true, "site": "MakeMyTrip", "bookUrl": "https://...", "notes": "checked bag + meal included" } ],
  "coupons": [ { "site": "MakeMyTrip", "code": "MMTDXB", "detail": "10% off international flights with ICICI cards, up to Rs 2,000" } ],
  "advice": "2-3 sentences: which option you'd pick and why; anything to watch (layover, baggage, visa).",
  "asOf": "web results, ${today}"
}

Rules:
- priceINR: integer INR when you saw a figure; "approx": true unless it came from a live fare page; null only if you found no figure at all.
- RECENCY: prefer prices from actual fare/search-results pages you fetched just now; ignore fares quoted in articles, blogs or forum posts more than ~2 weeks old — dynamic pricing makes them wrong.
- bookUrl: the most reliable link you actually saw (a site's search/results page is fine). NEVER invent a checkout/deep-payment link.
- stops is an integer; times are local; duration like "4h 15m". Sort options by priceINR ascending (nulls last).
- You RESEARCH only. You never book, hold, or pay for anything, and never ask for card details.
- If the web tools return nothing usable, still return typical schedules/fares for the route from knowledge — every option marked "approx": true — and say in "advice" that live fares must be confirmed on the booking site.`

function buildFlightPrompt(request, prior) {
  const lines = []
  if (prior?.request) {
    lines.push(`Previous request: ${prior.request}`)
    if (prior.parsed) lines.push(`Previous parsed trip: ${JSON.stringify(prior.parsed)}`)
    lines.push('The new message below may refine the previous search (e.g. change cabin, date, or filters) — carry over anything it does not change.')
  }
  lines.push(`New request: ${request}`)
  return lines.join('\n\n')
}

// First "{" to last "}" — tolerates any stray prose/fences around the JSON.
function extractJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('The agent returned no JSON.')
  return JSON.parse(text.slice(start, end + 1))
}

// Streams a step event for each web tool an agent run invokes.
function sendToolSteps(msg, send) {
  if (msg.type !== 'assistant') return
  for (const block of msg.message?.content ?? []) {
    if (block.type !== 'tool_use') continue
    if (block.name === 'WebSearch') send({ t: 'step', label: `Searching: ${block.input?.query ?? 'the web'}` })
    else if (block.name === 'WebFetch') {
      let host = 'a results page'
      try { host = new URL(block.input?.url).hostname.replace(/^www\./, '') } catch { /* keep default */ }
      send({ t: 'step', label: `Reading ${host}…` })
    }
  }
}

// ---------------------------------------------------------------------------
// LIVE fares via Amadeus Self-Service (optional — free keys from
// developers.amadeus.com, set AMADEUS_API_KEY/SECRET in .env). Web-researched
// prices lag dynamic airline pricing; Amadeus quotes actual current offers, so
// the dashboard matches what the booking site shows. Without keys the flights
// endpoint transparently falls back to the web-research agent.
// ---------------------------------------------------------------------------
const AMADEUS_HOST = (process.env.AMADEUS_ENV || 'test') === 'production'
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com'
const amadeusEnabled = () => !!(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET)

let amadeusAuth = { token: null, exp: 0 }
async function amadeusToken() {
  if (amadeusAuth.token && Date.now() < amadeusAuth.exp) return amadeusAuth.token
  const r = await fetch(`${AMADEUS_HOST}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_API_KEY,
      client_secret: process.env.AMADEUS_API_SECRET,
    }),
  })
  if (!r.ok) throw new Error(`Amadeus auth failed (${r.status})`)
  const j = await r.json()
  amadeusAuth = { token: j.access_token, exp: Date.now() + Math.max(0, (j.expires_in ?? 1799) - 60) * 1000 }
  return amadeusAuth.token
}

const isoDuration = (d) => {
  const h = /(\d+)H/.exec(d ?? '')?.[1] ?? '0'
  const m = /(\d+)M/.exec(d ?? '')?.[1] ?? '0'
  return `${h}h ${m.padStart(2, '0')}m`
}
const titleCase = (s) => (s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s)
const CABIN_PARAM = { economy: 'ECONOMY', 'premium economy': 'PREMIUM_ECONOMY', business: 'BUSINESS', first: 'FIRST' }

async function amadeusOffers(parsed) {
  const token = await amadeusToken()
  const q = new URLSearchParams({
    originLocationCode: parsed.fromCode,
    destinationLocationCode: parsed.toCode,
    departureDate: parsed.departDate,
    adults: String(parsed.passengers || 1),
    currencyCode: 'INR',
    max: '20',
  })
  const cabin = CABIN_PARAM[(parsed.cabin || 'Economy').toLowerCase()]
  if (cabin) q.set('travelClass', cabin)
  if (parsed.returnDate) q.set('returnDate', parsed.returnDate)
  const r = await fetch(`${AMADEUS_HOST}/v2/shopping/flight-offers?${q}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`Amadeus search failed (${r.status})`)
  const j = await r.json()
  const carriers = j.dictionaries?.carriers ?? {}
  return (j.data ?? []).slice(0, 15).map((offer) => {
    const it = offer.itineraries[0]
    const segs = it.segments
    const first = segs[0]
    const last = segs[segs.length - 1]
    const cab = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin
    return {
      airline: titleCase(carriers[first.carrierCode] || first.carrierCode),
      flightNo: segs.map((s) => `${s.carrierCode} ${s.number}`).join(' + '),
      depart: first.departure.at.slice(11, 16),
      arrive: last.arrival.at.slice(11, 16),
      duration: isoDuration(it.duration),
      stops: segs.length - 1,
      cabin: titleCase((cab || parsed.cabin || 'ECONOMY').replace(/_/g, ' ')),
      priceINR: Math.round(+offer.price.grandTotal),
      approx: false,
      site: 'Amadeus (live)',
      bookUrl: null,
      notes: offer.numberOfBookableSeats ? `${offer.numberOfBookableSeats} seats at this fare` : undefined,
    }
  })
}

const PARSE_SYSTEM = (today) => `Extract flight-search parameters from the user's request. Today is ${today} (IST); resolve relative dates against it. Use each city's main airport IATA code. Reply with ONLY JSON, no prose:
{"from":"Chennai","fromCode":"MAA","to":"Dubai","toCode":"DXB","departDate":"YYYY-MM-DD","returnDate":null,"cabin":"Economy","passengers":1}
cabin must be one of: Economy, Premium Economy, Business, First (default Economy). passengers defaults to 1. If no date is given, pick the nearest sensible upcoming date.`

const COUPONS_SYSTEM = `You research coupon codes for Indian flight-booking sites. Given a route and date, use WebSearch (and WebFetch when useful) to find CURRENTLY VALID coupon codes / bank-card offers for flights on MakeMyTrip, Cleartrip, EaseMyTrip, Yatra and Goibibo. At most 6, prefer international-flight offers. Reply with ONLY JSON: {"coupons":[{"site":"Cleartrip","code":"CTINT","detail":"what it gives and its conditions"}]}`

const ADVICE_SYSTEM = `You advise on flight choices for Dr. Gowtham (founder/CEO, India, INR, IST). You get JSON: the parsed trip, live fare options (accurate at search time), and coupons. Reply with 2-3 plain sentences, no markdown: which option you'd book and why, the single best coupon or payment offer to try, and one watch-out (timing, baggage or layover). Reference real flight numbers and INR figures.`

async function runCouponsAgent(parsed, send, ac) {
  let text = ''
  for await (const msg of query({
    prompt: `Route: ${parsed.from} (${parsed.fromCode}) → ${parsed.to} (${parsed.toCode}) on ${parsed.departDate}, cabin ${parsed.cabin}, ${parsed.passengers} passenger(s).`,
    options: {
      model: MODEL,
      systemPrompt: COUPONS_SYSTEM,
      allowedTools: ['WebSearch', 'WebFetch'],
      maxTurns: 10,
      permissionMode: 'default',
      abortController: ac,
    },
  })) {
    sendToolSteps(msg, send)
    if (msg.type === 'result' && msg.subtype === 'success') text = msg.result
  }
  if (!text) return []
  const j = extractJson(text)
  return Array.isArray(j.coupons) ? j.coupons : []
}

// Live path: quick parse → Amadeus fares (accurate) + coupon agent in parallel
// → short advice call. Throws to let the caller fall back to web research.
async function runLiveSearch(request, prior, today, send, ac) {
  send({ t: 'step', label: 'Parsing your request…' })
  const parsed = extractJson(await runClaude({ system: PARSE_SYSTEM(today), prompt: buildFlightPrompt(request, prior) }))
  if (!parsed?.fromCode || !parsed?.toCode || !parsed?.departDate) throw new Error('Could not parse the trip.')
  send({ t: 'step', label: `Fetching live fares ${parsed.fromCode} → ${parsed.toCode} · ${parsed.departDate}…` })
  const couponsPromise = runCouponsAgent(parsed, send, ac).catch(() => [])
  const options = await amadeusOffers(parsed)
  if (!options.length) throw new Error('No live offers for this route/date.')
  options.sort((a, b) => a.priceINR - b.priceINR)
  const coupons = await couponsPromise
  send({ t: 'step', label: 'Writing recommendation…' })
  let advice = ''
  try {
    advice = await runClaude({ system: ADVICE_SYSTEM, prompt: JSON.stringify({ parsed, options: options.slice(0, 8), coupons }) })
  } catch { /* advice is optional */ }
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return { parsed, options, coupons, advice, asOf: `live fares · ${now} IST`, source: 'live' }
}

// Research path: one agentic run that parses + web-searches + compiles.
async function runResearchAgent(request, prior, today, send, ac) {
  send({ t: 'step', label: 'Understanding your request…' })
  let text = ''
  let failure = null
  for await (const msg of query({
    prompt: buildFlightPrompt(request, prior),
    options: {
      model: MODEL,
      systemPrompt: FLIGHTS_SYSTEM(today),
      allowedTools: ['WebSearch', 'WebFetch'],
      maxTurns: 18,
      permissionMode: 'default',
      abortController: ac,
    },
  })) {
    sendToolSteps(msg, send)
    if (msg.type === 'result') {
      if (msg.subtype === 'success') text = msg.result
      else failure = msg.subtype
    }
  }
  if (!text) throw new Error(failure ? `Agent run ended: ${failure}` : 'No result from the agent.')
  send({ t: 'step', label: 'Compiling options…' })
  return { ...extractJson(text), source: 'research' }
}

// Server-Sent Events: streams the agent's live activity (each web search /
// page read) as `step` events, then one `done` event with the parsed JSON.
app.post('/api/flights', async (req, res) => {
  const { request, prior } = req.body ?? {}
  if (authMode() === 'none') return res.status(401).json({ error: 'No Claude credentials. Run `claude setup-token` and put CLAUDE_CODE_OAUTH_TOKEN in .env.' })
  if (typeof request !== 'string' || !request.trim()) return res.status(400).json({ error: 'Expected { request: string }.' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

  // Abort the agent if the BROWSER disconnects mid-stream. (Note: this must be
  // res 'close' + writableEnded — req 'close' fires as soon as the request body
  // is consumed, which would abort the agent instantly.)
  const ac = new AbortController()
  res.on('close', () => { if (!res.writableEnded) ac.abort() })

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  try {
    let data = null
    if (amadeusEnabled()) {
      try {
        data = await runLiveSearch(request.trim(), prior, today, send, ac)
      } catch (e) {
        if (ac.signal.aborted) throw e
        send({ t: 'step', label: 'Live fares unavailable — falling back to web research…' })
      }
    }
    if (!data) data = await runResearchAgent(request.trim(), prior, today, send, ac)
    send({ t: 'done', data })
  } catch (e) {
    if (!ac.signal.aborted) send({ t: 'error', message: e instanceof Error ? e.message : 'Flight search failed.' })
  } finally {
    res.end()
  }
})

// Get local network IP address
function getNetworkIP() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal (localhost) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}

app.listen(PORT, '0.0.0.0', () => {
  const mode = authMode()
  const networkIP = getNetworkIP()
  console.log(`\n  Velman OS assistant server → http://localhost:${PORT}`)
  console.log(`  Network access → http://${networkIP}:${PORT}`)
  console.log(`  model: ${MODEL}`)
  const vault = vaultRoot()
  if (vault) console.log(`  vault: ${vault} (Obsidian second brain) ✓`)
  else console.log('  vault: not configured — set OBSIDIAN_VAULT in .env to connect Obsidian')
  if (mode === 'subscription') console.log('  auth:  Claude Pro/Max subscription (CLAUDE_CODE_OAUTH_TOKEN) ✓\n')
  else if (mode === 'apikey') console.log('  auth:  ANTHROPIC_API_KEY (pay-per-use) — set CLAUDE_CODE_OAUTH_TOKEN to use your Pro plan instead\n')
  else console.log('  auth:  NONE — run `claude setup-token` and add CLAUDE_CODE_OAUTH_TOKEN to app/.env\n')
})
