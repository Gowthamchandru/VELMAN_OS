import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTasks, newTask, daysLeft, STATUSES, STATUS_COLOR, PRIORITY_COLOR, type Status } from '../tasksStore'

export default function Kanban() {
  const { items, add, update } = useTasks()

  const move = (id: string, current: Status, dir: -1 | 1) => {
    const i = STATUSES.indexOf(current)
    const next = STATUSES[Math.min(STATUSES.length - 1, Math.max(0, i + dir))]
    update(id, { status: next })
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[1000px] gap-3">
        {STATUSES.map((status) => {
          const cards = items.filter((t) => t.status === status)
          return (
            <div key={status} className="flex w-[210px] shrink-0 flex-col rounded-2xl border-2 border-border bg-surface-2/40 p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                  <span className="font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{status}</span>
                  <span className="text-[11px] tabular-nums text-ink-faint">{cards.length}</span>
                </div>
                <button onClick={() => add(newTask(status))} aria-label={`add to ${status}`} className="text-ink-faint hover:text-accent"><Plus size={14} /></button>
              </div>

              <div className="space-y-2">
                {cards.map((t) => {
                  const i = STATUSES.indexOf(t.status)
                  const dl = daysLeft(t.due)
                  return (
                    <div key={t.id} className="rounded-xl border-2 border-border bg-surface p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded-[8px] px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${PRIORITY_COLOR[t.priority]}1f`, color: PRIORITY_COLOR[t.priority] }}>
                          <span className="size-1.5 rounded-full" style={{ background: PRIORITY_COLOR[t.priority] }} />{t.priority}
                        </span>
                        <span className="text-[10px] text-ink-faint">{t.category}</span>
                      </div>
                      <div className="mt-1.5 text-sm leading-snug text-ink">{t.title}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-ink-faint">
                          {t.assignee}{dl !== null && <span style={{ color: dl < 0 ? '#d93a2b' : undefined }}> · {dl < 0 ? `${-dl}d late` : `${dl}d`}</span>}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => move(t.id, t.status, -1)} disabled={i === 0} aria-label="move left" className="text-ink-faint hover:text-accent disabled:opacity-30"><ChevronLeft size={15} /></button>
                          <button onClick={() => move(t.id, t.status, 1)} disabled={i === STATUSES.length - 1} aria-label="move right" className="text-ink-faint hover:text-accent disabled:opacity-30"><ChevronRight size={15} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {cards.length === 0 && <div className="rounded-xl border-2 border-dashed border-border py-6 text-center text-[11px] text-ink-faint">Empty</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
