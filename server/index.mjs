// GC OS assistant server — the bridge that lets the dashboard use YOUR Claude
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
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import express from 'express'
import cors from 'cors'
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
const BRIEF_SYSTEM = `You are the chief-of-staff inside "GC Operating System", a personal productivity dashboard for Dr. Gowtham — a founder/CEO based in India (INR, IST). You receive a compact JSON snapshot of his day (agenda, priorities, to-dos, open loops/waiting-on, habit consistency, finances, work tasks, gratitude, reflection). Write tight, scannable, founder-grade output. Be specific to the data — reference actual items by name. No preamble, no "Here is...". Use short markdown: a one-line headline, then a few bullet lines. Keep it under ~160 words. India + founder context. Never invent data not in the snapshot.`

const BRIEF_PROMPT = {
  morning:
    'Write the MORNING BRIEF. Cover, in this order: (1) one headline sentence on the shape of today; (2) the 1–3 Most Important Tasks (impact-ranked) drawn from priorities/agenda/work; (3) overdue or due-today follow-ups from open loops and work tasks; (4) one decision or thing that needs him today; (5) one short health/habit or money nudge. End with one recommended first move.',
  evening:
    'Write the END-OF-DAY WRAP with three short labelled sections — **Done today**, **Still open**, **Tomorrow** — each a few bullets pulled from the snapshot (completed vs open priorities/to-dos/loops). Close with one reflection prompt or encouragement.',
}

const ASSISTANT_SYSTEM = `You are the built-in assistant for "GC Operating System", a personal life-OS dashboard for Dr. Gowtham — a founder/CEO and doctor based in India (INR, IST). You are given a live JSON snapshot of EVERYTHING in the app: today's agenda, weekly priorities, to-dos, open loops (waiting-on), the document vault, subscriptions, full finances (net worth, portfolio, holdings, goals), work tasks and the group of companies, habit consistency, health metrics, and the news verticals.

Your job: let the user GET ANY INFORMATION from the app by just asking, instead of clicking through pages.

Rules:
- Answer ONLY from the snapshot. Never invent numbers, dates, names, or documents. If something isn't in the snapshot, say so plainly and point them to the right page.
- Be concise and scannable. Reference real items by name and exact figures from the snapshot.
- Use short markdown — a one-line answer, then a few bullets only if needed. No preamble like "Based on the snapshot…".
- When useful, tell them which page holds more (e.g. "→ Finance ▸ Portfolio", "→ Vault", "→ Open Loops").
- For "what needs my attention", combine overdue loops, work tasks due today/overdue, documents to renew, and subscriptions due soon.
- Money is INR; respect Asian-Indian context. Note when health data is demo.`

// Run a single-turn, tool-free Claude call over your subscription and return text.
async function runClaude({ system, prompt }) {
  let text = ''
  let failure = null
  for await (const msg of query({
    prompt,
    options: {
      model: MODEL,
      systemPrompt: system, // a string fully REPLACES the default agent prompt
      allowedTools: [],      // pure text Q&A — no file/tool access
      maxTurns: 1,
      permissionMode: 'default',
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
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: authMode(), model: MODEL })
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

app.post('/api/assistant', async (req, res) => {
  const { context, history, question } = req.body ?? {}
  if (authMode() === 'none') return res.status(401).json({ error: 'No Claude credentials. Run `claude setup-token` and put CLAUDE_CODE_OAUTH_TOKEN in app/.env.' })
  if (!context || !question?.trim()) return res.status(400).json({ error: 'Expected { context, history, question }.' })
  try {
    const text = await runClaude({
      system: `${ASSISTANT_SYSTEM}\n\nLive snapshot of the app (JSON):\n${JSON.stringify(context, null, 2)}`,
      prompt: buildConversation(history, question.trim()),
    })
    res.json({ text })
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'Claude call failed.' })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  const mode = authMode()
  console.log(`\n  GC OS assistant server → http://localhost:${PORT}`)
  console.log(`  Network access → http://192.168.1.123:${PORT}`)
  console.log(`  model: ${MODEL}`)
  if (mode === 'subscription') console.log('  auth:  Claude Pro/Max subscription (CLAUDE_CODE_OAUTH_TOKEN) ✓\n')
  else if (mode === 'apikey') console.log('  auth:  ANTHROPIC_API_KEY (pay-per-use) — set CLAUDE_CODE_OAUTH_TOKEN to use your Pro plan instead\n')
  else console.log('  auth:  NONE — run `claude setup-token` and add CLAUDE_CODE_OAUTH_TOKEN to app/.env\n')
})
