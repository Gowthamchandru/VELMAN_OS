// Importer for "Dr.Gowtham's Calendar .xlsx" -> normalized planner seed JSON.
// Run: node scripts/importPlanner.mjs
// Maps the weekly-planner sheet layout into the Phase 0 data shape.
import * as XLSX from 'xlsx'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, "../../Dr.Gowtham's Calendar .xlsx")
const OUT = resolve(__dirname, '../src/seed/plannerSeed.json')
const SHEET = 'Example'

// Day-block anchor columns (1-based), 22 cols apart: AA AW BS CO DK EG FC
const DAY_ANCHORS = [27, 49, 71, 93, 115, 137, 159]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const wb = XLSX.read(readFileSync(SRC), { type: 'buffer', cellDates: true })
const ws = wb.Sheets[SHEET]
if (!ws) throw new Error(`Sheet "${SHEET}" not found. Found: ${wb.SheetNames.join(', ')}`)

const at = (r1, c1) => ws[XLSX.utils.encode_cell({ r: r1 - 1, c: c1 - 1 })]
const raw = (r1, c1) => { const x = at(r1, c1); return x ? x.v : undefined }
const fmt = (r1, c1) => { const x = at(r1, c1); return x ? (x.w !== undefined ? x.w : x.v) : undefined }
const text = (r1, c1) => { const v = raw(r1, c1); return v === undefined || v === null ? null : (String(v).trim() || null) }
const bool = (r1, c1) => { const v = raw(r1, c1); if (typeof v === 'boolean') return v; if (typeof v === 'string') return v.trim().toUpperCase() === 'TRUE'; return false }
const isoDate = (r1, c1) => { const v = raw(r1, c1); if (v instanceof Date) return v.toISOString().slice(0, 10); return v ?? null }

// --- Categories (F63:F72 names, N63:N72 "Color Name (#hex)") ---
const categories = []
for (let r = 63; r <= 72; r++) {
  const name = text(r, 6) // F
  if (!name) continue
  const colorStr = text(r, 14) // N
  const hex = colorStr && colorStr.match(/#([0-9a-fA-F]{6})/)
  categories.push({ name, colorName: colorStr ? colorStr.replace(/\s*\(#.*\)/, '').trim() : null, hex: hex ? `#${hex[1]}` : null })
}

// --- This Week's Priorities (L checkbox, M text; header row 7) ---
const weekPriorities = []
for (let r = 8; r <= 14; r++) {
  const t = text(r, 13) // M
  if (!t || t === 'MY AGENDA') continue
  weekPriorities.push({ text: t, done: bool(r, 12) }) // L
}

// --- Weekly trackers (labels in D, 7-day booleans in R..X = cols 18..24) ---
function tracker(rowStart, rowEnd) {
  const out = []
  for (let r = rowStart; r <= rowEnd; r++) {
    const label = text(r, 4) // D
    if (!label) continue
    const days = []
    for (let c = 18; c <= 24; c++) days.push(bool(r, c))
    out.push({ label, days })
  }
  return out
}
const selfCare = tracker(18, 27) // header D17
const habits = tracker(30, 36)   // header D29

// --- Day blocks ---
const days = DAY_ANCHORS.map((A) => {
  const date = isoDate(4, A)
  const gratitude = [7, 8, 9].map((r) => text(r, A + 2)).filter(Boolean) // AC col
  const agenda = []
  for (let r = 12; r <= 49; r++) {
    const time = fmt(r, A + 1)      // AB col
    if (time === undefined || time === null || time === '') continue
    agenda.push({ time: String(time), category: text(r, A + 4), task: text(r, A + 10) }) // AE, AK
  }
  const todos = []
  for (let r = 52; r <= 66; r++) {
    const task = text(r, A + 3)     // AD col
    if (!task) continue
    todos.push({ n: raw(r, A + 1), done: bool(r, A + 2), task }) // AB number, AC checkbox
  }
  const reflection = text(69, A)    // anchor col
  const weekday = date ? WEEKDAYS[new Date(date).getUTCDay()] : null
  return { date, weekday, gratitude, agenda, todos, reflection }
})

const seed = {
  meta: {
    source: "Dr.Gowtham's Calendar .xlsx",
    sheet: SHEET,
    weekStartDate: isoDate(5, 4),    // D5
    dayStartTime: String(fmt(5, 19) ?? ''), // S5
    importedFrom: 'scripts/importPlanner.mjs',
  },
  categories,
  weekPriorities,
  selfCare,
  habits,
  days,
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(seed, null, 2))

const totalTasks = days.reduce((s, d) => s + d.agenda.filter((a) => a.task).length, 0)
const totalTodos = days.reduce((s, d) => s + d.todos.length, 0)
console.log('Imported OK ->', OUT)
console.log(`  week starting ${seed.meta.weekStartDate}, day start ${seed.meta.dayStartTime}`)
console.log(`  ${days.length} days | ${categories.length} categories | ${weekPriorities.length} priorities`)
console.log(`  ${selfCare.length} self-care + ${habits.length} habit rows | ${totalTasks} agenda tasks | ${totalTodos} to-dos`)
