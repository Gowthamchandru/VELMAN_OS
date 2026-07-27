// Business verticals — the data layer for Financial ▸ Business. Each vertical
// owns up to nine financial statements. The user uploads an .xlsx per
// statement; the sheet is parsed HERE (SheetJS, in the browser) and the parsed
// rows go to the LOCAL agent server, which returns one normalized analysis
// shape (KPIs / breakdown / trend / insights / table) that the UI renders the
// same way for every statement type. Raw files never leave the machine.
import { useCollection, uid } from '@/lib/store'
import { SERVER } from '@/lib/server'

export const STATEMENT_TYPES = [
  { id: 'balance-sheet', label: 'Balance Sheet' },
  { id: 'break-even', label: 'Break-even Analysis' },
  { id: 'bookkeeping', label: 'Bookkeeping' },
  { id: 'cashflow', label: 'Cashflow Statement' },
  { id: 'expenses', label: 'Expense Analysis' },
  { id: 'invoices', label: 'Invoice Tracker' },
  { id: 'pricing', label: 'Product Pricing' },
  { id: 'pnl', label: 'Profit & Loss' },
  { id: 'inventory', label: 'Stock / Inventory' },
] as const
export type StatementTypeId = (typeof STATEMENT_TYPES)[number]['id']
export const typeLabel = (id: string) => STATEMENT_TYPES.find((t) => t.id === id)?.label ?? id

export interface BizVertical { id: string; name: string; createdAt: number }
export interface KPI { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }
export interface StatementAnalysis {
  title: string
  period?: string | null
  months?: string[] // ISO YYYY-MM months the data covers (agent-detected)
  kpis: KPI[]
  breakdown: { name: string; value: number }[]
  trendNames?: string[]
  trend?: ({ label: string; month?: string } & Record<string, number | string>)[]
  insights: string[]
  table: { columns: string[]; rows: (string | number)[][] }
}
export interface BizStatement {
  id: string
  verticalId: string
  type: StatementTypeId
  fileName: string
  uploadedAt: number
  analysis: StatementAnalysis
}
export interface BizReport {
  id: string
  verticalId: string
  label: string // the user's request, e.g. "report for July 2026" / "Q2 2026"
  generatedAt: number
  markdown: string
}

export const useVerticals = () => useCollection<BizVertical>('gcos.biz.verticals.v1')
export const useStatements = () => useCollection<BizStatement>('gcos.biz.statements.v1')
export const useReports = () => useCollection<BizReport>('gcos.biz.reports.v1')
export const newVertical = (name: string): BizVertical => ({ id: uid(), name, createdAt: Date.now() })

// --- xlsx parsing (browser-side; SheetJS is already an app dependency) -------
export interface ParsedSheet { name: string; rows: (string | number)[][] }

export async function parseWorkbook(file: File): Promise<ParsedSheet[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer())
  const sheets = wb.SheetNames.slice(0, 4).map((name) => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' }) as (string | number)[][]
    return {
      name,
      // Drop empty rows, cap size so the agent payload stays sane.
      rows: rows.filter((r) => r.some((c) => c !== '' && c != null)).slice(0, 300).map((r) => r.slice(0, 25)),
    }
  }).filter((s) => s.rows.length)
  if (!sheets.length) throw new Error('That file has no readable rows.')
  return sheets
}

// --- agent calls -------------------------------------------------------------
async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${SERVER}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new Error(`Can't reach the agent server at ${SERVER}. Start it with "npm run dev:all".`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Server error (${res.status}).`)
  return data as T
}

export async function analyzeStatement(verticalName: string, type: StatementTypeId, fileName: string, sheets: ParsedSheet[]): Promise<StatementAnalysis> {
  const { analysis } = await postJson<{ analysis: StatementAnalysis }>('/api/business/analyze', {
    verticalName, typeLabel: typeLabel(type), fileName, sheets,
  })
  return analysis
}

// Free-text report request ("report for July 2026", "Q2", …) — the agent
// resolves the period and uses only data inside it. Tables are trimmed to keep
// the payload sane; months/trend carry the period signal.
export async function generateReport(verticalName: string, request: string, statements: { type: string; analysis: StatementAnalysis }[]): Promise<string> {
  const { report } = await postJson<{ report: string }>('/api/business/report', {
    verticalName, request,
    statements: statements.map((s) => ({
      statement: typeLabel(s.type),
      ...s.analysis,
      table: { columns: s.analysis.table.columns, rows: s.analysis.table.rows.slice(0, 30) },
    })),
  })
  return report
}

// --- period bucketing for visualization -------------------------------------
export const GRANULARITIES = ['Monthly', 'Quarterly', 'Half-yearly', 'Yearly'] as const
export type Granularity = (typeof GRANULARITIES)[number]

// Indian fiscal year (Apr–Mar). fyStartYear('2026-02') === 2025 (FY 2025-26).
export const fyStartYear = (month: string): number => {
  const y = Number(month.slice(0, 4))
  return Number(month.slice(5, 7)) >= 4 ? y : y - 1
}
export const fyLabel = (start: number) => `FY ${start}-${String((start + 1) % 100).padStart(2, '0')}`
const fyShort = (start: number) => `FY${String(start).slice(2)}-${String((start + 1) % 100).padStart(2, '0')}`

// The current FY and the four before it — the visualization's year dropdown.
export function recentFYs(n = 5): number[] {
  const now = new Date()
  const cur = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1
  return Array.from({ length: n }, (_, i) => cur - i)
}

export interface TrendPoint { label: string; month: string; values: Record<string, number> }

// Merge trend points from every upload of a statement type into one monthly
// series. Where two uploads cover the same month, the newest upload wins (so a
// re-upload corrects, never double-counts).
export function mergeTrend(statements: BizStatement[]): { points: TrendPoint[]; seriesNames: string[] } {
  const byMonth = new Map<string, { at: number; values: Record<string, number> }>()
  const names: string[] = []
  for (const s of [...statements].sort((a, b) => a.uploadedAt - b.uploadedAt)) {
    for (const n of s.analysis.trendNames ?? []) if (!names.includes(n)) names.push(n)
    for (const p of s.analysis.trend ?? []) {
      const month = typeof p.month === 'string' && /^\d{4}-\d{2}$/.test(p.month) ? p.month : null
      if (!month) continue
      const values: Record<string, number> = {}
      for (const n of s.analysis.trendNames ?? []) {
        const v = p[n]
        if (typeof v === 'number') values[n] = v
      }
      if (!Object.keys(values).length) continue
      const prev = byMonth.get(month)
      if (!prev || s.uploadedAt >= prev.at) byMonth.set(month, { at: s.uploadedAt, values: { ...prev?.values, ...values } })
    }
  }
  const points = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, { values }]) => ({
    month,
    label: new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    values,
  }))
  return { points, seriesNames: names.slice(0, 2) }
}

// Re-bucket the merged monthly series to the chosen granularity (values
// summed). Quarters/halves/years follow the Indian fiscal calendar (Apr–Mar):
// Q1 = Apr–Jun … Q4 = Jan–Mar, H1 = Apr–Sep, year = FY.
export function bucketTrend(points: TrendPoint[], granularity: Granularity, fy: number | null = null): ({ label: string } & Record<string, number | string>)[] {
  const filtered = fy === null ? points : points.filter((p) => fyStartYear(p.month) === fy)
  const keyOf = (month: string): { key: string; label: string } => {
    const m = Number(month.slice(5, 7))
    const f = fyStartYear(month)
    if (granularity === 'Monthly') return { key: month, label: new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) }
    if (granularity === 'Quarterly') { const q = m >= 4 ? Math.floor((m - 4) / 3) + 1 : 4; return { key: `${f}-Q${q}`, label: `Q${q} ${fyShort(f)}` } }
    if (granularity === 'Half-yearly') { const h = m >= 4 && m <= 9 ? 1 : 2; return { key: `${f}-H${h}`, label: `H${h} ${fyShort(f)}` } }
    return { key: String(f), label: fyLabel(f) }
  }
  const buckets = new Map<string, { label: string } & Record<string, number | string>>()
  for (const p of filtered) {
    const { key, label } = keyOf(p.month)
    const b = buckets.get(key) ?? { label }
    for (const [n, v] of Object.entries(p.values)) b[n] = ((b[n] as number) ?? 0) + v
    buckets.set(key, b)
  }
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, b]) => b)
}

// --- original uploaded files (IndexedDB — too big for localStorage) ----------
// Keyed by the statement record's id, so downloads return the EXACT file the
// user uploaded. If the blob is missing (old uploads / storage cleared), the
// download falls back to an .xlsx rebuilt from the analyzed table.
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gcos-biz-files', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('files')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveOriginalFile(id: string, file: File): Promise<void> {
  try {
    const db = await idb()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('files', 'readwrite')
      tx.objectStore('files').put({ name: file.name, blob: file }, id)
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
  } catch { /* non-fatal — download will use the rebuilt fallback */ }
}

async function getOriginalFile(id: string): Promise<{ name: string; blob: Blob } | null> {
  try {
    const db = await idb()
    return await new Promise((res) => {
      const req = db.transaction('files', 'readonly').objectStore('files').get(id)
      req.onsuccess = () => res(req.result ?? null)
      req.onerror = () => res(null)
    })
  } catch {
    return null
  }
}

export async function deleteOriginalFile(id: string): Promise<void> {
  try {
    const db = await idb()
    db.transaction('files', 'readwrite').objectStore('files').delete(id)
  } catch { /* ignore */ }
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// Download one upload: the original file if we have it, else a rebuilt .xlsx.
export async function downloadUpload(s: BizStatement): Promise<void> {
  const original = await getOriginalFile(s.id)
  if (original) return triggerDownload(original.blob, original.name || s.fileName)
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const a = s.analysis
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([a.table.columns, ...a.table.rows]), 'Data')
  XLSX.writeFile(wb, s.fileName.replace(/\.\w+$/, '') + '-data.xlsx')
}

// --- exports -----------------------------------------------------------------
const safeName = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'vertical'

// One workbook, one sheet per analyzed statement: cleaned table + KPIs + insights.
export async function exportVerticalXlsx(verticalName: string, statements: BizStatement[]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const used = new Set<string>()
  for (const s of statements) {
    const a = s.analysis
    const aoa: (string | number)[][] = [
      [a.title], ...(a.period ? [[`Period: ${a.period}`]] : []), [`Source: ${s.fileName}`], [],
      a.table.columns, ...a.table.rows, [],
      ['KEY FIGURES'], ...a.kpis.map((k) => [k.label, k.value]), [],
      ['INSIGHTS'], ...a.insights.map((i) => [i]),
    ]
    // Sheet names: ≤31 chars and unique even with several uploads per type.
    const base = typeLabel(s.type).slice(0, 28)
    let name = base
    for (let n = 2; used.has(name); n++) name = `${base} ${n}`.slice(0, 31)
    used.add(name)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name)
  }
  XLSX.writeFile(wb, `${safeName(verticalName)}-business.xlsx`)
}

// Tiny markdown → HTML for the print/PDF window (headings, bullets, bold, numbered).
export function markdownToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null } }
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (!line) { closeList(); continue }
    if (line.startsWith('## ')) { closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`) }
    else if (line.startsWith('# ')) { closeList(); out.push(`<h1>${inline(line.slice(2))}</h1>`) }
    else if (/^[-•]\s+/.test(line)) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul' } out.push(`<li>${inline(line.replace(/^[-•]\s+/, ''))}</li>`) }
    else if (/^\d+\.\s+/.test(line)) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol' } out.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`) }
    else { closeList(); out.push(`<p>${inline(line)}</p>`) }
  }
  closeList()
  return out.join('\n')
}

// Opens a clean print window (user saves as PDF from the browser dialog).
export function printHtml(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=880,height=720')
  if (!w) return
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    body{font-family:Segoe UI,system-ui,sans-serif;color:#111827;max-width:760px;margin:32px auto;padding:0 24px;line-height:1.55}
    h1{font-size:22px;border-bottom:2px solid #1c4d8c;padding-bottom:8px}
    h2{font-size:15px;color:#1c4d8c;margin-top:22px;text-transform:uppercase;letter-spacing:.06em}
    h3{font-size:13px;margin-top:16px}
    table{border-collapse:collapse;width:100%;font-size:12px;margin:10px 0}
    th,td{border:1px solid #e5e7eb;padding:5px 8px;text-align:left}
    th{background:#f3f4f6;font-weight:600}
    td.num{text-align:right;font-variant-numeric:tabular-nums}
    ul,ol{padding-left:20px}li{margin:3px 0}
    .kpis{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0}
    .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;min-width:130px}
    .kpi .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}
    .kpi .v{font-size:16px;font-weight:600}
    .muted{color:#6b7280;font-size:11px}
    @media print{body{margin:0}}
  </style></head><body>${bodyHtml}<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`)
  w.document.close()
}

// Full-vertical PDF: every analyzed statement (KPIs + insights + table).
export function exportVerticalPdf(verticalName: string, statements: BizStatement[]) {
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const parts: string[] = [`<h1>${esc(verticalName)} — Business overview</h1><p class="muted">Generated ${new Date().toLocaleString('en-IN')} · Velman OS</p>`]
  for (const s of statements) {
    const a = s.analysis
    parts.push(`<h2>${esc(typeLabel(s.type))}</h2>`)
    if (a.period) parts.push(`<p class="muted">Period: ${esc(a.period)} · Source: ${esc(s.fileName)}</p>`)
    parts.push(`<div class="kpis">${a.kpis.map((k) => `<div class="kpi"><div class="l">${esc(k.label)}</div><div class="v">${esc(k.value)}</div></div>`).join('')}</div>`)
    if (a.insights.length) parts.push(`<ul>${a.insights.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`)
    if (a.table.rows.length) {
      parts.push(`<table><thead><tr>${a.table.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${
        a.table.rows.slice(0, 40).map((r) => `<tr>${r.map((c) => `<td${typeof c === 'number' ? ' class="num"' : ''}>${typeof c === 'number' ? c.toLocaleString('en-IN') : esc(c)}</td>`).join('')}</tr>`).join('')
      }</tbody></table>`)
      if (a.table.rows.length > 40) parts.push(`<p class="muted">…and ${a.table.rows.length - 40} more rows (see the XLSX export for everything).</p>`)
    }
  }
  printHtml(`${verticalName} — Business overview`, parts.join('\n'))
}

export function exportReportPdf(report: BizReport, verticalName: string) {
  printHtml(`${verticalName} — ${report.label} report`, markdownToHtml(report.markdown))
}
