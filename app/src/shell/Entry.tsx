// Entry flow — the front door of Velman OS. `/welcome` shows the wordmark and a
// Continue button; `/mode` asks Personal vs Professional. The chosen mode lasts
// for the browser session (sessionStorage), and the shell redirects here until
// one is picked. What each mode actually opens is decided in the next step.
import { useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, User } from 'lucide-react'
import ShatterableGlassCard from '@/components/ui/shatterable-glass-card'
import CityHaze from '@/components/ui/city-haze'
import SlideArrowButton from '@/components/ui/slide-arrow-button'
import { getEntryMode, setEntryMode, type EntryMode } from './entryMode'

// Route guard: the app proper is unreachable until a mode has been chosen.
export function RequireEntry({ children }: { children: ReactNode }) {
  return getEntryMode() ? <>{children}</> : <Navigate to="/welcome" replace />
}

// Staggered entrance delay for .entry-rise elements.
const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties

// The photograph + its scrim. BASE_URL keeps the path correct both on the dev
// server and under the GitHub Pages sub-path.
function PhotoBackdrop() {
  return (
    <>
      <div
        className="entry-photo"
        style={{ backgroundImage: `image-set(url(${import.meta.env.BASE_URL}images/velman-bg.webp) type('image/webp'), url(${import.meta.env.BASE_URL}images/velman-bg.jpg) type('image/jpeg'))` }}
        aria-hidden="true"
      />
      <div className="entry-scrim" aria-hidden="true" />
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
      className="entry-bg relative flex min-h-screen flex-col items-center gap-10 overflow-hidden px-6 pb-16 pt-[14vh] text-center sm:pt-[16vh]"
    >
      <PhotoBackdrop />
      <CityHaze className="absolute inset-0 z-0 h-full w-full" />
      <div className="entry-rise z-10 flex flex-col items-center gap-7" style={delay(0)}>
        <div className="flex flex-col items-start">
          <span className="gc-eyebrow text-[14px] uppercase tracking-[0.3em] text-white sm:text-[17px]">Personal OS</span>
          {/* Steps up in three stages. 48px is the ceiling that still fits
              "VELMAN OS" on a 390px phone at this tracking; 96px waits for lg,
              where there is room to spare. */}
          <h1 ref={markRef} className="gc-wordmark -mt-1 text-5xl tracking-[0.14em] sm:text-7xl lg:text-8xl">
            VELMAN OS
          </h1>
          <p className="tabular-nums mt-5 self-center text-[15px] uppercase tracking-[0.34em] text-sidebar-muted">
            Dr. Gowtham
          </p>
        </div>
      </div>

      <SlideArrowButton glass onClick={() => navigate('/mode')} className="entry-rise z-10" style={delay(140)}>
        Continue
      </SlideArrowButton>
    </main>
  )
}

const MODES: {
  id: EntryMode
  title: string
  blurb: string
  icon: typeof User
  gradient: string
  shardRgb: string
}[] = [
  {
    id: 'personal',
    title: 'Personal',
    blurb: 'Your life, off the clock.',
    icon: User,
    gradient: 'bg-linear-to-br from-violet-500 to-indigo-700',
    shardRgb: '167,139,250',
  },
  {
    id: 'professional',
    title: 'Professional',
    blurb: 'Your companies and your work.',
    icon: Briefcase,
    gradient: 'bg-linear-to-br from-[#3374c8] to-[#122c52]',
    shardRgb: '125,170,230',
  },
]

export function ModeSelect() {
  const navigate = useNavigate()
  const choose = (mode: EntryMode) => {
    setEntryMode(mode)
    navigate('/', { replace: true })
  }
  return (
    <main className="entry-bg relative flex min-h-screen flex-col items-center justify-center gap-12 px-6 py-16">
      <CityHaze className="absolute inset-0 z-0 h-full w-full" />
      <button
        onClick={() => navigate('/welcome')}
        className="absolute left-5 top-5 z-10 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-sidebar-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <ArrowLeft size={13} /> Back
      </button>

      <div className="entry-rise z-10 text-center" style={delay(0)}>
        <p className="font-heading text-[13px] font-bold uppercase tracking-[0.3em] text-sidebar-muted">Velman OS</p>
        <h1 className="mt-3 font-heading text-3xl font-black tracking-[0.14em] text-white sm:text-4xl">Choose your space</h1>
      </div>

      <div className="z-10 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        {MODES.map((m, i) => (
          <div key={m.id} className="entry-rise" style={delay(120 + i * 100)}>
            <ShatterableGlassCard
              label={`Enter ${m.title}`}
              gradientClass={m.gradient}
              shardRgb={m.shardRgb}
              onShattered={() => choose(m.id)}
              className="h-[420px] w-[300px] sm:h-[460px] sm:w-[330px]"
              front={
                <div className="relative flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
                  <span className="grid size-16 place-items-center rounded-2xl bg-white/15 text-white">
                    <m.icon size={30} />
                  </span>
                  <span className="font-heading text-[22px] font-black uppercase tracking-[0.18em] text-white">
                    {m.title}
                  </span>
                  <span className="text-[15px] text-white/75">{m.blurb}</span>
                  <span className="absolute bottom-7 text-[10px] uppercase tracking-[0.26em] text-white/50">
                    Click to enter
                  </span>
                </div>
              }
              back={
                <div className="flex h-full flex-col items-center justify-center gap-2.5 p-6 text-center">
                  <span className="font-heading text-lg font-black uppercase tracking-[0.2em] text-white">{m.title}</span>
                  <span className="flex items-center gap-2 text-sm text-sidebar-muted">
                    <span className="dot-online size-1.5 rounded-full bg-online" /> Opening your space…
                  </span>
                </div>
              }
            />
          </div>
        ))}
      </div>
    </main>
  )
}
