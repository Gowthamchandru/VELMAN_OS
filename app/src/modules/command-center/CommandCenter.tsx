import { useState, useRef, useEffect, Fragment } from 'react'
import { useNow, minutesOfDay, parseTimeToMinutes, clockLabel, greeting, todayKey, prettyDate } from '@/lib/time'
import { Card, Stat } from '@/components/ui'
import { categoryColor, timeByCategory, getCategories } from '@/lib/data'
import {
  usePriorities,
  useTodos,
  useAgenda,
  useGratitude,
  useReflection,
  previousAgenda,
  newPriority,
  newTodo,
  newAgendaBlock,
  type AgendaBlock,
} from '@/modules/planner/plannerStore'
import { useLoops, displayStatus } from '@/modules/loops/loopsStore'
import { useDocs, expiryStatus, expiryLabel } from '@/modules/vault/vaultStore'
import { useSubs, dueStatus as subDueStatus, dueLabel as subDueLabel } from '@/modules/subs/subsStore'
import { uid } from '@/lib/store'
import { useServerHealth, useLastBrief, useGcSnapshot, generateBrief, type BriefMode } from '@/lib/ai'
import { useMeetings, type Meeting } from '@/modules/work/deptStore'
import { Sparkles, CalendarClock, ListChecks, Flag, PieChart, Sun, Plus, Loader2, Server, Moon, Star, X, AlertTriangle, Copy, Video } from 'lucide-react'
import { modules } from '@/shell/registry'

function renderBrief(text: string) {
  return text.split('\n').filter((l) => l.trim() !== '').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**') ? <strong key={j} className="text-ink">{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>,
    )
    return <p key={i} className="mb-1 leading-relaxed">{parts}</p>
  })
}

function Check({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="toggle done"
      className={`grid size-4 shrink-0 place-items-center rounded border-2 text-[10px] ${
        done ? 'border-accent bg-accent/20 text-accent' : 'border-border text-transparent hover:border-accent'
      }`}
    >
      ✓
    </button>
  )
}

function AddRow({ value, onChange, onAdd, placeholder }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-[10px] border-2 border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
      />
      <button onClick={onAdd} aria-label="add" className="grid size-7 shrink-0 place-items-center rounded-[10px] bg-accent text-white hover:opacity-90">
        <Plus size={14} />
      </button>
    </div>
  )
}

// A textarea that grows to fit its content — never shows an inner scrollbar.
function AutoTextarea({ value, onChange, placeholder, className, rows = 1 }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    // scrollHeight excludes borders; add them back so border-box sizing doesn't clip.
    const borderY = el.offsetHeight - el.clientHeight
    el.style.height = `${el.scrollHeight + borderY}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`resize-none overflow-hidden ${className ?? ''}`}
    />
  )
}

function DailyBrief() {
  const date = todayKey()
  const { items: agenda } = useAgenda(date)
  const { items: priorities } = usePriorities()
  const { items: todos } = useTodos(date)
  const scheduled = agenda.filter((a) => a.task)
  const firstTask = sortedBlocks(scheduled)[0]
  const openTodos = todos.filter((t) => !t.done).length

  const health = useServerHealth()
  const [brief, setBrief] = useLastBrief()
  const snapshot = useGcSnapshot(date)
  const [loading, setLoading] = useState<BriefMode | null>(null)
  const [error, setError] = useState('')

  const run = async (mode: BriefMode) => {
    setError('')
    setLoading(mode)
    try {
      setBrief(await generateBrief(snapshot, mode))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate — is the assistant server running?')
    } finally {
      setLoading(null)
    }
  }

  const btn = 'flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 font-heading text-[10px] font-bold uppercase tracking-[0.12em] disabled:opacity-50'

  return (
    <Card className="bg-accent-soft/40">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-ink-faint">AI daily brief · {prettyDate(date)}</div>
          <p className="mt-0.5 text-sm leading-snug text-ink">
            {scheduled.length > 0 ? (
              <>You have <b>{scheduled.length}</b> things scheduled{firstTask && (<> — first up <b>{firstTask.task}</b> at {firstTask.time}</>)}. </>
            ) : (
              <>Nothing scheduled yet. </>
            )}
            <b>{openTodos}</b> to-dos still open and <b>{priorities.filter((p) => !p.done).length}</b> weekly priorities left.
          </p>

          {!health.online ? (
            <div className="mt-2 rounded-xl border-2 border-dashed border-border p-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-muted"><Server size={13} /> {health.checking ? 'Connecting to your assistant…' : 'Start the assistant to generate a real brief'}</div>
              <p className="text-[11px] text-ink-faint">Runs on your machine using your <b className="text-ink">Claude Pro</b> plan — <code className="font-mono">npm run dev:all</code>. Only a structured snapshot of your day is sent to Claude, never raw records.</p>
            </div>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => run('morning')} disabled={loading !== null} className={`${btn} bg-accent text-white hover:opacity-90`}>
                  {loading === 'morning' ? <Loader2 size={13} className="animate-spin" /> : <Sun size={13} />} Morning brief
                </button>
                <button onClick={() => run('evening')} disabled={loading !== null} className={`${btn} border-2 border-border text-ink-muted hover:text-accent`}>
                  {loading === 'evening' ? <Loader2 size={13} className="animate-spin" /> : <Moon size={13} />} End-of-day wrap
                </button>
                <span className="ml-auto flex items-center gap-1 text-[11px] text-ink-faint" title={`Answered on your Claude ${health.mode === 'subscription' ? 'Pro plan' : 'credentials'}`}>
                  <span className="dot-online size-1.5 rounded-full bg-online" /> {health.mode === 'subscription' ? 'Claude Pro' : health.model ?? 'connected'}
                </span>
              </div>
              {error && <div className="mt-2 rounded-[10px] border-2 border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</div>}
              {loading && !brief && <div className="mt-3 text-sm text-ink-faint">Claude is reading your day…</div>}
              {brief && <div className="mt-3 rounded-xl border-2 border-border bg-surface p-3 text-sm text-ink-muted">{renderBrief(brief)}</div>}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

function Ring({ pct, size = 46 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-accent)" strokeWidth={5} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  )
}

// Sort agenda blocks by start time; unparseable times sink to the bottom.
function sortedBlocks(items: AgendaBlock[]) {
  return items
    .map((b) => ({ ...b, startMin: parseTimeToMinutes(b.time) }))
    .sort((a, b) => (a.startMin ?? 1e9) - (b.startMin ?? 1e9))
}
function currentIndex(blocks: { startMin: number | null }[], nowMin: number) {
  let idx = -1
  blocks.forEach((b, i) => {
    if (b.startMin != null && b.startMin <= nowMin) idx = i
  })
  return idx
}

function DayProgress() {
  const date = todayKey()
  const { items } = useAgenda(date)
  const now = useNow()
  const isToday = date === todayKey()
  const blocks = sortedBlocks(items)
  const cur = isToday ? currentIndex(blocks, minutesOfDay(now)) : -1
  const done = blocks.filter((b, i) => b.done || (isToday && i < cur)).length
  const pct = blocks.length ? Math.round((done / blocks.length) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid place-items-center">
        <Ring pct={pct} />
        <span className="absolute font-mono text-[11px] font-semibold text-ink">{pct}%</span>
      </div>
      <div className="leading-tight">
        <div className="font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Day progress</div>
        <div className="text-sm text-ink">{done}/{blocks.length} blocks</div>
      </div>
    </div>
  )
}

function NowLine({ now }: { now: Date }) {
  return (
    <li className="flex items-center gap-2 py-0.5" aria-hidden>
      <span className="w-16 shrink-0 text-right font-mono text-[10px] font-medium text-accent">{clockLabel(now)}</span>
      <span className="size-1.5 shrink-0 rounded-full bg-accent" />
      <span className="h-px flex-1 bg-accent" />
    </li>
  )
}

// Compact category control: a colored dot (the category's color) that opens a
// native picker on click. Keeps editing + colour-coding without eating row width.
function CategoryChip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative grid size-5 shrink-0 place-items-center" title={value}>
      <span className="size-2.5 rounded-full" style={{ background: categoryColor(value) }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="category"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {getCategories().map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}

function AgendaRow({ block, status, onUpdate, onRemove }: {
  block: AgendaBlock
  status: 'past' | 'now' | 'next'
  onUpdate: (patch: Partial<AgendaBlock>) => void
  onRemove: () => void
}) {
  const elapsed = status === 'past' || block.done
  return (
    <li className={`group flex items-center gap-2 rounded-[10px] px-1.5 py-[3px] ${status === 'now' ? 'bg-accent-soft' : ''}`}>
      <Check done={block.done} onClick={() => onUpdate({ done: !block.done })} />
      <input
        value={block.time}
        onChange={(e) => onUpdate({ time: e.target.value })}
        className="w-20 shrink-0 rounded bg-transparent text-right text-xs tabular-nums text-ink-faint outline-none focus:bg-surface-2 focus:text-ink"
      />
      <span className="mt-0.5 h-5 w-1 shrink-0 self-start rounded-full" style={{ background: elapsed ? '#059669' : categoryColor(block.category) }} />
      <AutoTextarea
        value={block.task}
        onChange={(v) => onUpdate({ task: v })}
        className={`min-w-0 flex-1 rounded bg-transparent text-sm leading-snug outline-none focus:bg-surface-2 ${status === 'now' ? 'font-medium text-ink' : 'text-ink'}`}
      />
      {status === 'now' && (
        <span className="shrink-0 rounded-[8px] bg-accent px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase tracking-[0.1em] text-white">Now</span>
      )}
      <CategoryChip value={block.category} onChange={(v) => onUpdate({ category: v })} />
      <button onClick={onRemove} aria-label="remove block" className="shrink-0 text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger">
        <X size={13} />
      </button>
    </li>
  )
}

function MeetingAgendaRow({ m }: { m: Meeting }) {
  const label = [m.companyName, m.department].filter(Boolean).join(' · ')
  return (
    <li className="flex items-center gap-2 rounded-[10px] border border-warn/25 bg-warn/5 px-1.5 py-[3px]">
      <Video size={13} className="shrink-0 text-warn" />
      <span className="w-20 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-faint">{m.time}</span>
      <span className="mt-0.5 h-5 w-1 shrink-0 self-start rounded-full bg-warn" />
      <span className="min-w-0 flex-1 text-sm text-ink">{m.title}</span>
      <span className="shrink-0 rounded-[6px] bg-warn/15 px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase tracking-wide text-warn">Meeting</span>
      {label && <span className="max-w-[120px] shrink-0 truncate text-[10px] text-ink-faint">{label}</span>}
    </li>
  )
}

function AgendaTimeline() {
  const date = todayKey()
  const { items, add, update, remove } = useAgenda(date)
  const { items: allMeetings } = useMeetings()
  const todayMeetings = allMeetings.filter((m) => m.date === date)

  const now = useNow()
  const isToday = date === todayKey()
  const nowMin = minutesOfDay(now)
  const blocks = sortedBlocks(items)
  const cur = isToday ? currentIndex(blocks, nowMin) : -1
  const current = cur >= 0 ? blocks[cur] : null
  const next = blocks[cur + 1] ?? null
  const prev = blocks.length === 0 ? previousAgenda(date) : []

  // Merge agenda blocks and meetings into a single sorted timeline
  type TItem =
    | { kind: 'block'; startMin: number; idx: number; b: (typeof blocks)[0] }
    | { kind: 'meeting'; startMin: number; m: Meeting }

  const merged: TItem[] = [
    ...blocks.map((b, idx) => ({ kind: 'block' as const, startMin: b.startMin ?? 1e9, idx, b })),
    ...todayMeetings.map((m) => ({ kind: 'meeting' as const, startMin: parseTimeToMinutes(m.time) ?? 1e9, m })),
  ].sort((a, b) => a.startMin - b.startMin)

  const [time, setTime] = useState('')
  const [task, setTask] = useState('')
  const addBlock = () => {
    const t = task.trim()
    if (!t) return
    add({ ...newAgendaBlock(time.trim() || (isToday ? clockLabel(now) : '9:00 AM')), task: t })
    setTime('')
    setTask('')
  }

  return (
    <Card
      title="Today's agenda"
      icon={CalendarClock}
      action={
        isToday ? (
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
            <span className="dot-online size-1.5 rounded-full bg-online" /> {clockLabel(now)}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-ink-faint">{blocks.length} block{blocks.length === 1 ? '' : 's'}</span>
        )
      }
    >
      {isToday && blocks.length > 0 && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-ink-faint">
          <span className="min-w-0 truncate">{current ? <>Now · <b className="text-ink">{current.task}</b></> : 'Day not started'}</span>
          <span className="shrink-0">{next ? <>Next · {next.task} at {next.time}</> : 'Last block'}</span>
        </div>
      )}
      {merged.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm text-ink-faint">No blocks yet — plan {isToday ? 'today' : 'this day'} below.</p>
          {prev.length > 0 && (
            <button onClick={() => prev.forEach(add)} className="mt-2 inline-flex items-center gap-1.5 rounded-[10px] border-2 border-border px-2.5 py-1 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:text-accent">
              <Copy size={12} /> Copy previous day ({prev.length})
            </button>
          )}
        </div>
      ) : (
        <ol className="space-y-0">
          {isToday && cur < 0 && <NowLine now={now} />}
          {merged.map((item) =>
            item.kind === 'meeting' ? (
              <MeetingAgendaRow key={item.m.id} m={item.m} />
            ) : (
              <Fragment key={item.b.id}>
                <AgendaRow
                  block={item.b}
                  status={!isToday ? 'next' : item.idx < cur ? 'past' : item.idx === cur ? 'now' : 'next'}
                  onUpdate={(patch) => update(item.b.id, patch)}
                  onRemove={() => remove(item.b.id)}
                />
                {isToday && item.idx === cur && <NowLine now={now} />}
              </Fragment>
            )
          )}
        </ol>
      )}
      <div className="mt-2 flex items-center gap-2 border-t-2 border-border px-1.5 pt-2">
        <span className="size-4 shrink-0" aria-hidden />
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addBlock()}
          placeholder="9:00 AM"
          className="w-20 shrink-0 rounded-[10px] border-2 border-border bg-surface px-2 py-1 text-right text-xs tabular-nums text-ink outline-none focus:border-accent"
        />
        <span className="w-1 shrink-0" aria-hidden />
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addBlock()}
          placeholder="Add a block…"
          className="min-w-0 flex-1 rounded-[10px] border-2 border-border bg-surface px-2.5 py-1 text-sm text-ink outline-none focus:border-accent"
        />
        <button onClick={addBlock} aria-label="add block" className="grid size-6 shrink-0 place-items-center rounded-[10px] bg-accent text-white hover:opacity-90">
          <Plus size={14} />
        </button>
      </div>
    </Card>
  )
}

function NeedsYouToday() {
  const { items: todos } = useTodos(todayKey())
  const { items: loops } = useLoops()
  const { items: docs } = useDocs()
  const { items: subs } = useSubs()
  const chips = [
    ...todos.filter((t) => t.mit && !t.done).map((t) => ({ key: t.id, label: t.task, tag: 'MIT', tone: 'accent' as const })),
    ...loops
      .map((l) => ({ l, s: displayStatus(l) }))
      .filter(({ s }) => s === 'overdue' || s === 'waiting')
      .map(({ l, s }) => ({ key: l.id, label: l.title, tag: s, tone: s === 'overdue' ? ('danger' as const) : ('warn' as const) })),
    ...docs
      .map((d) => ({ d, s: expiryStatus(d) }))
      .filter(({ s }) => s === 'soon' || s === 'overdue')
      .map(({ d, s }) => ({ key: d.id, label: `${d.name} — ${expiryLabel(d)}`, tag: 'renew', tone: s === 'overdue' ? ('danger' as const) : ('warn' as const) })),
    ...subs
      .map((sub) => ({ sub, s: subDueStatus(sub) }))
      .filter(({ s }) => s === 'soon' || s === 'overdue')
      .map(({ sub, s }) => ({ key: sub.id, label: `${sub.name} — ${subDueLabel(sub)}`, tag: 'pay', tone: s === 'overdue' ? ('danger' as const) : ('warn' as const) })),
  ]
  if (!chips.length) return null
  const toneColor = (t: string) => (t === 'danger' ? '#d93a2b' : t === 'warn' ? '#d97706' : 'var(--color-accent)')
  return (
    <Card className="border-l-4 border-l-accent py-2.5!">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex shrink-0 items-center gap-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
          <AlertTriangle size={13} className="text-accent" /> Needs you today
        </span>
        {chips.map((c) => (
          <span key={c.key} className="flex items-center gap-1.5 rounded-full border-2 border-border bg-surface px-2.5 py-1 text-xs text-ink">
            <span
              className="rounded px-1 py-0.5 font-heading text-[8px] font-bold uppercase tracking-wide"
              style={{ color: toneColor(c.tone), background: c.tone === 'accent' ? 'var(--color-accent-soft)' : toneColor(c.tone) + '22' }}
            >
              {c.tag}
            </span>
            {c.label}
          </span>
        ))}
      </div>
    </Card>
  )
}

function Priorities() {
  const { items, update, add, remove } = usePriorities()
  const [text, setText] = useState('')
  const submit = () => {
    const t = text.trim()
    if (!t) return
    add(newPriority(t))
    setText('')
  }
  return (
    <Card title="This week's priorities" icon={Flag}>
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id} className="group flex items-center gap-2.5 text-sm">
            <Check done={p.done} onClick={() => update(p.id, { done: !p.done })} />
            <span className={`min-w-0 flex-1 ${p.done ? 'text-ink-faint line-through' : 'text-ink'}`}>{p.text}</span>
            <button onClick={() => remove(p.id)} aria-label="remove" className="shrink-0 text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger">×</button>
          </li>
        ))}
      </ul>
      <AddRow value={text} onChange={setText} onAdd={submit} placeholder="Add a priority…" />
    </Card>
  )
}

function Todos() {
  const date = todayKey()
  const { items, update, add, remove } = useTodos(date)
  const [text, setText] = useState('')
  const submit = () => {
    const t = text.trim()
    if (!t) return
    add(newTodo(t))
    setText('')
  }
  // MITs (not done) float to the top.
  const sorted = [...items].sort((a, b) => Number(!!b.mit && !b.done) - Number(!!a.mit && !a.done))
  const mitCount = items.filter((t) => t.mit && !t.done).length
  return (
    <Card
      title="To-dos today"
      icon={ListChecks}
      action={mitCount > 0 ? <span className="flex items-center gap-1 text-[11px] text-amber-600"><Star size={11} className="fill-current" /> {mitCount} MIT</span> : undefined}
    >
      <ul className="space-y-2">
        {sorted.map((t) => (
          <li key={t.id} className="group flex items-center gap-2 text-sm">
            <Check done={t.done} onClick={() => update(t.id, { done: !t.done })} />
            <button onClick={() => update(t.id, { mit: !t.mit })} aria-label="mark most important" title="Most Important Task" className="shrink-0">
              <Star size={14} className={t.mit ? 'fill-current text-amber-500' : 'text-ink-faint hover:text-amber-500'} />
            </button>
            <span className={`min-w-0 flex-1 ${t.done ? 'text-ink-faint line-through' : 'text-ink'}`}>{t.task}</span>
            <button onClick={() => remove(t.id)} aria-label="remove" className="shrink-0 text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger">×</button>
          </li>
        ))}
      </ul>
      <AddRow value={text} onChange={setText} onAdd={submit} placeholder="Add a to-do…" />
    </Card>
  )
}

// Distribute today's agenda minutes by category — each block runs until the next.
function todayByCategory(blocks: { category: string; startMin: number | null }[]) {
  const sorted = blocks.filter((b) => b.startMin != null).sort((a, b) => a.startMin! - b.startMin!)
  const totals = new Map<string, number>()
  sorted.forEach((b, i) => {
    const nxt = sorted[i + 1]?.startMin
    const dur = nxt != null ? Math.min(Math.max(nxt - b.startMin!, 0), 180) : 30
    totals.set(b.category, (totals.get(b.category) ?? 0) + dur)
  })
  return [...totals.entries()].map(([name, minutes]) => ({ name, minutes, hex: categoryColor(name) })).sort((a, b) => b.minutes - a.minutes)
}

function TimeByCategory() {
  const [view, setView] = useState<'today' | 'week'>('today')
  const date = todayKey()
  const { items } = useAgenda(date)
  const today = todayByCategory(items.map((b) => ({ category: b.category, startMin: parseTimeToMinutes(b.time) })))
  const data = view === 'today' ? today : timeByCategory()
  const max = Math.max(...data.map((d) => d.minutes), 1)
  return (
    <Card
      title="Time by category"
      icon={PieChart}
      className="lg:col-span-3"
      action={
        <div className="flex rounded-[8px] border-2 border-border p-0.5 font-heading text-[10px] font-bold uppercase tracking-wide">
          {(['today', 'week'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded px-2 py-0.5 ${view === v ? 'bg-accent text-white' : 'text-ink-faint hover:text-ink'}`}>{v === 'today' ? 'Day' : 'Week'}</button>
          ))}
        </div>
      }
    >
      {data.length === 0 ? (
        <p className="py-2 text-sm text-ink-faint">No blocks scheduled yet.</p>
      ) : (
        <div className="space-y-2">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-ink-muted">{d.name}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-surface-2">
                <div className="h-full rounded" style={{ width: `${(d.minutes / max) * 100}%`, background: d.hex }} />
              </div>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-faint">{(d.minutes / 60).toFixed(1)}h</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Gratitude lines derived from today's live dashboard data — editable suggestions.
function suggestGratitude(s: ReturnType<typeof useGcSnapshot>): string[] {
  const out: string[] = []
  const wins = [
    ...s.weeklyPriorities.filter((p) => p.done).map((p) => p.text),
    ...s.todos.filter((t) => t.done).map((t) => t.task),
  ]
  if (wins[0]) out.push(`Grateful I made progress on “${wins[0]}”.`)
  if (wins[1]) out.push(`Grateful I also got “${wins[1]}” done today.`)
  if (s.habits.consistencyPct >= 50) out.push(`Grateful for staying consistent — ${s.habits.consistencyPct}% of my habits this week.`)
  if (s.work.done > 0) out.push(`Grateful for shipping ${s.work.done} work task${s.work.done > 1 ? 's' : ''}.`)
  if (s.finance.portfolioROIpct > 0) out.push(`Grateful my portfolio is up ${s.finance.portfolioROIpct}%.`)
  if (!out.length) out.push('Grateful for a fresh day and the chance to make it count.')
  return out.slice(0, 3)
}

function Reflection() {
  const date = todayKey()
  const { items: gratitude, update, add, remove } = useGratitude(date)
  const [reflection, setReflection] = useReflection(date)
  const snapshot = useGcSnapshot(date)
  const [g, setG] = useState('')
  const addG = () => {
    const t = g.trim()
    if (!t) return
    add({ id: uid(), text: t })
    setG('')
  }
  const suggest = () => {
    const seen = new Set(gratitude.map((l) => l.text.trim().toLowerCase()))
    for (const text of suggestGratitude(snapshot)) {
      const key = text.trim().toLowerCase()
      if (!seen.has(key)) {
        add({ id: uid(), text })
        seen.add(key)
      }
    }
  }
  return (
    <Card title="Gratitude & reflection" icon={Sun} className="lg:col-span-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-ink-faint">Grateful for</span>
            <button onClick={suggest} className="flex items-center gap-1 text-[11px] text-accent hover:opacity-80" title="Generate gratitude from today's wins">
              <Sparkles size={11} /> Suggest from today
            </button>
          </div>
          <ul className="space-y-1.5">
            {gratitude.map((line) => (
              <li key={line.id} className="group flex items-start gap-2">
                <span className="mt-1.5 shrink-0 text-accent">•</span>
                <AutoTextarea
                  value={line.text}
                  onChange={(v) => update(line.id, { text: v })}
                  className="min-w-0 flex-1 rounded bg-transparent py-0.5 text-sm leading-snug text-ink-muted outline-none focus:bg-surface-2 focus:text-ink"
                />
                <button onClick={() => remove(line.id)} aria-label="remove" className="mt-1 shrink-0 text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger">
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
          <AddRow value={g} onChange={setG} onAdd={addG} placeholder="Add gratitude…" />
        </div>
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-faint">What went well</div>
          <AutoTextarea
            value={reflection}
            onChange={setReflection}
            placeholder="Reflect on your day…"
            className="min-h-[5rem] w-full rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink-muted outline-none focus:border-accent"
          />
        </div>
      </div>
    </Card>
  )
}

export default function CommandCenter() {
  const now = useNow()
  const date = todayKey()
  const agenda = useAgenda(date).items
  const todos = useTodos(date).items
  const todosDone = todos.filter((t) => t.done).length
  const widgets = modules.flatMap((m) => m.widgets ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink">{greeting(now)}, Dr. Gowtham</h1>
        <div className="flex items-center gap-4">
          <DayProgress />
          <div className="hidden gap-2 lg:flex">
            <Stat label="Blocks" value={agenda.length} sub="in this day" />
            <Stat label="To-dos" value={`${todosDone}/${todos.length}`} sub="done" />
          </div>
        </div>
      </div>

      <DailyBrief />
      <NeedsYouToday />

      {/* Today's focus: agenda at half width, priorities + to-dos beside it */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgendaTimeline />
        <div className="flex flex-col gap-4">
          <Priorities />
          <Todos />
        </div>
      </div>

      {/* The rest, full-width rows then an even row of widgets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TimeByCategory />
        <Reflection />
        {widgets.map((w) => (
          <div key={w.id} className={`flex ${w.span === 2 ? 'col-span-2' : ''}`}>
            <Card title={w.title} icon={w.icon} className="flex h-full w-full flex-col">
              <div className="flex flex-1 flex-col justify-center">{w.render()}</div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
