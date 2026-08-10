// The entry-mode selector's holographic pod: a glass sphere suspended in a
// bracket frame over a lit bar, with a status tag reading up the side.
//
// One component serves both modes. Everything that differs — hue, interior
// graphic, label, status word, which side the tag hangs on — is passed in, and
// the hue reaches every layer through a single `--tone` custom property rather
// than a per-mode stylesheet.
//
// The two interior graphics are generated once at module scope from a seeded
// PRNG, never during render: React Compiler rejects impure render bodies, and
// geometry that reshuffled on every paint would strobe.
import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'

// mulberry32 — small, fast, and fully determined by its seed, so the filament
// and constellation layouts are identical on every load and every machine.
function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const R = 100 // interior graphics are drawn in a 0 0 200 200 viewBox

// Sampled rather than estimated: each travelling pulse is a one-dash stroke
// pattern whose gap must equal its own path's length, or the pulse wraps early
// or never reaches the tip. 24 steps is past the point where more shows.
function cubicLen(p0: number[], c1: number[], c2: number[], p3: number[], steps = 24) {
  let len = 0
  let prev = p0
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0]
    const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1]
    len += Math.hypot(x - prev[0], y - prev[1])
    prev = [x, y]
  }
  return len
}

// Staggered but deterministic. Stepping by the golden ratio's fractional part
// is a low-discrepancy sequence: it spreads phases evenly for ANY count and
// never lands twice on the same value, so the pulses read as traffic rather
// than a metronome. An integer step would have to be coprime with the count to
// do that — (i * 7) % 14 yields only two distinct phases, which is exactly the
// lock-step this is here to avoid.
const PHI = 0.6180339887498949
const stagger = (i: number, span: number) => ((i * PHI) % 1) * span

const PULSE_SPAN = 3.2 // seconds — must match --dur on .gc-pod-pulse

// Personal: filaments branching out of a common core, like a lit-up nerve.
const FILAMENTS = (() => {
  const rand = seeded(0x5eed)
  const main: { d: string; len: number; delay: number }[] = []
  const forks: string[] = []
  const nodes: [number, number][] = []
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand() * 0.3
    const reach = 46 + rand() * 30
    // Two control points swung off-axis give each filament its own curl.
    const c1 = [R + Math.cos(a - 0.5) * reach * 0.45, R + Math.sin(a - 0.5) * reach * 0.45]
    const c2 = [R + Math.cos(a + 0.6) * reach * 0.8, R + Math.sin(a + 0.6) * reach * 0.8]
    const end = [R + Math.cos(a) * reach, R + Math.sin(a) * reach]
    main.push({
      d: `M${R} ${R} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`,
      len: cubicLen([R, R], c1, c2, end),
      delay: stagger(i, PULSE_SPAN),
    })
    nodes.push([end[0], end[1]])
    // A short fork off the tip, so the outer edge frays instead of stopping dead.
    const fa = a + (rand() - 0.5) * 1.4
    const fr = reach * (0.55 + rand() * 0.3)
    forks.push(
      `M${end[0].toFixed(1)} ${end[1].toFixed(1)} Q${(end[0] + Math.cos(fa) * fr * 0.4).toFixed(1)} ${(end[1] + Math.sin(fa) * fr * 0.4).toFixed(1)} ${(end[0] + Math.cos(fa) * fr * 0.6).toFixed(1)} ${(end[1] + Math.sin(fa) * fr * 0.6).toFixed(1)}`,
    )
  }
  return { main, forks, nodes }
})()

// Professional: nodes scattered over a sphere and wired to their neighbours —
// a network, where Personal gets an organism.
const CONSTELLATION = (() => {
  const rand = seeded(0xc0ffee)
  const nodes: [number, number, number][] = [] // x, y, depth (0 = far, 1 = near)
  for (let i = 0; i < 22; i++) {
    // Even spread over a disc: sqrt keeps points off the centre-heavy default.
    const a = rand() * Math.PI * 2
    const d = Math.sqrt(rand()) * 74
    nodes.push([R + Math.cos(a) * d, R + Math.sin(a) * d * 0.92, rand()])
  }
  const links: { a: number[]; b: number[]; len: number }[] = []
  const seen: [number, number][] = []
  nodes.forEach((n, i) => {
    // Wire each node to its two nearest neighbours; duplicates are dropped so a
    // mutual pair is not stroked twice at double opacity.
    const near = nodes
      .map((m, j) => ({ j, d: Math.hypot(m[0] - n[0], m[1] - n[1]) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
    near.forEach(({ j }) => {
      const key: [number, number] = i < j ? [i, j] : [j, i]
      if (seen.some(([p, q]) => p === key[0] && q === key[1])) return
      seen.push(key)
      const a = nodes[key[0]]
      const b = nodes[key[1]]
      links.push({ a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) })
    })
  })
  // Only the longest third carry traffic. Pulsing every link at once reads as
  // noise, and the short ones are over before the eye catches them.
  const lit = [...links]
    .sort((x, y) => y.len - x.len)
    .slice(0, Math.max(1, Math.round(links.length / 3)))
    .map((l, k) => ({ ...l, delay: stagger(k, PULSE_SPAN) }))
  return { nodes, links, lit }
})()

// Inline styles feeding the stylesheet's per-element animation variables.
const pulseStyle = (len: number, delay: number) =>
  ({ '--len': `${len.toFixed(1)}px`, animationDelay: `${delay.toFixed(2)}s` }) as CSSProperties
const nodeStyle = (i: number) =>
  ({ animationDelay: `${stagger(i, 2.8).toFixed(2)}s` }) as CSSProperties

function Filaments() {
  return (
    <svg className="gc-pod-web" viewBox="0 0 200 200" aria-hidden="true">
      <g className="gc-pod-web-spin">
        <g className="gc-pod-web-breathe">
          {/* The core the filaments grow out of, beating off the pulse rate so
              the two never lock into one visible rhythm. */}
          <circle className="gc-pod-core" cx={R} cy={R} r={5} fill="var(--tone)" />
          {FILAMENTS.forks.map((d, i) => (
            <path key={`f${i}`} d={d} fill="none" stroke="var(--tone)" strokeWidth={0.7} strokeLinecap="round" opacity={0.5} />
          ))}
          {FILAMENTS.main.map(({ d }, i) => (
            <path key={`m${i}`} d={d} fill="none" stroke="var(--tone)" strokeWidth={1.2} strokeLinecap="round" opacity={0.85} />
          ))}
          {/* Signal running outward: a second copy of each filament, dashed to
              one short segment that travels the whole length. */}
          {FILAMENTS.main.map(({ d, len, delay }, i) => (
            <path
              key={`p${i}`}
              className="gc-pod-pulse"
              style={pulseStyle(len, delay)}
              d={d}
              fill="none"
              stroke="var(--tone)"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          ))}
          {FILAMENTS.nodes.map(([x, y], i) => (
            <circle key={`n${i}`} className="gc-pod-node" style={nodeStyle(i)} cx={x} cy={y} r={1.7} fill="var(--tone)" />
          ))}
        </g>
      </g>
    </svg>
  )
}

function Constellation() {
  return (
    <svg className="gc-pod-web" viewBox="0 0 200 200" aria-hidden="true">
      <g className="gc-pod-web-spin">
        <g className="gc-pod-web-breathe">
          {CONSTELLATION.links.map(({ a, b }, k) => (
            <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--tone)" strokeWidth={0.6} opacity={0.45} />
          ))}
          {CONSTELLATION.lit.map(({ a, b, len, delay }, k) => (
            <line
              key={`p${k}`}
              className="gc-pod-pulse"
              style={pulseStyle(len, delay)}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke="var(--tone)"
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          ))}
          {CONSTELLATION.nodes.map(([x, y, z], i) => (
            // Depth is faked with size and opacity — cheaper than a real
            // projection and indistinguishable at this scale.
            <circle
              key={i}
              className="gc-pod-node"
              style={nodeStyle(i)}
              cx={x}
              cy={y}
              r={1.2 + z * 1.9}
              fill="var(--tone)"
              opacity={0.4 + z * 0.6}
            />
          ))}
        </g>
      </g>
    </svg>
  )
}

export interface ModePodProps {
  title: string
  status: string
  icon: LucideIcon
  tone: string
  /** Which side the vertical status tag hangs on. */
  side: 'left' | 'right'
  graphic: 'filaments' | 'constellation'
  onEnter: () => void
  className?: string
  style?: CSSProperties
}

export default function ModePod({ title, status, icon: Icon, tone, side, graphic, onEnter, className = '', style }: ModePodProps) {
  const [charging, setCharging] = useState(false)
  // Held in a ref so a double-click cannot queue two navigations.
  const timer = useRef<number | null>(null)

  const fire = () => {
    if (timer.current !== null) return
    setCharging(true)
    timer.current = window.setTimeout(onEnter, 460)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fire()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Enter ${title}`}
      onClick={fire}
      onKeyDown={onKeyDown}
      className={`gc-pod ${charging ? 'is-charging' : ''} ${className}`}
      style={{ ...style, '--tone': tone } as CSSProperties}
    >
      <span className={`gc-pod-status gc-pod-status--${side}`} aria-hidden="true">
        Status: {status}
      </span>

      <div className="gc-pod-stage">
        {/* Frame and ring share one viewBox so they stay locked together at
            every size — no chance of a border-radius and a circle drifting. */}
        <svg className="gc-pod-chrome" viewBox="0 0 300 300" aria-hidden="true">
          {/* Two passes of the same rect: a faint continuous outline, then a
              bright copy dashed so only the four corner arcs survive. Both
              share every coordinate, so they can never drift apart. */}
          <rect className="gc-pod-bracket" x="14" y="14" width="272" height="272" rx="76" />
          <rect className="gc-pod-bracket-lit" x="14" y="14" width="272" height="272" rx="76" />
          <circle className="gc-pod-ring" cx="150" cy="150" r="119" />
          <circle className="gc-pod-ring-inner" cx="150" cy="150" r="113" />
        </svg>

        <div className="gc-pod-glass">
          {graphic === 'filaments' ? <Filaments /> : <Constellation />}
          <Icon className="gc-pod-icon" size={64} strokeWidth={1.5} aria-hidden="true" />
          <span className="gc-pod-title">{title}</span>
        </div>
      </div>

      <div className="gc-pod-base" aria-hidden="true">
        <span className="gc-pod-base-top" />
      </div>

      <span className="gc-pod-cta">Click to enter</span>
    </div>
  )
}
