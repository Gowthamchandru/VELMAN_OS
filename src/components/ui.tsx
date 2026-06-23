import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function Card({
  title,
  icon: Icon,
  action,
  children,
  className = '',
}: {
  title?: string
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border-2 border-border bg-surface p-4 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={14} className="text-accent" />}
            {title && (
              <h3 className="text-[11px] font-bold tracking-[0.12em] text-ink-faint">
                {title}
              </h3>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Pill({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[10px] px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
      style={{ background: color ? `${color}26` : 'var(--color-surface-2)' }}
    >
      {color && <span className="size-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border px-4 py-8 text-center text-sm text-ink-faint">
      {children}
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className="rounded-[10px] border-2 border-border bg-surface px-3 py-2.5">
      <div className="font-heading text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{value}</div>
      {sub && <div className="text-xs text-ink-muted">{sub}</div>}
    </div>
  )
}
