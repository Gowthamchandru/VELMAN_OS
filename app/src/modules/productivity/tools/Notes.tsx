// Notes + Rich Text Notes. Plain notes are a title/body list with pinning;
// rich notes use contentEditable with an execCommand toolbar (no editor
// dependency — the formatting set is small and the HTML is stored as-is).
import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Pin, PinOff, Bold, Italic, List, Heading } from 'lucide-react'
import { Card, Empty } from '@/components/ui'
import { useNotes, newNote, useRichNotes, newRichNote } from '../productivityStore'

const fld = 'rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent'

// Module scope, not inside the editor — a component defined during render is a
// new type on every keystroke, which remounts the button and drops focus.
function ToolBtn({ icon: Icon, label, onRun }: { icon: typeof Bold; label: string; onRun: () => void }) {
  return (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onRun} title={label} aria-label={label} className="grid size-8 place-items-center rounded-lg border-2 border-border text-ink-muted hover:border-accent hover:text-accent">
      <Icon size={14} />
    </button>
  )
}

export function Notes() {
  const { items, add, update, remove } = useNotes()
  const [openId, setOpenId] = useState<string | null>(null)
  const sorted = [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
  const open = sorted.find((n) => n.id === openId) ?? sorted[0] ?? null

  const create = () => {
    const n = newNote()
    add(n)
    setOpenId(n.id)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <Card title={`NOTES · ${items.length}`} action={<button onClick={create} className="grid size-6 place-items-center rounded-[8px] bg-accent text-white hover:opacity-90"><Plus size={14} /></button>}>
        {sorted.length === 0 ? (
          <Empty>No notes yet. Add one to start.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => setOpenId(n.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-left transition-colors ${open?.id === n.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-brand-border'}`}
                >
                  {n.pinned && <Pin size={12} className="shrink-0 text-accent" />}
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{n.title || 'Untitled'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open ? (
        <Card
          title="EDITOR"
          action={
            <span className="flex items-center gap-1.5">
              <button onClick={() => update(open.id, { pinned: !open.pinned })} title={open.pinned ? 'Unpin' : 'Pin'} className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-accent">
                {open.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              <button onClick={() => { remove(open.id); setOpenId(null) }} title="Delete note" className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-danger">
                <Trash2 size={14} />
              </button>
            </span>
          }
        >
          <input
            value={open.title}
            onChange={(e) => update(open.id, { title: e.target.value, updatedAt: Date.now() })}
            placeholder="Note title"
            className={`${fld} mb-2 w-full font-semibold`}
          />
          <textarea
            value={open.body}
            onChange={(e) => update(open.id, { body: e.target.value, updatedAt: Date.now() })}
            placeholder="Write anything…"
            rows={16}
            className={`${fld} w-full resize-y leading-relaxed`}
          />
          <div className="mt-2 text-[11px] text-ink-faint">
            {open.body.trim() ? open.body.trim().split(/\s+/).length : 0} words · saved automatically
          </div>
        </Card>
      ) : (
        <Card title="EDITOR"><Empty>Select a note, or add one.</Empty></Card>
      )}
    </div>
  )
}

export function RichTextNotes() {
  const { items, add, update, remove } = useRichNotes()
  const [openId, setOpenId] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const sorted = [...items].sort((a, b) => b.updatedAt - a.updatedAt)
  const open = sorted.find((n) => n.id === openId) ?? sorted[0] ?? null

  // Load the document into the editor only when switching notes — writing on
  // every keystroke would reset the caret to the start.
  useEffect(() => {
    if (editorRef.current && open) editorRef.current.innerHTML = open.html
  }, [open?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
    if (open && editorRef.current) update(open.id, { html: editorRef.current.innerHTML, updatedAt: Date.now() })
  }

  const create = () => {
    const n = newRichNote()
    add(n)
    setOpenId(n.id)
    if (editorRef.current) editorRef.current.innerHTML = ''
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <Card title={`RICH NOTES · ${items.length}`} action={<button onClick={create} className="grid size-6 place-items-center rounded-[8px] bg-accent text-white hover:opacity-90"><Plus size={14} /></button>}>
        {sorted.length === 0 ? (
          <Empty>No rich notes yet.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => setOpenId(n.id)}
                  className={`w-full truncate rounded-xl border-2 px-2.5 py-2 text-left text-sm transition-colors ${open?.id === n.id ? 'border-accent bg-accent-soft text-ink' : 'border-border bg-surface text-ink hover:border-brand-border'}`}
                >
                  {n.title || 'Untitled'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open ? (
        <Card
          title="FORMATTED EDITOR"
          action={<button onClick={() => { remove(open.id); setOpenId(null) }} title="Delete" className="grid size-7 place-items-center rounded-lg text-ink-faint hover:text-danger"><Trash2 size={14} /></button>}
        >
          <input
            value={open.title}
            onChange={(e) => update(open.id, { title: e.target.value, updatedAt: Date.now() })}
            placeholder="Title"
            className={`${fld} mb-2 w-full font-semibold`}
          />
          <div className="mb-2 flex flex-wrap gap-1.5">
            <ToolBtn icon={Bold} label="Bold" onRun={() => exec('bold')} />
            <ToolBtn icon={Italic} label="Italic" onRun={() => exec('italic')} />
            <ToolBtn icon={Heading} label="Heading" onRun={() => exec('formatBlock', 'h3')} />
            <ToolBtn icon={List} label="Bullet list" onRun={() => exec('insertUnorderedList')} />
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => editorRef.current && update(open.id, { html: editorRef.current.innerHTML, updatedAt: Date.now() })}
            className="prose-none min-h-[22rem] w-full rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent [&_h3]:mb-1 [&_h3]:font-heading [&_h3]:text-[13px] [&_h3]:tracking-wide [&_h3]:text-accent [&_li]:ml-4 [&_ul]:list-disc"
          />
        </Card>
      ) : (
        <Card title="FORMATTED EDITOR"><Empty>Select a note, or add one.</Empty></Card>
      )}
    </div>
  )
}
