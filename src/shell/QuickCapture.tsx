import { useEffect, useRef, useState } from 'react'
import { Command, Check } from 'lucide-react'
import { useLoops, newLoop, CONTEXTS } from '@/modules/loops/loopsStore'

export default function QuickCapture({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { add } = useLoops()
  const [title, setTitle] = useState('')
  const [context, setContext] = useState<string>('Work')
  const [justSaved, setJustSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTitle('')
      setJustSaved(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const capture = () => {
    const t = title.trim()
    if (!t) return
    add(newLoop(t, context))
    setTitle('')
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1400)
    inputRef.current?.focus()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 pt-[18vh]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border-2 border-border bg-surface p-4 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2 text-accent">
          <Command size={15} />
          <span className="font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Quick capture
          </span>
        </div>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && capture()}
          placeholder="Capture a thought, task, or follow-up…"
          className="w-full rounded-[10px] border-2 border-border bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent focus:brand-glow"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-faint">Goes to Open Loops ·</span>
            <select
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="rounded-[10px] border-2 border-border bg-surface px-2 py-1 text-xs text-ink-muted outline-none"
            >
              {CONTEXTS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            {justSaved && (
              <span className="flex items-center gap-1 text-xs font-semibold text-online">
                <Check size={13} /> Captured
              </span>
            )}
            <button
              onClick={capture}
              className="rounded-[10px] bg-accent px-3 py-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"
            >
              Capture
            </button>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-ink-faint">
          <kbd className="font-mono">Enter</kbd> to add · <kbd className="font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  )
}
