// Checklist (reusable, resettable), To-do List (standing list with priority
// and due date), and Recurring Tasks (completing one rolls its next due date
// forward by the frequency and grows a streak).
import { useState } from 'react'
import { Plus, Trash2, RotateCcw, Check, Repeat } from 'lucide-react'
import { Card, Empty, Pill } from '@/components/ui'
import { todayKey, shortDate, daysFromToday } from '@/lib/time'
import {
  useChecklists, newChecklist, checklistProgress,
  useProdTodos, newProdTodo, TODO_PRIORITIES, TODO_PRIORITY_COLOR, type TodoPriority,
  useRecurring, newRecurring, advanceDue, FREQS, type Freq,
} from '../productivityStore'
import { uid } from '@/lib/store'

const fld = 'rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent'

export function Checklists() {
  const { items, add, update, remove } = useChecklists()
  const [name, setName] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})

  const addItem = (id: string) => {
    const text = (draft[id] ?? '').trim()
    if (!text) return
    const c = items.find((x) => x.id === id)
    if (!c) return
    update(id, { items: [...c.items, { id: uid(), text, done: false }] })
    setDraft((d) => ({ ...d, [id]: '' }))
  }

  return (
    <div className="space-y-4">
      <Card title="NEW CHECKLIST">
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { add(newChecklist(name.trim())); setName('') } }}
            placeholder="e.g. Pre-flight checks, Weekly review"
            className={`${fld} min-w-[12rem] flex-1`}
          />
          <button
            onClick={() => { if (name.trim()) { add(newChecklist(name.trim())); setName('') } }}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-40"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card><Empty>No checklists yet. Create one above — tick it off, then reset to run it again.</Empty></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((c) => {
            const p = checklistProgress(c)
            return (
              <Card
                key={c.id}
                title={c.name}
                action={
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] tabular-nums text-ink-faint">{p.done}/{p.total}</span>
                    <button onClick={() => update(c.id, { items: c.items.map((i) => ({ ...i, done: false })) })} title="Reset all" className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-accent"><RotateCcw size={13} /></button>
                    <button onClick={() => remove(c.id)} title="Delete checklist" className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-danger"><Trash2 size={13} /></button>
                  </span>
                }
              >
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${p.pct}%` }} />
                </div>
                <ul className="space-y-1">
                  {c.items.map((i) => (
                    <li key={i.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={i.done}
                        onChange={() => update(c.id, { items: c.items.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)) })}
                        className="size-4 shrink-0 accent-[#00d9ff]"
                      />
                      <span className={`min-w-0 flex-1 ${i.done ? 'text-ink-faint line-through' : 'text-ink'}`}>{i.text}</span>
                      <button onClick={() => update(c.id, { items: c.items.filter((x) => x.id !== i.id) })} className="text-ink-faint hover:text-danger"><Trash2 size={12} /></button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <input
                    value={draft[c.id] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addItem(c.id)}
                    placeholder="Add a step…"
                    className={`${fld} min-w-0 flex-1 py-1.5`}
                  />
                  <button onClick={() => addItem(c.id)} className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-accent text-white hover:opacity-90"><Plus size={14} /></button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TodoList() {
  const { items, add, update, remove } = useProdTodos()
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('Med')
  const [due, setDue] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open')

  const submit = () => {
    if (!text.trim()) return
    add(newProdTodo(text.trim(), priority, due || null))
    setText('')
    setDue('')
  }

  const rank: Record<TodoPriority, number> = { High: 0, Med: 1, Low: 2 }
  const shown = items
    .filter((t) => (filter === 'all' ? true : filter === 'open' ? !t.done : t.done))
    .sort((a, b) => Number(a.done) - Number(b.done) || rank[a.priority] - rank[b.priority] || a.createdAt - b.createdAt)
  const openCount = items.filter((t) => !t.done).length

  return (
    <div className="space-y-4">
      <Card title="ADD A TASK">
        <div className="flex flex-wrap gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="What needs doing?" className={`${fld} min-w-[12rem] flex-1`} />
          <select value={priority} onChange={(e) => setPriority(e.target.value as TodoPriority)} className={fld}>
            {TODO_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={fld} />
          <button onClick={submit} disabled={!text.trim()} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-40"><Plus size={14} /> Add</button>
        </div>
      </Card>

      <Card
        title={`TASKS · ${openCount} OPEN`}
        action={
          <div className="flex gap-1">
            {(['open', 'all', 'done'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-[8px] px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-wide ${filter === f ? 'bg-accent text-white' : 'text-ink-faint hover:text-ink'}`}>{f}</button>
            ))}
          </div>
        }
      >
        {shown.length === 0 ? (
          <Empty>{filter === 'done' ? 'Nothing completed yet.' : 'Nothing here — add a task above.'}</Empty>
        ) : (
          <ul className="divide-y-2 divide-border">
            {shown.map((t) => {
              const dl = t.due ? daysFromToday(t.due) : null
              const overdue = !t.done && dl !== null && dl < 0
              return (
                <li key={t.id} className="flex items-center gap-2.5 py-2 text-sm">
                  <input type="checkbox" checked={t.done} onChange={() => update(t.id, { done: !t.done })} className="size-4 shrink-0 accent-[#00d9ff]" />
                  <span className={`min-w-0 flex-1 ${t.done ? 'text-ink-faint line-through' : 'text-ink'}`}>{t.text}</span>
                  {!t.done && <Pill color={TODO_PRIORITY_COLOR[t.priority]}>{t.priority}</Pill>}
                  {t.due && (
                    <span className={`shrink-0 font-mono text-[11px] tabular-nums ${overdue ? 'text-danger' : 'text-ink-faint'}`}>
                      {overdue ? `${Math.abs(dl as number)}d late` : shortDate(t.due)}
                    </span>
                  )}
                  <button onClick={() => remove(t.id)} className="shrink-0 text-ink-faint hover:text-danger"><Trash2 size={13} /></button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function RecurringTasks() {
  const { items, add, update, remove } = useRecurring()
  const [text, setText] = useState('')
  const [freq, setFreq] = useState<Freq>('Daily')

  const complete = (id: string) => {
    const r = items.find((x) => x.id === id)
    if (!r) return
    update(id, { nextDue: advanceDue(todayKey(), r.freq), streak: r.streak + 1 })
  }

  return (
    <div className="space-y-4">
      <Card title="NEW RECURRING TASK">
        <div className="flex flex-wrap gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { add(newRecurring(text.trim(), freq)); setText('') } }} placeholder="e.g. Review inbox, Pay rent" className={`${fld} min-w-[12rem] flex-1`} />
          <select value={freq} onChange={(e) => setFreq(e.target.value as Freq)} className={fld}>
            {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button onClick={() => { if (text.trim()) { add(newRecurring(text.trim(), freq)); setText('') } }} disabled={!text.trim()} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-40"><Plus size={14} /> Add</button>
        </div>
      </Card>

      <Card title={`RECURRING · ${items.length}`} icon={Repeat}>
        {items.length === 0 ? (
          <Empty>No recurring tasks. Completing one rolls its next date forward automatically.</Empty>
        ) : (
          <ul className="divide-y-2 divide-border">
            {[...items].sort((a, b) => a.nextDue.localeCompare(b.nextDue)).map((r) => {
              const dl = daysFromToday(r.nextDue)
              const dueNow = dl <= 0
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2.5 py-2.5 text-sm">
                  <button
                    onClick={() => complete(r.id)}
                    title="Mark done for this cycle"
                    className={`grid size-7 shrink-0 place-items-center rounded-lg border-2 transition-colors ${dueNow ? 'border-accent text-accent hover:bg-accent hover:text-white' : 'border-border text-ink-faint'}`}
                  >
                    <Check size={14} />
                  </button>
                  <span className="min-w-0 flex-1 text-ink">{r.text}</span>
                  <Pill>{r.freq}</Pill>
                  {r.streak > 0 && <Pill color="#00ffa3">{r.streak}× streak</Pill>}
                  <span className={`shrink-0 font-mono text-[11px] tabular-nums ${dueNow ? 'text-accent' : 'text-ink-faint'}`}>
                    {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'due today' : `in ${dl}d`}
                  </span>
                  <button onClick={() => remove(r.id)} className="shrink-0 text-ink-faint hover:text-danger"><Trash2 size={13} /></button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
