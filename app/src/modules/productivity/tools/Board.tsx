// Personal Kanban board — drag cards between columns (HTML5 DnD), with a
// keyboard fallback via the ‹ › buttons so it works without a mouse.
//
// Separate from Work ▸ Kanban on purpose: that board tracks company tasks with
// assignees and due dates; this one is a scratch board for personal work.
import { useState } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui'
import { useKanban, newKanbanCard, KANBAN_COLS, type KanbanCol } from '../productivityStore'

const fld = 'rounded-[10px] border-2 border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent'
const COL_COLOR: Record<KanbanCol, string> = {
  'To do': '#566d91',
  Doing: '#00d9ff',
  Blocked: '#ff2e63',
  Done: '#00ffa3',
}

export function KanbanBoard() {
  const { items, add, update, remove } = useKanban()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<KanbanCol | null>(null)

  const addTo = (col: KanbanCol) => {
    const t = (draft[col] ?? '').trim()
    if (!t) return
    add(newKanbanCard(col, t))
    setDraft((d) => ({ ...d, [col]: '' }))
  }

  const move = (id: string, dir: -1 | 1) => {
    const card = items.find((c) => c.id === id)
    if (!card) return
    const i = KANBAN_COLS.indexOf(card.col)
    const next = KANBAN_COLS[Math.min(KANBAN_COLS.length - 1, Math.max(0, i + dir))]
    if (next !== card.col) update(id, { col: next })
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {KANBAN_COLS.map((col) => {
        const cards = items.filter((c) => c.col === col)
        return (
          <Card
            key={col}
            title={col}
            className={overCol === col ? 'ring-2 ring-accent' : ''}
            action={<span className="font-mono text-[11px] tabular-nums" style={{ color: COL_COLOR[col] }}>{cards.length}</span>}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setOverCol(col) }}
              onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
              onDrop={(e) => {
                e.preventDefault()
                setOverCol(null)
                if (dragId) update(dragId, { col })
                setDragId(null)
              }}
              className="min-h-[8rem] space-y-2"
            >
              {cards.map((c) => {
                const i = KANBAN_COLS.indexOf(c.col)
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null) }}
                    className={`cursor-grab rounded-xl border-2 border-border bg-surface p-2.5 transition-opacity active:cursor-grabbing ${dragId === c.id ? 'opacity-40' : ''}`}
                    style={{ borderLeftColor: COL_COLOR[col], borderLeftWidth: 3 }}
                  >
                    <div className="text-sm text-ink">{c.text}</div>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button onClick={() => move(c.id, -1)} disabled={i === 0} aria-label="Move left" className="grid size-6 place-items-center rounded text-ink-faint hover:text-accent disabled:opacity-25"><ChevronLeft size={13} /></button>
                      <button onClick={() => move(c.id, 1)} disabled={i === KANBAN_COLS.length - 1} aria-label="Move right" className="grid size-6 place-items-center rounded text-ink-faint hover:text-accent disabled:opacity-25"><ChevronRight size={13} /></button>
                      <button onClick={() => remove(c.id)} aria-label="Delete card" className="ml-auto grid size-6 place-items-center rounded text-ink-faint hover:text-danger"><Trash2 size={12} /></button>
                    </div>
                  </div>
                )
              })}
              {cards.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-border px-3 py-5 text-center text-xs text-ink-faint">Drop cards here</div>
              )}
            </div>

            <div className="mt-2 flex gap-1.5">
              <input
                value={draft[col] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [col]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addTo(col)}
                placeholder="Add card…"
                className={`${fld} min-w-0 flex-1 text-xs`}
              />
              <button onClick={() => addTo(col)} className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-accent text-white hover:opacity-90"><Plus size={13} /></button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
