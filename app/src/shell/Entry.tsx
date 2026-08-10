// Entry flow — the front door of Velman OS. `/welcome` shows the wordmark and a
// Continue button; `/mode` asks Personal vs Professional. The chosen mode lasts
// for the browser session (sessionStorage), and the shell redirects here until
// one is picked. What each mode actually opens is decided in the next step.
import { useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, User } from 'lucide-react'
import ModePod from '@/components/ui/mode-pod'
import CityHaze from '@/components/ui/city-haze'
import GlitchButton from '@/components/ui/glitch-button'
import { getEntryMode, setEntryMode, type EntryMode } from './entryMode'

// Route guard: the app proper is unreachable until a mode has been chosen.
export function RequireEntry({ children }: { children: ReactNode }) {
  return getEntryMode() ? <>{children}</> : <Navigate to="/welcome" replace />
}

// Staggered entrance delay for .entry-rise elements.
const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties

// The backdrop image + its scrim, shared by both entry screens. BASE_URL keeps
// the path correct on the dev server and under the GitHub Pages sub-path alike;
// `name` picks the .webp/.jpg pair, and `scrim` picks the gradient cut for the
// screen's layout — /welcome's lockup sits on the floor, /mode's is centred.
function PhotoBackdrop({ name, scrim = '' }: { name: string; scrim?: string }) {
  const url = (ext: string) => `url(${import.meta.env.BASE_URL}images/${name}.${ext})`
  return (
    <>
      <div
        className="entry-photo"
        style={{ backgroundImage: `image-set(${url('webp')} type('image/webp'), ${url('jpg')} type('image/jpeg'))` }}
        aria-hidden="true"
      />
      <div className={`entry-scrim ${scrim}`} aria-hidden="true" />
    </>
  )
}


export function Welcome() {
  const navigate = useNavigate()
  // Cursor spotlight: track the pointer relative to the wordmark and hand the
  // coordinates to CSS (no re-renders) — .gc-wordmark lights letters near it.
  const markRef = useRef<HTMLHeadingElement>(null)
  const onMove = (e: MouseEvent) => {
    const el = markRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <main
      onMouseMove={onMove}
      className="entry-bg relative flex min-h-screen flex-col items-center justify-end gap-7 overflow-hidden px-6 pb-[9vh] pt-[8vh] text-center"
    >
      <PhotoBackdrop name="velman-entry" />
      <CityHaze className="absolute inset-0 z-0 h-full w-full" />
      <div className="entry-rise z-10 flex flex-col items-center gap-7" style={delay(0)}>
        <div className="flex flex-col items-center">
          {/* Steps up in three stages. 48px is the ceiling that still fits
              "VELMAN OS" on a 390px phone at this tracking; 96px waits for lg,
              where there is room to spare. */}
          <h1
            ref={markRef}
            data-text="VELMAN OS"
            className="gc-wordmark text-5xl tracking-[0.14em] sm:text-7xl lg:text-8xl"
          >
            VELMAN OS
          </h1>
          <p className="tabular-nums mt-5 self-center text-[15px] uppercase tracking-[0.34em] text-sidebar-muted">
            Dr. Gowtham Chandru
          </p>
        </div>
      </div>

      <GlitchButton label="Continue" onClick={() => navigate('/mode')} className="entry-rise z-10" style={delay(140)} />
    </main>
  )
}

const MODES: {
  id: EntryMode
  title: string
  status: string
  icon: typeof User
  tone: string
  side: 'left' | 'right'
  graphic: 'filaments' | 'constellation'
}[] = [
  {
    id: 'personal',
    title: 'Personal',
    status: 'Active',
    icon: User,
    // Magenta, deliberately a shade off the --color-danger token: this is
    // decoration on the entry screen, not a warning state inside the app.
    tone: '#f24fe0',
    side: 'left',
    graphic: 'filaments',
  },
  {
    id: 'professional',
    title: 'Professional',
    status: 'Ready',
    icon: Briefcase,
    tone: '#00d9ff',
    side: 'right',
    graphic: 'constellation',
  },
]

export function ModeSelect() {
  const navigate = useNavigate()
  const choose = (mode: EntryMode) => {
    setEntryMode(mode)
    navigate('/', { replace: true })
  }
  return (
    <main className="entry-bg relative flex min-h-screen flex-col items-center justify-center gap-12 overflow-hidden px-6 py-16">
      <PhotoBackdrop name="velman-bg" scrim="entry-scrim--deep" />
      <CityHaze className="absolute inset-0 z-0 h-full w-full" />
      <button
        onClick={() => navigate('/welcome')}
        className="absolute left-5 top-5 z-10 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-sidebar-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <ArrowLeft size={13} /> Back
      </button>

      <div className="entry-rise z-10 text-center" style={delay(0)}>
        {/* Same face as the wordmark on /welcome, so the two screens read as one
            room. font-bold/font-black are dropped rather than overridden —
            .gc-display pins the weight, and Turbo Driver has a single cut. */}
        {/* Muted ink vanished against the lit skyline behind it. Cyan ties it to
            the heading's own bloom, but it is the dark backing shadow that
            actually buys legibility over the bright parts of the photo. */}
        <p className="gc-display text-[14px] uppercase tracking-[0.3em] text-accent [text-shadow:0_0_14px_rgba(0,217,255,0.5),0_2px_7px_rgba(4,7,14,0.95)]">
          Velman OS
        </p>
        <h1 className="gc-display mt-3 text-3xl tracking-[0.14em] text-white sm:text-4xl">Choose your space</h1>
      </div>

      <div className="z-10 flex flex-wrap items-start justify-center gap-10 sm:gap-16">
        {MODES.map((m, i) => (
          <ModePod
            key={m.id}
            title={m.title}
            status={m.status}
            icon={m.icon}
            tone={m.tone}
            side={m.side}
            graphic={m.graphic}
            onEnter={() => choose(m.id)}
            className="entry-rise"
            style={delay(120 + i * 100)}
          />
        ))}
      </div>
    </main>
  )
}
