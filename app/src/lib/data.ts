// Phase 0 data access. Today this reads the imported seed in-memory; it is the
// single seam behind which the chosen sync engine (PowerSync/Triplit/RxDB/...)
// will live, so UI never imports the seed directly.
import seedJson from '@/seed/plannerSeed.json'
import type { PlannerSeed, Category, PlannerDay } from './types'

const seed = seedJson as PlannerSeed

export function getSeed(): PlannerSeed {
  return seed
}

export function getCategories(): Category[] {
  return seed.categories
}

const categoryByName = new Map(seed.categories.map((c) => [c.name.toLowerCase(), c]))

export function categoryColor(name: string | null | undefined): string {
  if (!name) return 'var(--color-ink-faint)'
  return categoryByName.get(name.toLowerCase())?.hex ?? 'var(--color-ink-faint)'
}

export function getDays(): PlannerDay[] {
  return seed.days
}

// "Today" within this seeded demo week: default to the first day until live
// dates exist. Lets the Command Center show a concrete day immediately.
export function getFocusDay(): PlannerDay {
  return seed.days[0]
}

export function weekLabel(): string {
  const f = seed.days[0]?.date
  const l = seed.days[seed.days.length - 1]?.date
  if (!f || !l) return 'This week'
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${fmt(f)} – ${fmt(l)}`
}

// Aggregate minutes-by-category across the whole week (each agenda slot = 30 min).
export function timeByCategory(): { name: string; minutes: number; hex: string }[] {
  const totals = new Map<string, number>()
  for (const day of seed.days) {
    for (const slot of day.agenda) {
      if (!slot.task || !slot.category) continue
      totals.set(slot.category, (totals.get(slot.category) ?? 0) + 30)
    }
  }
  return [...totals.entries()]
    .map(([name, minutes]) => ({ name, minutes, hex: categoryColor(name) }))
    .sort((a, b) => b.minutes - a.minutes)
}
