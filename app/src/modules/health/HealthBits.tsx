import type { ReactNode } from 'react'

const BAND: Record<string, string> = {
  green: '#059669',
  amber: '#d97706',
  red: '#d93a2b',
}

export function bandColor(band: string): string {
  return BAND[band] ?? 'var(--color-accent)'
}

export function BandPill({ band, children }: { band: string; children: ReactNode }) {
  const c = bandColor(band)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: `${c}22`, color: c }}
    >
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {children}
    </span>
  )
}

// A single circular gauge (0–100% of goal) with a centered value.
export function Gauge({
  pct,
  color,
  size = 92,
  stroke = 9,
  center,
  sub,
}: {
  pct: number
  color: string
  size?: number
  stroke?: number
  center: ReactNode
  sub?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg font-semibold leading-none text-ink">{center}</div>
        {sub && <div className="mt-0.5 text-[10px] text-ink-faint">{sub}</div>}
      </div>
    </div>
  )
}

// Three concentric Apple-style activity rings.
export function ActivityRings({
  rings,
  size = 100,
}: {
  rings: { pct: number; color: string }[]
  size?: number
}) {
  const stroke = 9
  const gap = 4
  return (
    <svg width={size} height={size} className="-rotate-90">
      {rings.map((ring, i) => {
        const r = (size - stroke) / 2 - i * (stroke + gap)
        const c = 2 * Math.PI * r
        const clamped = Math.max(0, Math.min(100, ring.pct))
        return (
          <g key={i}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${ring.color}22`} strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={ring.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c - (clamped / 100) * c}
            />
          </g>
        )
      })}
    </svg>
  )
}
