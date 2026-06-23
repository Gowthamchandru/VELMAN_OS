import { Plus, X } from 'lucide-react'
import { Card, Stat } from '@/components/ui'
import { uid } from '@/lib/store'
import { useGoals, goalProgress, inr, type Goal } from '../financeReal'

const num = (v: string) => { const n = parseFloat(v.replace(/,/g, '')); return isNaN(n) ? 0 : n }
const cellInput = 'rounded bg-transparent px-1 py-0.5 text-sm outline-none focus:bg-surface-2 focus:ring-1 focus:ring-accent'
const PRIORITY: Record<string, string> = { High: '#d93a2b', Medium: '#d97706', Low: '#059669' }

export default function Goals() {
  const { items, add, update, remove } = useGoals()
  const totalTarget = items.reduce((s, g) => s + g.target, 0)
  const totalSaved = items.reduce((s, g) => s + g.saved, 0)
  const overall = totalTarget ? totalSaved / totalTarget : 0
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Goals" value={`${items.length}`} />
        <Stat label="Total saved" value={inr(totalSaved, true)} />
        <Stat label="Total target" value={inr(totalTarget, true)} />
        <Stat label="Overall progress" value={`${Math.round(overall * 100)}%`} />
      </div>
      <Card
        title={`Financial goals · ${items.length}`}
      action={
        <button onClick={() => add({ id: uid(), name: 'New goal', category: 'Savings', target: 100000, saved: 0, monthly: 5000, targetDate: '2027-01-01', priority: 'Medium' } as Goal)} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-2.5 py-1 font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:opacity-90">
          <Plus size={13} /> Add goal
        </button>
      }
    >
      <div className="space-y-3">
        {items.map((g) => {
          const { pct, remaining, months } = goalProgress(g)
          return (
            <div key={g.id} className="group rounded-xl border-2 border-border p-3">
              <div className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: PRIORITY[g.priority] }} />
                <input className={`${cellInput} min-w-0 flex-1 font-medium text-ink`} value={g.name} onChange={(e) => update(g.id, { name: e.target.value })} />
                <select className={`${cellInput} text-xs text-ink-muted`} value={g.priority} onChange={(e) => update(g.id, { priority: e.target.value as Goal['priority'] })}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
                <button onClick={() => remove(g.id)} aria-label="remove" className="text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger"><X size={14} /></button>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-surface-2">
                <div className="h-full rounded bg-accent" style={{ width: `${pct * 100}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                <label className="flex items-center gap-1">saved <input className={`${cellInput} w-24 text-right tabular-nums text-ink`} value={g.saved} onChange={(e) => update(g.id, { saved: num(e.target.value) })} /></label>
                <label className="flex items-center gap-1">of <input className={`${cellInput} w-24 text-right tabular-nums text-ink`} value={g.target} onChange={(e) => update(g.id, { target: num(e.target.value) })} /></label>
                <label className="flex items-center gap-1">/mo <input className={`${cellInput} w-20 text-right tabular-nums text-ink`} value={g.monthly} onChange={(e) => update(g.id, { monthly: num(e.target.value) })} /></label>
                <span className="tabular-nums text-accent">{Math.round(pct * 100)}%</span>
                <span className="text-ink-faint">{inr(remaining, true)} to go · {months === Infinity ? '—' : `${months} mo`}</span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
    </div>
  )
}
