import { useState } from 'react'
import { Inbox, Plus, X } from 'lucide-react'
import { Card } from '@/components/ui'
import {
  useLoops,
  newLoop,
  nextStatus,
  displayStatus,
  dueLabel,
  ageDays,
  CONTEXTS,
  type LoopStatus,
} from './loopsStore'

const STATUS_COLOR: Record<LoopStatus, string> = {
  open: '#1c4d8c',
  waiting: '#d97706',
  overdue: '#d93a2b',
  closed: '#059669',
}
const RANK: Record<LoopStatus, number> = { overdue: 0, waiting: 1, open: 2, closed: 3 }

function StatusPill({ status, onClick }: { status: LoopStatus; onClick?: () => void }) {
  const c = STATUS_COLOR[status]
  return (
    <button
      onClick={onClick}
      className="inline-flex w-[78px] shrink-0 items-center gap-1.5 rounded-[10px] px-2 py-0.5 text-[11px] font-semibold capitalize"
      style={{ background: `${c}1f`, color: c }}
      title="Click to advance: open → waiting → closed"
    >
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {status}
    </button>
  )
}

const fieldCls = 'rounded-[10px] border-2 border-border bg-surface px-2 py-2 text-sm text-ink-muted outline-none focus:border-accent'

export default function Loops() {
  const { items, add, update, remove } = useLoops()
  const [title, setTitle] = useState('')
  const [ctx, setCtx] = useState<string>('Work')
  const [owner, setOwner] = useState('')
  const [due, setDue] = useState('')
  const [filter, setFilter] = useState<string>('All')
  const [showClosed, setShowClosed] = useState(false)

  const submit = () => {
    const t = title.trim()
    if (!t) return
    add(newLoop(t, ctx, owner.trim() || null, due || null))
    setTitle('')
    setOwner('')
    setDue('')
  }

  const counts = {
    overdue: items.filter((l) => displayStatus(l) === 'overdue').length,
    waiting: items.filter((l) => displayStatus(l) === 'waiting').length,
    open: items.filter((l) => displayStatus(l) === 'open').length,
  }

  const visible = items
    .filter((l) => (showClosed || l.status !== 'closed') && (filter === 'All' || l.context === filter))
    .sort((a, b) => RANK[displayStatus(a)] - RANK[displayStatus(b)])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <Inbox size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Open Loops</h1>
          <p className="text-sm text-ink-muted">Everything in flight — delegated, awaited, to revisit. Nothing dropped.</p>
        </div>
        <div className="ml-auto hidden items-center gap-3 font-mono text-xs sm:flex">
          <span style={{ color: STATUS_COLOR.overdue }}>{counts.overdue} overdue</span>
          <span style={{ color: STATUS_COLOR.waiting }}>{counts.waiting} waiting</span>
          <span style={{ color: STATUS_COLOR.open }}>{counts.open} open</span>
        </div>
      </div>

      <Card title="Add an open loop">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="What are you waiting on / need to follow up?"
            className="min-w-[12rem] flex-1 rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:brand-glow"
          />
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Owner"
            className={`${fieldCls} w-28`}
          />
          <select value={ctx} onChange={(e) => setCtx(e.target.value)} className={fieldCls}>
            {CONTEXTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} title="Due date" className={`${fieldCls} font-mono text-xs`} />
          <button
            onClick={submit}
            className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </Card>

      <Card title={`Register · ${items.filter((i) => i.status !== 'closed').length} open`}>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {['All', ...CONTEXTS].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full border-2 px-2.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wide ${
                filter === c ? 'border-accent bg-accent-soft text-accent' : 'border-border text-ink-faint hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => setShowClosed((v) => !v)}
            className={`ml-auto rounded-full border-2 px-2.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wide ${
              showClosed ? 'border-accent bg-accent-soft text-accent' : 'border-border text-ink-faint hover:text-ink'
            }`}
          >
            {showClosed ? 'Hiding nothing' : 'Show closed'}
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border px-4 py-8 text-center text-sm text-ink-faint">
            Nothing here. Capture a loop above or press ⌘K anywhere.
          </div>
        ) : (
          <ul className="space-y-1">
            {visible.map((loop) => {
              const ds = displayStatus(loop)
              const closed = loop.status === 'closed'
              const age = ageDays(loop)
              return (
                <li
                  key={loop.id}
                  className="group flex items-center gap-2 rounded-[10px] px-2 py-1.5"
                  style={ds === 'overdue' ? { borderLeft: '3px solid #d93a2b', background: '#d93a2b0a' } : undefined}
                >
                  <StatusPill status={ds} onClick={() => update(loop.id, { status: nextStatus(loop.status) })} />
                  <input
                    value={loop.title}
                    onChange={(e) => update(loop.id, { title: e.target.value })}
                    className={`min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm outline-none focus:bg-surface-2 ${closed ? 'text-ink-faint line-through' : 'text-ink'}`}
                  />
                  {age > 0 && <span className="hidden w-14 shrink-0 text-right text-[11px] text-ink-faint md:inline" title="open for">{age}d open</span>}
                  <select
                    value={loop.context}
                    onChange={(e) => update(loop.id, { context: e.target.value })}
                    className="shrink-0 rounded-[8px] border-2 border-border bg-surface px-1.5 py-1 text-xs text-ink-muted outline-none focus:border-accent"
                  >
                    {CONTEXTS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    value={loop.owner ?? ''}
                    onChange={(e) => update(loop.id, { owner: e.target.value || null })}
                    placeholder="owner"
                    className="w-24 shrink-0 rounded bg-transparent px-1 py-0.5 text-xs text-ink-muted outline-none focus:bg-surface-2 focus:text-ink"
                  />
                  <div className="flex w-[150px] shrink-0 items-center gap-1.5">
                    <input
                      type="date"
                      value={loop.due ?? ''}
                      onChange={(e) => update(loop.id, { due: e.target.value || null })}
                      className="w-[104px] rounded-[8px] border-2 border-border bg-surface px-1.5 py-1 font-mono text-[11px] text-ink-muted outline-none focus:border-accent"
                    />
                    {loop.due && (
                      <span className="text-[10px] font-semibold" style={{ color: ds === 'overdue' ? STATUS_COLOR.overdue : 'var(--color-ink-faint)' }}>
                        {dueLabel(loop.due)}
                      </span>
                    )}
                  </div>
                  <button onClick={() => remove(loop.id)} className="shrink-0 text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger" title="Remove" aria-label="Remove">
                    <X size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

// Command Center widget — compact: a count + the top 3 loops, urgency-ranked.
export function LoopsWidget() {
  const { items } = useLoops()
  const open = items.filter((i) => i.status !== 'closed')
  const top = [...open].sort((a, b) => RANK[displayStatus(a)] - RANK[displayStatus(b)]).slice(0, 3)
  const more = open.length - top.length
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-ink">{open.length}</span>
        <span className="text-sm text-ink-muted">in flight</span>
      </div>
      {top.length === 0 ? (
        <p className="text-xs text-ink-faint">All clear — press ⌘K to capture one.</p>
      ) : (
        <ul className="space-y-1.5">
          {top.map((loop) => (
            <li key={loop.id} className="flex items-center gap-2 text-sm">
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[displayStatus(loop)] }} />
              <span className="min-w-0 flex-1 truncate text-ink">{loop.title}</span>
              <span className="shrink-0 text-[11px] text-ink-faint">{dueLabel(loop.due) || loop.context}</span>
            </li>
          ))}
          {more > 0 && <li className="text-[11px] text-ink-faint">+{more} more on the Open Loops page</li>}
        </ul>
      )}
    </div>
  )
}
