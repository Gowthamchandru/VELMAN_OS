import { useState, useEffect } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { Command, CalendarDays, Newspaper, Sparkles } from 'lucide-react'
import { modules } from './registry'
import QuickCapture from './QuickCapture'
import Assistant from './Assistant'
import { useNow, dateLabel, clockLabel, weekRangeLabel } from '@/lib/time'
import { useTopHeadlines } from '@/modules/news/newsData'

function StatusDot({ status }: { status?: string }) {
  if (status === 'planned') {
    return <span className="size-2 rounded-full border-2 border-dashed border-down opacity-80" />
  }
  return <span className="dot-online size-2 rounded-full bg-online" />
}

// Live news ticker in the topbar (where search used to be). Click → News page.
function NewsTicker() {
  const items = useTopHeadlines()
  const row = items.map((t) => `${t.title}  ·  ${t.vertical}`)
  return (
    <Link to="/news" className="flex h-full min-w-0 flex-1 items-center gap-2" title="Open News">
      <span className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-accent px-2 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wide text-white">
        <Newspaper size={11} /> News
      </span>
      {row.length === 0 ? (
        <span className="text-sm text-ink-faint">Fetching latest headlines…</span>
      ) : (
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="gc-ticker">
            {[0, 1].map((seg) => (
              <span key={seg} className="gc-ticker-seg" aria-hidden={seg === 1}>
                {row.map((t, i) => (
                  <span key={i} className="mx-5 inline-flex items-center gap-2 text-sm text-ink-muted">
                    <span className="size-1 rounded-full bg-accent" /> {t}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}
    </Link>
  )
}

export default function Shell() {
  const [captureOpen, setCaptureOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const now = useNow()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const k = e.key.toLowerCase()
      if (k === 'k') {
        e.preventDefault()
        setCaptureOpen((v) => !v)
      } else if (k === 'j') {
        e.preventDefault()
        setAssistantOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r-2 border-border bg-surface">
        <div className="flex items-center gap-3 border-b-2 border-border px-5 py-4">
          <div
            className="grid size-9 place-items-center rounded-[10px] border font-heading text-[13px] font-bold text-accent"
            style={{ background: 'var(--color-accent-soft)', borderColor: 'var(--color-brand-border)' }}
          >
            GC
          </div>
          <div className="leading-tight">
            <div className="font-heading text-[12px] font-extrabold tracking-[0.12em] text-ink">GC OS</div>
            <div className="text-xs text-ink-muted">Dr. Gowtham</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-3.5">
          {modules
            .filter((m) => m.nav)
            .map((m) => (
              <NavLink
                key={m.id}
                to={m.route}
                end={m.route === '/'}
                style={({ isActive }) => (isActive ? { boxShadow: 'inset 4px 0 0 var(--color-accent)' } : undefined)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${
                    isActive ? 'bg-accent-soft text-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                  }`
                }
              >
                <m.icon size={16} />
                <span className="flex-1 font-heading text-[10px] font-bold tracking-[0.16em] uppercase">{m.title}</span>
                <StatusDot status={m.status} />
              </NavLink>
            ))}
        </nav>

        <div className="border-t-2 border-border px-3.5 pt-3.5">
          <button
            onClick={() => setAssistantOpen(true)}
            className="group flex w-full items-center gap-2 rounded-[10px] border-2 border-accent bg-accent px-3 py-2.5 text-white hover:opacity-95 hover:brand-glow"
            title="Ask the assistant (⌘J)"
          >
            <Sparkles size={15} className="shrink-0" />
            <span className="flex-1 text-left font-heading text-[10px] font-bold tracking-[0.14em] uppercase">Ask Assistant</span>
            <kbd className="font-mono text-[10px] text-white/70">⌘J</kbd>
          </button>
        </div>

        <div className="px-3.5 py-3.5">
          <button
            onClick={() => setCaptureOpen(true)}
            className="flex w-full items-center gap-2 rounded-[10px] border-2 border-border bg-surface px-3 py-2.5 text-ink-muted hover:text-accent hover:brand-glow"
            title="Quick capture (⌘K)"
          >
            <Command size={14} />
            <span className="flex-1 text-left font-heading text-[10px] font-bold tracking-[0.14em] uppercase">Quick capture</span>
            <kbd className="font-mono text-[10px] text-ink-faint">⌘K</kbd>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-4 border-b-2 border-border bg-surface px-5">
          <NewsTicker />
          <div className="flex shrink-0 items-center gap-2 font-mono">
            <span className="hidden items-center gap-1 text-sm font-bold text-ink-muted sm:inline-flex">
              <CalendarDays size={12} className="text-accent" /> {weekRangeLabel(now)}
            </span>
            <span className="hidden text-ink-faint md:inline">·</span>
            <span className="hidden text-sm font-semibold text-ink-muted md:inline">{dateLabel(now)}</span>
            <span className="text-base font-bold tabular-nums text-ink">{clockLabel(now)}</span>
            <span className="dot-online size-1.5 rounded-full bg-online" title="local · synced" />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <Outlet />
        </main>
      </div>

      <QuickCapture open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <Assistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  )
}
