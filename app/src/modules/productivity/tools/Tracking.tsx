// Goal Tracker, Reminder System (fires real browser notifications), and a
// compact Habit Tracker.
//
// The habit tracker deliberately reads the EXISTING habitsStore rather than
// keeping its own copy — ticking a box here is the same tick as on /habits.
import { useEffect, useState } from 'react'
import { Plus, Trash2, Bell, BellRing, Target, Minus, Check } from 'lucide-react'
import { Card, Empty, Pill } from '@/components/ui'
import { useStoreTick } from '@/lib/store'
import { shortDate, daysFromToday, useNow } from '@/lib/time'
import {
  useGoals, newGoal, goalPct,
  useReminders, newReminder,
} from '../productivityStore'
import {
  useSelfCareDefs, useDailyDefs, weekDateKeys, isHabitDone, toggleHabit, habitStreak, newHabit,
} from '@/modules/habits/habitsStore'

const fld = 'rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent'

export function GoalTracker() {
  const { items, add, update, remove } = useGoals()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [due, setDue] = useState('')

  const submit = () => {
    if (!name.trim() || !+target) return
    add(newGoal(name.trim(), +target, unit.trim() || 'units', due || null))
    setName(''); setTarget(''); setUnit(''); setDue('')
  }

  return (
    <div className="space-y-4">
      <Card title="NEW GOAL" icon={Target}>
        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goal, e.g. Read books" className={`${fld} min-w-[12rem] flex-1`} />
          <input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target" className={`${fld} w-28`} />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className={`${fld} w-28`} />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={fld} />
          <button onClick={submit} disabled={!name.trim() || !+target} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-40"><Plus size={14} /> Add</button>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card><Empty>No goals yet. Add one above and log progress as you go.</Empty></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((g) => {
            const pct = goalPct(g)
            const complete = g.current >= g.target
            return (
              <Card
                key={g.id}
                title={g.name}
                action={<button onClick={() => remove(g.id)} className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-danger"><Trash2 size={13} /></button>}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-semibold tabular-nums" style={{ color: complete ? '#00ffa3' : 'var(--color-ink)' }}>{g.current}</span>
                  <span className="text-sm text-ink-muted">/ {g.target} {g.unit}</span>
                  <span className="ml-auto font-mono text-sm tabular-nums text-accent">{pct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: complete ? '#00ffa3' : '#00d9ff' }} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => update(g.id, { current: Math.max(0, g.current - 1) })} className="grid size-8 place-items-center rounded-[10px] border-2 border-border text-ink-muted hover:border-accent hover:text-accent"><Minus size={14} /></button>
                  <button onClick={() => update(g.id, { current: g.current + 1 })} className="grid size-8 place-items-center rounded-[10px] bg-accent text-white hover:opacity-90"><Plus size={14} /></button>
                  {g.due && <span className="ml-auto font-mono text-[11px] tabular-nums text-ink-faint">{daysFromToday(g.due) < 0 ? 'past due' : `${daysFromToday(g.due)}d left`} · {shortDate(g.due)}</span>}
                  {complete && <Pill color="#00ffa3">Complete</Pill>}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Reminders() {
  const { items, add, update, remove } = useReminders()
  const [text, setText] = useState('')
  const [at, setAt] = useState('')
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )
  const now = useNow(20000)

  // Poll for reminders that have come due and fire one notification each.
  useEffect(() => {
    const check = () => {
      const now = Date.now()
      for (const r of items) {
        if (r.done || r.notified || !r.at) continue
        if (new Date(r.at).getTime() <= now) {
          update(r.id, { notified: true })
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification('Velman OS reminder', { body: r.text })
            } catch {
              /* notification blocked — the in-app "due" state still shows */
            }
          }
        }
      }
    }
    check()
    const id = setInterval(check, 20000)
    return () => clearInterval(id)
  }, [items, update])

  const submit = () => {
    if (!text.trim() || !at) return
    add(newReminder(text.trim(), at))
    setText(''); setAt('')
  }

  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done) || a.at.localeCompare(b.at))
  // Ticking clock rather than Date.now() in render — keeps the "due" state
  // updating on its own and keeps the render idempotent.
  const nowMs = now.getTime()

  return (
    <div className="space-y-4">
      <Card
        title="NEW REMINDER"
        icon={Bell}
        action={
          perm !== 'granted' ? (
            <button
              onClick={() => Notification.requestPermission().then(setPerm)}
              className="rounded-[8px] border-2 border-border px-2.5 py-1 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:border-accent hover:text-accent"
            >
              Enable alerts
            </button>
          ) : <Pill color="#00ffa3">Alerts on</Pill>
        }
      >
        <div className="flex flex-wrap gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Remind me to…" className={`${fld} min-w-[12rem] flex-1`} />
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={fld} />
          <button onClick={submit} disabled={!text.trim() || !at} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-40"><Plus size={14} /> Add</button>
        </div>
        {perm !== 'granted' && <p className="mt-2 text-[11px] text-ink-faint">Without browser alerts, due reminders still light up in the list below.</p>}
      </Card>

      <Card title={`REMINDERS · ${items.filter((r) => !r.done).length} PENDING`}>
        {sorted.length === 0 ? (
          <Empty>No reminders set.</Empty>
        ) : (
          <ul className="divide-y-2 divide-border">
            {sorted.map((r) => {
              const due = !r.done && new Date(r.at).getTime() <= nowMs
              return (
                <li key={r.id} className="flex items-center gap-2.5 py-2.5 text-sm">
                  {due ? <BellRing size={15} className="shrink-0 text-accent" /> : <Bell size={15} className="shrink-0 text-ink-faint" />}
                  <span className={`min-w-0 flex-1 ${r.done ? 'text-ink-faint line-through' : 'text-ink'}`}>{r.text}</span>
                  <span className={`shrink-0 font-mono text-[11px] tabular-nums ${due ? 'text-accent' : 'text-ink-faint'}`}>
                    {new Date(r.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!r.done && <button onClick={() => update(r.id, { done: true })} title="Dismiss" className="shrink-0 text-ink-faint hover:text-online"><Check size={14} /></button>}
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

// Hoisted: defining this inside HabitTracker would make it a fresh component
// type on every render, remounting the whole grid on each tick.
function HabitGrid({ title, coll, dates, todayIdx }: {
  title: string
  coll: ReturnType<typeof useDailyDefs>
  dates: string[]
  todayIdx: number
}) {
  return (
    <Card title={title}>
      {coll.items.length === 0 ? (
        <Empty>No habits here yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="pb-2 text-left font-medium">Habit</th>
                {dates.map((d, i) => (
                  <th key={d} className={`pb-2 text-center font-medium ${i === todayIdx ? 'text-accent' : ''}`}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</th>
                ))}
                <th className="pb-2 text-right font-medium">Streak</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {coll.items.map((h) => (
                <tr key={h.id} className="border-t-2 border-border">
                  <td className="py-2 pr-2 text-ink">{h.label}</td>
                  {dates.map((d, i) => {
                    const on = isHabitDone(d, h.id)
                    return (
                      <td key={d} className="py-2 text-center">
                        <button
                          onClick={() => toggleHabit(d, h.id)}
                          aria-label={`${h.label} on ${d}`}
                          className={`size-6 rounded-md border-2 transition-colors ${
                            on ? 'border-online bg-online' : i === todayIdx ? 'border-accent' : 'border-border hover:border-brand-border'
                          }`}
                        />
                      </td>
                    )
                  })}
                  <td className="py-2 text-right font-mono text-xs tabular-nums text-ink-muted">{habitStreak(h.id)}d</td>
                  <td className="py-2 pl-2 text-right">
                    <button onClick={() => coll.remove(h.id)} className="text-ink-faint hover:text-danger"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export function HabitTracker() {
  useStoreTick()
  const selfCare = useSelfCareDefs()
  const daily = useDailyDefs()
  const { dates, todayIdx } = weekDateKeys()
  const [label, setLabel] = useState('')

  return (
    <div className="space-y-4">
      <Card title="ADD A HABIT">
        <div className="flex flex-wrap gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && label.trim()) { daily.add(newHabit(label.trim())); setLabel('') } }} placeholder="e.g. Read 20 pages" className={`${fld} min-w-[12rem] flex-1`} />
          <button onClick={() => { if (label.trim()) { daily.add(newHabit(label.trim())); setLabel('') } }} disabled={!label.trim()} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-40"><Plus size={14} /> Add</button>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">Shares data with the Habits page — ticking here ticks there.</p>
      </Card>
      <HabitGrid title="DAILY HABITS" coll={daily} dates={dates} todayIdx={todayIdx} />
      <HabitGrid title="SELF-CARE" coll={selfCare} dates={dates} todayIdx={todayIdx} />
    </div>
  )
}
