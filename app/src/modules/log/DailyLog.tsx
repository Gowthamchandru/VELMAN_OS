import { useEffect, type ReactNode } from 'react'
import { History, CheckCircle2, ListChecks } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui'
import { useStoreTick, peekList, keysWithPrefix } from '@/lib/store'
import { prettyDate, todayKey, parseTimeToMinutes } from '@/lib/time'
import { useSelectedDate } from '@/modules/planner/plannerStore'

interface AgendaB { id: string; time: string; task: string; done: boolean }
interface TodoR { id: string; task: string; done: boolean; mit?: boolean }

function summary(date: string) {
  const agenda = (peekList<AgendaB>(`gcos.agenda.${date}`) ?? []).filter((a) => a.task)
  const todos = peekList<TodoR>(`gcos.todos.${date}`) ?? []
  return {
    date,
    blocksTotal: agenda.length,
    doneBlocks: agenda
      .filter((a) => a.done)
      .map((a) => ({ time: a.time, task: a.task }))
      .sort((x, y) => (parseTimeToMinutes(x.time) ?? 1e9) - (parseTimeToMinutes(y.time) ?? 1e9)),
    doneTodos: todos.filter((t) => t.done).map((t) => t.task),
  }
}
type Summary = ReturnType<typeof summary>

// Only days where something was actually completed.
const hasContent = (s: Summary): boolean => s.doneBlocks.length > 0 || s.doneTodos.length > 0

function activeDates(): string[] {
  const set = new Set<string>()
  for (const p of ['gcos.agenda.', 'gcos.todos.']) {
    for (const k of keysWithPrefix(p)) {
      const d = k.slice(p.length)
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d)
    }
  }
  return [...set].sort().reverse()
}

function Point({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon size={14} className="mt-0.5 shrink-0 text-accent" />
      <span className="min-w-0">
        <span className="font-heading text-[10px] font-bold uppercase tracking-wide text-ink-faint">{label} </span>
        <span className="text-ink-muted">{children}</span>
      </span>
    </li>
  )
}

function DayRecap({ s, target }: { s: Summary; target: boolean }) {
  const isToday = s.date === todayKey()
  return (
    <Card className={target ? 'ring-2 ring-accent' : ''}>
      <div id={`day-${s.date}`} className="mb-2 flex items-center gap-2">
        <h3 className="font-heading text-[12px] font-bold tracking-[0.08em] text-ink">{prettyDate(s.date)}</h3>
        {isToday && <span className="rounded-[8px] bg-accent-soft px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase tracking-wide text-accent">Today</span>}
        <span className="ml-auto font-mono text-[11px] text-ink-faint">
          {s.doneBlocks.length}/{s.blocksTotal} blocks
        </span>
      </div>

      {/* time-stamped record of what was done, in chronological order */}
      {s.doneBlocks.length > 0 && (
        <ul className="space-y-1">
          {s.doneBlocks.map((b, i) => (
            <li key={i} className="flex items-baseline gap-3 text-sm">
              <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-ink-faint">{b.time}</span>
              <CheckCircle2 size={13} className="shrink-0 translate-y-0.5 text-accent" />
              <span className="min-w-0 text-ink">{b.task}</span>
            </li>
          ))}
        </ul>
      )}

      {s.doneTodos.length > 0 && (
        <ul className={`space-y-1.5 ${s.doneBlocks.length > 0 ? 'mt-2 border-t-2 border-border pt-2' : ''}`}>
          <Point icon={ListChecks} label="Tasks done">{s.doneTodos.join(', ')}</Point>
        </ul>
      )}
    </Card>
  )
}

export default function DailyLog() {
  useStoreTick()
  const [target] = useSelectedDate()
  const days = activeDates().map(summary).filter(hasContent)

  useEffect(() => {
    if (target && target !== todayKey()) {
      document.getElementById(`day-${target}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [target])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <History size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Daily Log</h1>
          <p className="text-sm text-ink-muted">A time-stamped record of what you got done each day — your end-of-day review.</p>
        </div>
      </div>
      {days.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-ink-faint">No history yet. As you complete agenda blocks &amp; tasks, each day's record builds here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {days.map((s) => (
            <DayRecap key={s.date} s={s} target={target === s.date && target !== todayKey()} />
          ))}
        </div>
      )}
    </div>
  )
}
