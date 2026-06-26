import { useState } from 'react'
import { Plus, X, Flame } from 'lucide-react'
import { Card } from '@/components/ui'
import { useStoreTick, type Collection } from '@/lib/store'
import { shortDate } from '@/lib/time'
import {
  useSelfCareDefs,
  useDailyDefs,
  newHabit,
  weekDateKeys,
  isHabitDone,
  toggleHabit,
  habitStreak,
  weekDoneCount,
  weekHabitStats,
  type Habit,
} from './habitsStore'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function Grid({ defs, dates, todayIdx }: { defs: Collection<Habit>; dates: string[]; todayIdx: number }) {
  const [text, setText] = useState('')
  const add = () => {
    const t = text.trim()
    if (!t) return
    defs.add(newHabit(t))
    setText('')
  }
  return (
    <div className="space-y-1.5">
      {/* header row: weekday + date number, today highlighted */}
      <div className="flex items-center gap-3">
        <span className="w-52 shrink-0" />
        <div className="flex gap-1.5">
          {dates.map((d, i) => (
            <div key={i} className={`w-7 leading-tight ${i === todayIdx ? 'text-accent' : 'text-ink-faint'}`}>
              <div className="text-center text-[10px] font-bold">{DOW[i]}</div>
              <div className="text-center text-[10px] tabular-nums">{Number(d.slice(8))}</div>
            </div>
          ))}
        </div>
        <span className="w-12 shrink-0 text-right text-[10px] uppercase tracking-wide text-ink-faint">Streak</span>
        <span className="w-9 shrink-0 text-right text-[10px] uppercase tracking-wide text-ink-faint">%</span>
        <span className="w-4 shrink-0" />
      </div>

      {defs.items.map((row) => {
        const pct = Math.round((weekDoneCount(row.id, dates) / dates.length) * 100)
        const streak = habitStreak(row.id)
        return (
          <div key={row.id} className="group flex items-center gap-3">
            <input
              value={row.label}
              onChange={(e) => defs.update(row.id, { label: e.target.value })}
              className="w-52 shrink-0 rounded bg-transparent px-1 py-0.5 text-sm text-ink outline-none focus:bg-surface-2"
            />
            <div className="flex gap-1.5">
              {dates.map((d, i) => {
                const on = isHabitDone(d, row.id)
                const future = i > todayIdx
                return (
                  <button
                    key={i}
                    disabled={future}
                    onClick={() => toggleHabit(d, row.id)}
                    aria-label={`toggle ${row.label} ${d}`}
                    className={`grid size-7 place-items-center rounded text-xs ${i === todayIdx ? 'ring-2 ring-accent/40 ' : ''}${
                      on
                        ? 'bg-accent/25 text-accent'
                        : future
                          ? 'cursor-default bg-surface-2/40 text-transparent'
                          : 'bg-surface-2 text-ink-faint/40 hover:bg-accent/10'
                    }`}
                  >
                    {on ? '✓' : '·'}
                  </button>
                )
              })}
            </div>
            <span className="flex w-12 shrink-0 items-center justify-end gap-0.5 text-xs tabular-nums">
              {streak > 0 ? (
                <>
                  <Flame size={11} className="text-accent" />
                  <span className="text-accent">{streak}</span>
                </>
              ) : (
                <span className="text-ink-faint">—</span>
              )}
            </span>
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-ink-muted">{pct}%</span>
            <button
              onClick={() => defs.remove(row.id)}
              aria-label="remove habit"
              className="shrink-0 text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}

      <div className="flex items-center gap-2 pt-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a habit…"
          className="w-52 rounded-[10px] border-2 border-border bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-accent"
        />
        <button onClick={add} aria-label="add habit" className="grid size-7 place-items-center rounded-[10px] bg-accent text-white hover:opacity-90">
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

export default function Habits() {
  useStoreTick()
  const selfCare = useSelfCareDefs()
  const daily = useDailyDefs()
  const { dates, todayIdx } = weekDateKeys()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Habits &amp; self-care</h1>
        <p className="text-sm text-ink-muted">
          Week of {shortDate(dates[0])} – {shortDate(dates[6])} · tap a day to mark it (today is highlighted). Apple Watch will auto-tick steps, sleep &amp; workouts once sync is wired.
        </p>
      </div>
      <Card title="Daily self-care checklist">
        <Grid defs={selfCare} dates={dates} todayIdx={todayIdx} />
      </Card>
      <Card title="Daily habit tracker">
        <Grid defs={daily} dates={dates} todayIdx={todayIdx} />
      </Card>
    </div>
  )
}

// Command Center widget — live week-completion summary across all habits.
export function HabitsWidget() {
  useStoreTick()
  const ids = [...useSelfCareDefs().items, ...useDailyDefs().items].map((h) => h.id)
  const { done, total, pct } = weekHabitStats(ids)
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-ink">{pct}%</span>
        <span className="text-sm text-ink-muted">weekly consistency</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded bg-surface-2">
        <div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-faint">{done} of {total} checks across {ids.length} habits</p>
    </div>
  )
}
