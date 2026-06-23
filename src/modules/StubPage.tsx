import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui'

// Placeholder page for pillars whose build phase comes later. Lists the
// planned scope so the roadmap is visible inside the app itself.
export default function StubPage({
  title,
  icon: Icon,
  blurb,
  planned,
}: {
  title: string
  icon: LucideIcon
  blurb: string
  planned: string[]
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <Icon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="text-sm text-ink-muted">{blurb}</p>
        </div>
      </div>
      <Card title="Planned for this module">
        <ul className="grid gap-2 sm:grid-cols-2">
          {planned.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-ink-muted">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
              {p}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
