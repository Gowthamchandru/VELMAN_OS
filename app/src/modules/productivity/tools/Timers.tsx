// Pomodoro Timer and Focus Mode. Both count down in real time, log completed
// sessions to the shared session store, and survive a tab switch by anchoring
// to a wall-clock end time rather than decrementing a counter.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Coffee, Target, Maximize2, Minimize2, Check } from 'lucide-react'
import { Card, Empty, Pill } from '@/components/ui'
import { useSessions, usePomodoroSettings, useProdTodos, newSession } from '../productivityStore'

const fld = 'rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent'
const mmss = (s: number) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

// Shared countdown: anchored to an absolute end time so backgrounding the tab
// doesn't drift the clock. Returns seconds left and controls.
function useCountdown(onDone: () => void) {
  const [endAt, setEndAt] = useState<number | null>(null)
  const [left, setLeft] = useState(0)
  const [paused, setPaused] = useState<number | null>(null)
  // Held in a ref so the interval below always calls the latest callback
  // without restarting the countdown. Written in an effect, never in render.
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone }, [onDone])

  useEffect(() => {
    if (endAt === null) return
    const tick = () => {
      const s = Math.round((endAt - Date.now()) / 1000)
      setLeft(s)
      if (s <= 0) {
        setEndAt(null)
        doneRef.current()
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endAt])

  const start = useCallback((seconds: number) => { setPaused(null); setEndAt(Date.now() + seconds * 1000) }, [])
  const pause = useCallback(() => { if (endAt) { setPaused(Math.max(0, Math.round((endAt - Date.now()) / 1000))); setEndAt(null) } }, [endAt])
  const resume = useCallback(() => { if (paused !== null) { setEndAt(Date.now() + paused * 1000); setPaused(null) } }, [paused])
  const stop = useCallback(() => { setEndAt(null); setPaused(null); setLeft(0) }, [])

  return { left: endAt ? left : (paused ?? 0), running: endAt !== null, paused: paused !== null, start, pause, resume, stop }
}

function ding() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    osc.start()
    osc.stop(ctx.currentTime + 0.95)
    setTimeout(() => ctx.close().catch(() => {}), 1200)
  } catch {
    /* audio unavailable — the visual state is the real signal */
  }
}

export function Pomodoro() {
  const { work, brk, setWork, setBrk } = usePomodoroSettings()
  const { items: sessions, add } = useSessions()
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [label, setLabel] = useState('')
  const [rounds, setRounds] = useState(0)

  const handleDone = () => {
    ding()
    if (mode === 'work') {
      add(newSession(label.trim() || 'Focus block', work, 'pomodoro'))
      setRounds((r) => r + 1)
      setMode('break')
    } else {
      setMode('work')
    }
  }

  const timer = useCountdown(handleDone)
  const total = (mode === 'work' ? work : brk) * 60
  const shown = timer.running || timer.paused ? timer.left : total
  const pct = total ? Math.max(0, Math.min(100, ((total - shown) / total) * 100)) : 0

  const todayCount = sessions.filter((s) => s.kind === 'pomodoro' && new Date(s.at).toDateString() === new Date().toDateString()).length

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card title={mode === 'work' ? 'FOCUS BLOCK' : 'BREAK'} icon={mode === 'work' ? Target : Coffee}>
        <div className="flex flex-col items-center py-4">
          <div className="relative grid size-56 place-items-center">
            <svg width="224" height="224" className="-rotate-90">
              <circle cx="112" cy="112" r="100" fill="none" stroke="var(--color-surface-2)" strokeWidth="12" />
              <circle
                cx="112" cy="112" r="100" fill="none"
                stroke={mode === 'work' ? '#00d9ff' : '#00ffa3'}
                strokeWidth="12" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 100}
                strokeDashoffset={2 * Math.PI * 100 * (1 - pct / 100)}
                style={{ transition: 'stroke-dashoffset 0.3s linear' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-5xl font-semibold tabular-nums text-ink">{mmss(shown)}</span>
              <span className="mt-1 font-heading text-[10px] uppercase tracking-[0.2em] text-ink-faint">{mode === 'work' ? 'work' : 'rest'}</span>
            </div>
          </div>

          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What are you working on?"
            className={`${fld} mt-5 w-full max-w-sm text-center`}
          />

          <div className="mt-4 flex gap-2">
            {!timer.running && !timer.paused && (
              <button onClick={() => timer.start(total)} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-5 py-2.5 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:opacity-90"><Play size={14} /> Start</button>
            )}
            {timer.running && (
              <button onClick={timer.pause} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-5 py-2.5 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:opacity-90"><Pause size={14} /> Pause</button>
            )}
            {timer.paused && (
              <button onClick={timer.resume} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-5 py-2.5 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:opacity-90"><Play size={14} /> Resume</button>
            )}
            <button onClick={timer.stop} className="flex items-center gap-1.5 rounded-[10px] border-2 border-border px-4 py-2.5 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted hover:border-accent hover:text-accent"><RotateCcw size={14} /> Reset</button>
            <button onClick={() => { timer.stop(); setMode(mode === 'work' ? 'break' : 'work') }} className="rounded-[10px] border-2 border-border px-4 py-2.5 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted hover:border-accent hover:text-accent">
              {mode === 'work' ? 'Skip to break' : 'Back to work'}
            </button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="SETTINGS">
          <label className="mb-2 block text-xs text-ink-muted">Work minutes
            <input type="number" min={1} max={120} value={work} onChange={(e) => setWork(Math.max(1, +e.target.value || 25))} className={`${fld} mt-1 w-full`} />
          </label>
          <label className="block text-xs text-ink-muted">Break minutes
            <input type="number" min={1} max={60} value={brk} onChange={(e) => setBrk(Math.max(1, +e.target.value || 5))} className={`${fld} mt-1 w-full`} />
          </label>
        </Card>

        <Card title="TODAY">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular-nums text-ink">{todayCount}</span>
            <span className="text-sm text-ink-muted">pomodoros</span>
          </div>
          <div className="mt-1 text-xs text-ink-faint">{rounds} this sitting · {todayCount * work} min focused today</div>
        </Card>

        <Card title="RECENT">
          {sessions.length === 0 ? <Empty>No sessions logged yet.</Empty> : (
            <ul className="space-y-1.5">
              {[...sessions].sort((a, b) => b.at - a.at).slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs">
                  <Pill color={s.kind === 'focus' ? '#a78bfa' : '#00d9ff'}>{s.minutes}m</Pill>
                  <span className="min-w-0 flex-1 truncate text-ink-muted">{s.label}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

export function FocusMode() {
  const { items: todos, update } = useProdTodos()
  const { items: sessions, add } = useSessions()
  const [taskId, setTaskId] = useState('')
  const [minutes, setMinutes] = useState(50)
  const [full, setFull] = useState(false)
  const open = todos.filter((t) => !t.done)
  const task = open.find((t) => t.id === taskId)
  const label = task?.text ?? 'Deep work'

  const handleDone = () => {
    ding()
    add(newSession(label, minutes, 'focus'))
    setFull(false)
  }

  const timer = useCountdown(handleDone)
  const shown = timer.running || timer.paused ? timer.left : minutes * 60

  // Escape leaves the distraction-free overlay.
  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [full])

  const focusedToday = sessions
    .filter((s) => s.kind === 'focus' && new Date(s.at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.minutes, 0)

  if (full) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#04070e] px-6 text-center">
        <span className="font-heading text-[11px] uppercase tracking-[0.34em] text-ink-faint">Focus</span>
        <h2 className="max-w-2xl text-2xl text-ink">{label}</h2>
        <div className="font-mono text-[5.5rem] font-semibold leading-none tabular-nums text-accent" style={{ textShadow: '0 0 40px rgba(0,217,255,0.45)' }}>
          {mmss(shown)}
        </div>
        <div className="flex gap-2">
          {timer.running
            ? <button onClick={timer.pause} className="flex items-center gap-1.5 rounded-[10px] border-2 border-border px-4 py-2 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted hover:border-accent hover:text-accent"><Pause size={14} /> Pause</button>
            : <button onClick={() => (timer.paused ? timer.resume() : timer.start(minutes * 60))} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-5 py-2 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:opacity-90"><Play size={14} /> {timer.paused ? 'Resume' : 'Start'}</button>}
          {task && (
            <button onClick={() => { update(task.id, { done: true }); setFull(false) }} className="flex items-center gap-1.5 rounded-[10px] border-2 border-online/50 px-4 py-2 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-online hover:bg-online/10"><Check size={14} /> Done</button>
          )}
          <button onClick={() => setFull(false)} className="flex items-center gap-1.5 rounded-[10px] border-2 border-border px-4 py-2 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted hover:text-ink"><Minimize2 size={14} /> Exit</button>
        </div>
        <p className="text-[11px] text-ink-faint">Press Esc to leave focus mode</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <Card title="FOCUS MODE" icon={Target}>
        <p className="text-sm text-ink-muted">Pick one thing, set a length, and go full-screen. Everything else disappears until the timer ends or you leave.</p>
        <div className="mt-3 space-y-2">
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={`${fld} w-full`}>
            <option value="">Deep work (no specific task)</option>
            {open.map((t) => <option key={t.id} value={t.id}>{t.text}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            {[25, 50, 90].map((m) => (
              <button key={m} onClick={() => setMinutes(m)} className={`rounded-[10px] border-2 px-3.5 py-2 font-heading text-[11px] font-bold uppercase tracking-[0.12em] ${minutes === m ? 'border-accent text-accent' : 'border-border text-ink-muted hover:border-brand-border'}`}>{m} min</button>
            ))}
            <input type="number" min={1} max={240} value={minutes} onChange={(e) => setMinutes(Math.max(1, +e.target.value || 50))} className={`${fld} w-24`} />
          </div>
          <button
            onClick={() => { setFull(true); timer.start(minutes * 60) }}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent py-2.5 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:opacity-90"
          >
            <Maximize2 size={14} /> Enter focus mode
          </button>
        </div>
        {open.length === 0 && <p className="mt-2 text-[11px] text-ink-faint">Tip: add tasks in the To-do List tile and they'll appear here.</p>}
      </Card>

      <Card title="FOCUSED TODAY">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-semibold tabular-nums text-ink">{focusedToday}</span>
          <span className="text-sm text-ink-muted">minutes</span>
        </div>
        <div className="mt-1 text-xs text-ink-faint">across {sessions.filter((s) => s.kind === 'focus').length} sessions all-time</div>
      </Card>
    </div>
  )
}
