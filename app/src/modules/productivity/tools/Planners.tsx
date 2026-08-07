// Daily Planner (time blocks for a chosen date), Weekly Planner (Mon–Sun
// board), and Calendar (real month grid with events on any day).
import { useState } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Card, Empty } from '@/components/ui'
import { todayKey, prettyDate, addDaysKey, parseTimeToMinutes } from '@/lib/time'
import {
  usePlanBlocks, newPlanBlock,
  useWeekItems, newWeekItem, WEEKDAYS,
  useEvents, newEvent, EVENT_COLORS,
} from '../productivityStore'

const fld = 'rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent'

export function DailyPlanner() {
  const { items, add, update, remove } = usePlanBlocks()
  const [date, setDate] = useState(todayKey())
  const [time, setTime] = useState('09:00')
  const [text, setText] = useState('')

  const blocks = items
    .filter((b) => b.date === date)
    .sort((a, b) => (parseTimeToMinutes(a.time) ?? 0) - (parseTimeToMinutes(b.time) ?? 0))
  const done = blocks.filter((b) => b.done).length

  const submit = () => {
    if (!text.trim()) return
    add(newPlanBlock(date, time, text.trim()))
    setText('')
  }

  return (
    <div className="space-y-4">
      <Card
        title={prettyDate(date)}
        icon={CalendarDays}
        action={
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] tabular-nums text-ink-faint">{done}/{blocks.length}</span>
            <button onClick={() => setDate(addDaysKey(date, -1))} className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-accent"><ChevronLeft size={15} /></button>
            <button onClick={() => setDate(todayKey())} className="rounded-[8px] px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-faint hover:text-accent">Today</button>
            <button onClick={() => setDate(addDaysKey(date, 1))} className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-accent"><ChevronRight size={15} /></button>
          </span>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fld} />
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Block this time for…" className={`${fld} min-w-[12rem] flex-1`} />
          <button onClick={submit} disabled={!text.trim()} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-40"><Plus size={14} /> Block</button>
        </div>

        {blocks.length === 0 ? (
          <Empty>Nothing planned for this day yet.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-xl border-2 border-border bg-surface px-3 py-2 text-sm">
                <span className="w-16 shrink-0 font-mono text-xs tabular-nums text-accent">{b.time}</span>
                <input type="checkbox" checked={b.done} onChange={() => update(b.id, { done: !b.done })} className="size-4 shrink-0 accent-[#00d9ff]" />
                <span className={`min-w-0 flex-1 ${b.done ? 'text-ink-faint line-through' : 'text-ink'}`}>{b.text}</span>
                <button onClick={() => remove(b.id)} className="shrink-0 text-ink-faint hover:text-danger"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function WeeklyPlanner() {
  const { items, add, update, remove } = useWeekItems()
  const [draft, setDraft] = useState<Record<number, string>>({})
  const todayIdx = (new Date().getDay() + 6) % 7 // Mon=0

  const addTo = (day: number) => {
    const t = (draft[day] ?? '').trim()
    if (!t) return
    add(newWeekItem(day, t))
    setDraft((d) => ({ ...d, [day]: '' }))
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {WEEKDAYS.map((label, day) => {
        const dayItems = items.filter((i) => i.day === day)
        const done = dayItems.filter((i) => i.done).length
        return (
          <Card
            key={label}
            title={label}
            className={day === todayIdx ? 'ring-2 ring-accent' : ''}
            action={<span className="font-mono text-[11px] tabular-nums text-ink-faint">{done}/{dayItems.length}</span>}
          >
            <ul className="mb-2 space-y-1">
              {dayItems.map((i) => (
                <li key={i.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={i.done} onChange={() => update(i.id, { done: !i.done })} className="mt-0.5 size-4 shrink-0 accent-[#00d9ff]" />
                  <span className={`min-w-0 flex-1 ${i.done ? 'text-ink-faint line-through' : 'text-ink'}`}>{i.text}</span>
                  <button onClick={() => remove(i.id)} className="shrink-0 text-ink-faint hover:text-danger"><Trash2 size={12} /></button>
                </li>
              ))}
              {dayItems.length === 0 && <li className="py-1 text-xs text-ink-faint">Nothing planned.</li>}
            </ul>
            <div className="flex gap-1.5">
              <input
                value={draft[day] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [day]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addTo(day)}
                placeholder="Add…"
                className={`${fld} min-w-0 flex-1 py-1.5 text-xs`}
              />
              <button onClick={() => addTo(day)} className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-accent text-white hover:opacity-90"><Plus size={13} /></button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export function Calendar() {
  const { items, add, remove } = useEvents()
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selected, setSelected] = useState(todayKey())
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')
  const [color, setColor] = useState(EVENT_COLORS[0])

  const first = new Date(cursor.y, cursor.m, 1)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7 // Mon-first
  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ]
  const monthLabel = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const shift = (n: number) => setCursor((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const dayEvents = items.filter((e) => e.date === selected).sort((a, b) => a.time.localeCompare(b.time))

  const submit = () => {
    if (!title.trim()) return
    add(newEvent(selected, time, title.trim(), color))
    setTitle('')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card
        title={monthLabel}
        action={
          <span className="flex items-center gap-1.5">
            <button onClick={() => shift(-1)} className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-accent"><ChevronLeft size={15} /></button>
            <button onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); setSelected(todayKey()) }} className="rounded-[8px] px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-faint hover:text-accent">Today</button>
            <button onClick={() => shift(1)} className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-accent"><ChevronRight size={15} /></button>
          </span>
        }
      >
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center font-heading text-[10px] font-bold uppercase tracking-wide text-ink-faint">{d}</div>
          ))}
          {cells.map((key, i) => {
            if (!key) return <div key={`x${i}`} />
            const evs = items.filter((e) => e.date === key)
            const isToday = key === todayKey()
            const isSel = key === selected
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`flex min-h-[4.2rem] flex-col rounded-lg border-2 p-1.5 text-left transition-colors ${
                  isSel ? 'border-accent bg-accent-soft' : isToday ? 'border-brand-border bg-surface' : 'border-border bg-surface hover:border-brand-border'
                }`}
              >
                <span className={`font-mono text-[11px] tabular-nums ${isToday ? 'font-bold text-accent' : 'text-ink-muted'}`}>{+key.slice(-2)}</span>
                <span className="mt-1 flex flex-wrap gap-0.5">
                  {evs.slice(0, 4).map((e) => <span key={e.id} className="size-1.5 rounded-full" style={{ background: e.color }} />)}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card title={prettyDate(selected)}>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${fld} w-28`} />
            <div className="flex flex-1 items-center gap-1">
              {EVENT_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} aria-label={`colour ${c}`} className={`size-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white/70' : ''}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Event title" className={`${fld} w-full`} />
          <button onClick={submit} disabled={!title.trim()} className="flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-accent py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-40"><Plus size={14} /> Add event</button>
        </div>

        <div className="mt-3 border-t-2 border-border pt-3">
          {dayEvents.length === 0 ? (
            <Empty>No events on this day.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {dayEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-2 rounded-xl border-2 border-border bg-surface px-2.5 py-2 text-sm">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: e.color }} />
                  <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-ink-faint">{e.time}</span>
                  <span className="min-w-0 flex-1 text-ink">{e.title}</span>
                  <button onClick={() => remove(e.id)} className="shrink-0 text-ink-faint hover:text-danger"><Trash2 size={12} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}
