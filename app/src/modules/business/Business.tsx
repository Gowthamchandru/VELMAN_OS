// Business — its own pillar: per-vertical finance dashboards. Each of the nine
// statements accepts MULTIPLE uploads (monthly files, yearly files, …); the
// LOCAL agent (user's Claude subscription) analyzes each one, and the trend
// visualization merges every upload and re-buckets it Monthly / Quarterly /
// Half-yearly / Yearly on demand. Reports are asked for in plain text ("report
// for July 2026", "Q2", …) — the agent resolves the period, uses only data
// inside it, and the result exports to PDF.
import { useMemo, useRef, useState } from 'react'
import {
  Building2, Plus, Trash2, ArrowLeft, Upload, FileSpreadsheet, FileDown,
  Loader2, Sparkles, PieChart as PieIcon, TrendingUp, Lightbulb, Table2,
  FileText, ChevronRight, X, Download,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { Card, Stat, Empty } from '@/components/ui'
import { LockScreen } from '@/components/LockScreen'
import { useEphemeral, uid } from '@/lib/store'
import {
  STATEMENT_TYPES, typeLabel, useVerticals, useStatements, useReports, newVertical,
  parseWorkbook, analyzeStatement, generateReport, exportVerticalXlsx, exportVerticalPdf, exportReportPdf,
  markdownToHtml, mergeTrend, bucketTrend, GRANULARITIES, fyLabel, fyStartYear, recentFYs,
  saveOriginalFile, deleteOriginalFile, downloadUpload,
  type BizVertical, type BizStatement, type StatementTypeId, type StatementAnalysis, type Granularity,
} from './businessStore'

const PALETTE = ['#00d9ff', '#00ffa3', '#ffb020', '#ff2e63', '#c4b5fd', '#0891b2', '#f9a8d4', '#84cc16']
const TONE_COLOR = { good: '#00ffa3', bad: '#ff2e63', neutral: undefined } as const
const tooltipStyle = {
  background: 'var(--color-surface)', border: '2px solid var(--color-border)',
  borderRadius: 10, fontSize: 12, color: 'var(--color-ink)',
} as const

const inrTick = (v: number) =>
  Math.abs(v) >= 1e7 ? `${(v / 1e7).toFixed(1)}Cr` : Math.abs(v) >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(v)

// ---------------------------------------------------------------------------
// Merged trend across ALL uploads of a statement type, re-bucketed on demand.
// ---------------------------------------------------------------------------
const GRAN_LABEL: Record<Granularity, string> = { Monthly: 'Month', Quarterly: 'Quarter', 'Half-yearly': 'Half-year', Yearly: 'Year' }

function MergedTrendCard({ list }: { list: BizStatement[] }) {
  const [granularity, setGranularity] = useEphemeral<Granularity>('gcos.biz.granularity', 'Monthly')
  const [fy, setFy] = useEphemeral<number | null>('gcos.biz.fy', null)
  const merged = useMemo(() => mergeTrend(list), [list])
  const data = useMemo(() => bucketTrend(merged.points, granularity, fy), [merged, granularity, fy])
  const fys = recentFYs(5)
  if (!merged.points.length) return null
  const fysWithData = new Set(merged.points.map((p) => fyStartYear(p.month)))
  const select = 'rounded-[8px] border-2 border-border bg-surface px-2 py-1 text-[11px] font-semibold text-ink-muted outline-none focus:border-accent'
  return (
    <Card
      title="TREND"
      icon={TrendingUp}
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <select value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)} className={select} aria-label="View by period">
            {GRANULARITIES.map((g) => <option key={g} value={g}>{GRAN_LABEL[g]}</option>)}
          </select>
          <select value={fy === null ? 'all' : String(fy)} onChange={(e) => setFy(e.target.value === 'all' ? null : Number(e.target.value))} className={select} aria-label="Fiscal year">
            <option value="all">All years</option>
            {fys.map((y) => <option key={y} value={y}>{fyLabel(y)}{fysWithData.has(y) ? '' : ' — no data'}</option>)}
          </select>
        </div>
      }
    >
      {data.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border px-4 py-8 text-center text-sm text-ink-faint">
          Data for <b className="text-ink">{fy !== null ? fyLabel(fy) : 'this selection'}</b> is not available — upload statements covering
          {fy !== null ? ` Apr ${fy} – Mar ${fy + 1}` : ' that period'} and it will appear here.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="99%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }} tickFormatter={inrTick} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
              {merged.seriesNames.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {merged.seriesNames.map((name, i) => (
                <Bar key={name} isAnimationActive={false} dataKey={name} fill={i === 0 ? '#00d9ff' : '#ffb020'} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-ink-faint">
        Combined from {list.length} upload{list.length > 1 ? 's' : ''} · overlapping months use the newest upload · by {GRAN_LABEL[granularity].toLowerCase()} · {fy !== null ? fyLabel(fy) : 'all years'} (fiscal Apr–Mar)
      </p>
    </Card>
  )
}

// Snapshot parts of ONE upload: KPIs, composition, insights, table.
function SnapshotView({ a }: { a: StatementAnalysis }) {
  const hasPie = a.breakdown.length > 0
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {a.kpis.slice(0, 4).map((k) => (
          <Stat key={k.label} label={k.label} value={<span style={{ color: TONE_COLOR[k.tone ?? 'neutral'] }}>{k.value}</span>} />
        ))}
      </div>

      {hasPie && (
        <Card title="COMPOSITION" icon={PieIcon}>
          <div className="flex items-center gap-3">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={false} data={a.breakdown} dataKey="value" nameKey="name" innerRadius={44} outerRadius={76} paddingAngle={2} stroke="none">
                    {a.breakdown.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1 text-xs">
              {a.breakdown.map((b, i) => (
                <li key={b.name} className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="min-w-0 flex-1 truncate text-ink-muted">{b.name}</span>
                  <span className="shrink-0 tabular-nums text-ink-faint">₹{b.value.toLocaleString('en-IN')}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {a.insights.length > 0 && (
        <Card title="AGENT INSIGHTS" icon={Lightbulb}>
          <ul className="space-y-2">
            {a.insights.map((ins, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink-muted">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent/70" />
                <span className="leading-relaxed">{ins}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {a.table.rows.length > 0 && (
        <Card title={`DATA · ${a.table.rows.length} ROWS`} icon={Table2}>
          <div className="max-h-80 overflow-auto rounded-[10px] border-2 border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="text-left font-heading text-[10px] uppercase tracking-wide text-ink-faint">
                  {a.table.columns.map((c, i) => <th key={i} className="whitespace-nowrap px-2.5 py-2">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {a.table.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-2/60">
                    {r.map((c, j) => (
                      <td key={j} className={`whitespace-nowrap px-2.5 py-1.5 ${typeof c === 'number' ? 'text-right tabular-nums text-ink' : 'text-ink-muted'}`}>
                        {typeof c === 'number' ? c.toLocaleString('en-IN') : String(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// Small markdown renderer for on-screen report display.
function ReportMarkdown({ md }: { md: string }) {
  return <div className="report-md text-sm leading-relaxed text-ink-muted" dangerouslySetInnerHTML={{ __html: markdownToHtml(md) }} />
}

// ---------------------------------------------------------------------------
// Vertical dashboard
// ---------------------------------------------------------------------------
function VerticalDashboard({ vertical, onBack }: { vertical: BizVertical; onBack: () => void }) {
  const statements = useStatements()
  const reports = useReports()
  const [selectedType, setSelectedType] = useEphemeral<StatementTypeId>('gcos.biz.selectedType', 'pnl')
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reportAsk, setReportAsk] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [reportError, setReportError] = useState('')
  const [openReportId, setOpenReportId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingTypeRef = useRef<StatementTypeId | null>(null)

  const mine = useMemo(() => statements.items.filter((s) => s.verticalId === vertical.id), [statements.items, vertical.id])
  const listByType = useMemo(() => {
    const m: Record<string, BizStatement[]> = {}
    for (const s of mine) (m[s.type] ??= []).push(s)
    for (const l of Object.values(m)) l.sort((a, b) => b.uploadedAt - a.uploadedAt)
    return m
  }, [mine])
  const myReports = useMemo(() => reports.items.filter((r) => r.verticalId === vertical.id).sort((a, b) => b.generatedAt - a.generatedAt), [reports.items, vertical.id])

  const list = listByType[selectedType] ?? []
  // Active upload for the snapshot cards: explicit pick, else the newest.
  const active = list.find((s) => s.id === activeUploadId) ?? list[0]
  const typesWithData = Object.keys(listByType).length

  const pickFile = (type: StatementTypeId) => {
    pendingTypeRef.current = type
    fileInputRef.current?.click()
  }

  const onFile = async (file: File | undefined) => {
    const type = pendingTypeRef.current
    if (!file || !type) return
    setErrors((e) => ({ ...e, [type]: '' }))
    setBusy((b) => ({ ...b, [type]: true }))
    setSelectedType(type)
    try {
      const sheets = await parseWorkbook(file)
      const analysis = await analyzeStatement(vertical.name, type, file.name, sheets)
      const rec: BizStatement = { id: uid(), verticalId: vertical.id, type, fileName: file.name, uploadedAt: Date.now(), analysis }
      void saveOriginalFile(rec.id, file) // keep the exact file for later download
      statements.add(rec) // appended — every upload is kept
      setActiveUploadId(rec.id)
    } catch (e) {
      setErrors((err) => ({ ...err, [type]: e instanceof Error ? e.message : 'Analysis failed.' }))
    } finally {
      setBusy((b) => ({ ...b, [type]: false }))
      if (fileInputRef.current) fileInputRef.current.value = '' // ready for the next upload
    }
  }

  const runReport = async () => {
    const ask = reportAsk.trim()
    if (!ask || !mine.length || reportBusy) return
    setReportError('')
    setReportBusy(true)
    try {
      const md = await generateReport(vertical.name, ask, mine.map((s) => ({ type: s.type, analysis: s.analysis })))
      const rec = { id: uid(), verticalId: vertical.id, label: ask, generatedAt: Date.now(), markdown: md }
      reports.add(rec)
      setOpenReportId(rec.id)
      setReportAsk('')
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Report generation failed.')
    } finally {
      setReportBusy(false)
    }
  }

  const openReport = myReports.find((r) => r.id === openReportId) ?? null

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="grid size-9 place-items-center rounded-[10px] border-2 border-border text-ink-muted hover:border-brand-border hover:text-ink" aria-label="back to verticals"><ArrowLeft size={16} /></button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold normal-case tracking-normal text-ink" style={{ fontFamily: 'var(--font-sans)' }}>{vertical.name}</h2>
          <p className="text-xs text-ink-muted">{typesWithData} of {STATEMENT_TYPES.length} statements have data · {mine.length} upload{mine.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={() => exportVerticalXlsx(vertical.name, mine)}
          disabled={!mine.length}
          className="flex items-center gap-1.5 rounded-[10px] border-2 border-border px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:border-brand-border hover:text-ink disabled:opacity-40"
        >
          <FileSpreadsheet size={13} /> XLSX
        </button>
        <button
          onClick={() => exportVerticalPdf(vertical.name, mine)}
          disabled={!mine.length}
          className="flex items-center gap-1.5 rounded-[10px] border-2 border-border px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:border-brand-border hover:text-ink disabled:opacity-40"
        >
          <FileDown size={13} /> PDF
        </button>
      </div>

      {/* Statement tiles */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
        {STATEMENT_TYPES.map((t) => {
          const l = listByType[t.id] ?? []
          const active_ = selectedType === t.id
          const loading = busy[t.id]
          return (
            <button
              key={t.id}
              onClick={() => (l.length || loading ? setSelectedType(t.id) : pickFile(t.id))}
              className={`rounded-xl border-2 p-3 text-left transition-colors ${active_ ? 'border-accent bg-accent-soft/60' : 'border-border bg-surface hover:border-brand-border'}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[11px] font-bold leading-tight ${active_ ? 'text-accent' : 'text-ink'}`}>{t.label}</span>
                {loading ? <Loader2 size={13} className="shrink-0 animate-spin text-accent" /> : l.length ? <span className="shrink-0 rounded-full bg-online/15 px-1.5 text-[10px] font-bold tabular-nums text-online">{l.length}</span> : <Upload size={12} className="shrink-0 text-ink-faint" />}
              </div>
              <div className="mt-1 truncate text-[10px] text-ink-faint">
                {loading ? 'Agent analyzing…' : l.length ? `${l.length} upload${l.length > 1 ? 's' : ''}${l[0].analysis.period ? ` · latest: ${l[0].analysis.period}` : ''}` : 'Upload .xlsx'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected statement */}
      <Card
        title={typeLabel(selectedType).toUpperCase()}
        icon={Sparkles}
        action={
          <button onClick={() => pickFile(selectedType)} disabled={busy[selectedType]} className="flex items-center gap-1.5 rounded-[8px] bg-accent px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-40">
            <Plus size={12} /> Add data
          </button>
        }
      >
        {errors[selectedType] && <div className="mb-3 rounded-[10px] border-2 border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">{errors[selectedType]}</div>}

        {/* Upload chips — every dataset stays; click to inspect, x to remove */}
        {list.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {list.map((s) => {
              const isActive = active?.id === s.id
              return (
                <span key={s.id} className={`flex items-center gap-0.5 rounded-[10px] border-2 px-1 py-0.5 ${isActive ? 'border-accent bg-accent-soft/60' : 'border-border'}`}>
                  <button onClick={() => setActiveUploadId(s.id)} title={s.fileName} className={`px-1.5 py-0.5 text-[11px] font-semibold ${isActive ? 'text-accent' : 'text-ink-muted hover:text-ink'}`}>
                    {s.analysis.period || s.fileName}
                  </button>
                  <button onClick={() => downloadUpload(s)} title={`Download ${s.fileName}`} className="grid size-4 place-items-center rounded text-ink-faint hover:text-accent"><Download size={11} /></button>
                  <button onClick={() => { statements.remove(s.id); void deleteOriginalFile(s.id); if (activeUploadId === s.id) setActiveUploadId(null) }} title="Remove this upload" className="grid size-4 place-items-center rounded text-ink-faint hover:text-danger"><X size={11} /></button>
                </span>
              )
            })}
            {busy[selectedType] && <span className="flex items-center gap-1.5 px-2 text-[11px] text-ink-faint"><Loader2 size={11} className="animate-spin text-accent" /> analyzing…</span>}
          </div>
        )}

        {busy[selectedType] && !list.length ? (
          <div className="flex items-center gap-2.5 py-8 text-sm text-ink-muted">
            <Loader2 size={16} className="animate-spin text-accent" /> The agent is reading and analyzing the spreadsheet…
          </div>
        ) : list.length ? (
          <div className="space-y-4">
            <MergedTrendCard list={list} />
            {active && (
              <>
                <div className="flex items-center gap-2 text-[11px] text-ink-faint">
                  <span className="font-heading font-bold uppercase tracking-wide">Showing:</span>
                  {active.analysis.period || active.fileName} · uploaded {new Date(active.uploadedAt).toLocaleDateString('en-IN')}
                  <button onClick={() => downloadUpload(active)} className="flex items-center gap-1 font-semibold text-accent hover:underline"><Download size={11} /> download this file</button>
                </div>
                <SnapshotView a={active.analysis} />
              </>
            )}
          </div>
        ) : (
          <Empty>
            No data yet — <button onClick={() => pickFile(selectedType)} className="font-semibold text-accent hover:underline">upload the {typeLabel(selectedType)} .xlsx</button> and the agent will analyze and visualize it. Add month after month; every upload is kept.
          </Empty>
        )}
      </Card>

      {/* Reports — ask in plain text, agent resolves the period */}
      <Card title="AGENT REPORTS" icon={FileText}>
        {reportError && <div className="mb-3 rounded-[10px] border-2 border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">{reportError}</div>}
        <div className={`flex items-center gap-1.5 rounded-2xl border-2 p-1.5 transition-all ${!mine.length ? 'opacity-50' : 'border-border focus-within:border-accent focus-within:brand-glow'}`}>
          <input
            value={reportAsk}
            onChange={(e) => setReportAsk(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runReport()}
            placeholder='Ask for a period — e.g. "report for July 2026" · "Q2 2026" · "first half of 2026" · "FY 2025-26"'
            disabled={!mine.length || reportBusy}
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            onClick={runReport}
            disabled={!mine.length || reportBusy || !reportAsk.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-faint"
          >
            {reportBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {!mine.length && <p className="text-sm text-ink-faint">Upload at least one statement first — then ask for any month, quarter, half-year or year.</p>}
          {reportBusy && <div className="flex items-center gap-2.5 text-sm text-ink-muted"><Loader2 size={15} className="animate-spin text-accent" /> Resolving the period and writing the report from {mine.length} upload{mine.length > 1 ? 's' : ''}…</div>}
          {myReports.map((r) => (
            <div key={r.id} className="rounded-xl border-2 border-border">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button onClick={() => setOpenReportId(openReportId === r.id ? null : r.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronRight size={14} className={`shrink-0 text-ink-faint transition-transform ${openReportId === r.id ? 'rotate-90' : ''}`} />
                  <span className="truncate text-sm font-semibold text-ink">{r.label}</span>
                  <span className="hidden shrink-0 text-[11px] text-ink-faint sm:inline">{new Date(r.generatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </button>
                <button onClick={() => exportReportPdf(r, vertical.name)} title="Export PDF" className="grid size-7 place-items-center rounded-lg text-ink-faint hover:bg-surface-2 hover:text-accent"><FileDown size={14} /></button>
                <button onClick={() => { if (openReportId === r.id) setOpenReportId(null); reports.remove(r.id) }} title="Delete" className="grid size-7 place-items-center rounded-lg text-ink-faint hover:bg-surface-2 hover:text-danger"><Trash2 size={13} /></button>
              </div>
              {openReport?.id === r.id && (
                <div className="border-t-2 border-border px-4 py-3">
                  <ReportMarkdown md={r.markdown} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Verticals home
// ---------------------------------------------------------------------------
export default function Business() {
  const verticals = useVerticals()
  const statements = useStatements()
  const reports = useReports()
  const [selectedId, setSelectedId] = useEphemeral<string | null>('gcos.biz.selectedVertical', null)
  const [name, setName] = useState('')

  const selected = verticals.items.find((v) => v.id === selectedId)

  const addVertical = () => {
    const n = name.trim()
    if (!n) return
    const v = newVertical(n)
    verticals.add(v)
    setName('')
    setSelectedId(v.id)
  }

  const removeVertical = (v: BizVertical) => {
    verticals.remove(v.id)
    statements.items.filter((s) => s.verticalId === v.id).forEach((s) => { statements.remove(s.id); void deleteOriginalFile(s.id) })
    reports.items.filter((r) => r.verticalId === v.id).forEach((r) => reports.remove(r.id))
  }

  return (
    <LockScreen id="business" label="Business">
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Building2 size={20} /></div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Business</h1>
          <p className="text-sm text-ink-muted">Your verticals — statements, agent analysis &amp; reports.</p>
        </div>
      </div>

      {selected ? (
        <VerticalDashboard vertical={selected} onBack={() => setSelectedId(null)} />
      ) : (
      <>
      <Card title="ADD A BUSINESS VERTICAL" icon={Building2}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addVertical()}
            placeholder="e.g. Interiors, Restaurant, School…"
            className="min-w-[14rem] flex-1 rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <button onClick={addVertical} disabled={!name.trim()} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-40">
            <Plus size={14} /> Add vertical
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">Each vertical gets its own dashboard: upload balance sheet, P&amp;L, cashflow &amp; more as .xlsx — month after month — and the agent analyzes, visualizes, and writes period reports on demand.</p>
      </Card>

      {!verticals.items.length ? (
        <Empty>No verticals yet — add your first business above.</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {verticals.items.map((v) => {
            const uploads = statements.items.filter((s) => s.verticalId === v.id)
            const types = new Set(uploads.map((s) => s.type)).size
            const last = [...uploads].sort((a, b) => b.uploadedAt - a.uploadedAt)[0]
            return (
              <div key={v.id} className="group rounded-2xl border-2 border-border bg-surface p-4 transition-colors hover:border-brand-border">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setSelectedId(v.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Building2 size={18} /></div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink group-hover:text-accent">{v.name}</div>
                      <div className="text-[11px] text-ink-faint">
                        {uploads.length ? `${types}/${STATEMENT_TYPES.length} statements · ${uploads.length} uploads · ${new Date(last!.uploadedAt).toLocaleDateString('en-IN')}` : 'No data yet — open to upload'}
                      </div>
                    </div>
                  </button>
                  <button onClick={() => removeVertical(v)} title="Delete vertical" className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"><Trash2 size={14} /></button>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(types / STATEMENT_TYPES.length) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>
      )}
    </div>
    </LockScreen>
  )
}
