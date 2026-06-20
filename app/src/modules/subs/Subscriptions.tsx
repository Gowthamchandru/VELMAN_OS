import { useState } from 'react'
import { CreditCard, Bell, Plus, Trash2, RefreshCw } from 'lucide-react'
import { Card, Stat } from '@/components/ui'
import { daysFromToday } from '@/lib/time'
import {
  useSubs,
  newSub,
  money,
  monthlyINR,
  dueStatus,
  dueLabel,
  nextPeriod,
  STATUS_COLOR,
  SUB_CATEGORIES,
  type Sub,
  type Billing,
  type Currency,
  type DueStatus,
} from './subsStore'

const RANK: Record<DueStatus, number> = { overdue: 0, soon: 1, ok: 2 }
const fieldCls = 'rounded-[10px] border-2 border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-accent'

function SubCard({ s, onUpdate, onRenew, onRemove }: { s: Sub; onUpdate: (p: Partial<Sub>) => void; onRenew: () => void; onRemove: () => void }) {
  const status = dueStatus(s)
  const c = STATUS_COLOR[status]
  return (
    <div className="flex flex-col rounded-xl border-2 border-border bg-surface p-3" style={status === 'overdue' ? { borderColor: '#d93a2b55' } : undefined}>
      <div className="flex items-start justify-between gap-2">
        <input value={s.name} onChange={(e) => onUpdate({ name: e.target.value })} className="min-w-0 flex-1 rounded bg-transparent text-sm font-medium text-ink outline-none focus:bg-surface-2" />
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: c, background: `${c}1f` }}>
          {dueLabel(s)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-ink-faint">{s.currency === 'USD' ? '$' : '₹'}</span>
        <input
          type="number"
          value={s.amount}
          onChange={(e) => onUpdate({ amount: Number(e.target.value) })}
          className="w-20 rounded bg-transparent text-lg font-semibold tabular-nums text-ink outline-none focus:bg-surface-2"
        />
        <select value={s.billing} onChange={(e) => onUpdate({ billing: e.target.value as Billing })} className="rounded-[8px] border-2 border-border bg-surface px-1.5 py-1 text-xs text-ink-muted outline-none">
          <option value="monthly">/mo</option>
          <option value="yearly">/yr</option>
        </select>
        <select value={s.currency} onChange={(e) => onUpdate({ currency: e.target.value as Currency })} className="rounded-[8px] border-2 border-border bg-surface px-1.5 py-1 text-xs text-ink-muted outline-none">
          <option>INR</option>
          <option>USD</option>
        </select>
      </div>
      <div className="mt-0.5 text-[11px] text-ink-faint">≈ {money(monthlyINR(s), 'INR')}/mo</div>

      <div className="mt-2 flex items-center gap-2">
        <select value={s.category} onChange={(e) => onUpdate({ category: e.target.value })} className="rounded-[8px] border-2 border-border bg-surface px-1.5 py-1 text-xs text-ink-muted outline-none">
          {SUB_CATEGORIES.map((c2) => (
            <option key={c2}>{c2}</option>
          ))}
        </select>
        <input
          type="date"
          value={s.nextDue}
          onChange={(e) => e.target.value && onUpdate({ nextDue: e.target.value })}
          className="rounded-[8px] border-2 border-border bg-surface px-1.5 py-1 font-mono text-[11px] text-ink-muted outline-none focus:border-accent"
        />
        <label className="ml-auto flex cursor-pointer items-center gap-1 text-[11px] text-ink-muted">
          <input type="checkbox" checked={s.autopay} onChange={(e) => onUpdate({ autopay: e.target.checked })} /> auto
        </label>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t-2 border-border pt-2">
        <button onClick={onRenew} className="flex items-center gap-1.5 rounded-[8px] border-2 border-border px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:text-accent" title="Mark paid — advance to next period">
          <RefreshCw size={12} /> Renew
        </button>
        <button onClick={onRemove} aria-label="delete" className="ml-auto text-ink-faint hover:text-danger">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function Subscriptions() {
  const { items, add, update, remove } = useSubs()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('INR')
  const [billing, setBilling] = useState<Billing>('monthly')
  const [category, setCategory] = useState('AI')
  const [due, setDue] = useState('')

  const submit = () => {
    const n = name.trim()
    if (!n || !due) return
    add(newSub(n, Number(amount), currency, billing, category, due))
    setName('')
    setAmount('')
    setDue('')
  }

  const monthlyTotal = items.reduce((s, x) => s + monthlyINR(x), 0)
  const reminders = items.filter((s) => dueStatus(s) !== 'ok')
  const ordered = [...items].sort((a, b) => RANK[dueStatus(a)] - RANK[dueStatus(b)] || daysFromToday(a.nextDue) - daysFromToday(b.nextDue))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <CreditCard size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Subscriptions</h1>
          <p className="text-sm text-ink-muted">Every recurring plan in one place — with renewal reminders. (USD totalled at ₹{83}/$.)</p>
        </div>
        <div className="ml-auto hidden gap-2 lg:flex">
          <Stat label="Per month" value={money(monthlyTotal, 'INR')} sub={`${items.length} active`} />
          <Stat label="Per year" value={money(monthlyTotal * 12, 'INR')} sub="all subscriptions" />
        </div>
      </div>

      {reminders.length > 0 && (
        <Card className="border-l-4 border-l-[#d97706]">
          <div className="mb-2 flex items-center gap-2 font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            <Bell size={13} className="text-[#d97706]" /> Renewals coming up
          </div>
          <ul className="space-y-1">
            {reminders.map((s) => {
              const c = STATUS_COLOR[dueStatus(s)]
              return (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: c }} />
                  <span className="text-ink">{s.name}</span>
                  <span className="text-ink-faint">· {money(s.amount, s.currency)}/{s.billing === 'yearly' ? 'yr' : 'mo'}</span>
                  <span className="font-semibold" style={{ color: c }}>— {dueLabel(s)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Card title="Add a subscription">
        <div className="flex flex-wrap items-end gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Service name" className={`${fieldCls} min-w-[10rem] flex-1`} />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount" className={`${fieldCls} w-24`} />
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={fieldCls}>
            <option>INR</option>
            <option>USD</option>
          </select>
          <select value={billing} onChange={(e) => setBilling(e.target.value as Billing)} className={fieldCls}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldCls}>
            {SUB_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
            Next due
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${fieldCls} font-mono text-xs`} />
          </label>
          <button onClick={submit} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90">
            <Plus size={14} /> Add
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((s) => (
          <SubCard key={s.id} s={s} onUpdate={(p) => update(s.id, p)} onRenew={() => update(s.id, { nextDue: nextPeriod(s) })} onRemove={() => remove(s.id)} />
        ))}
      </div>
    </div>
  )
}
