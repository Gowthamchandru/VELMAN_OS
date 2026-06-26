// Global search across everything stored locally — including EVERY past day's
// journal (agenda, to-dos, gratitude, reflection), so "which day did I do X?"
// is answerable. Dated hits carry the day so the UI can jump straight to it.
import { keysWithPrefix, peekList } from '@/lib/store'
import { prettyDate } from '@/lib/time'

export interface SearchHit {
  label: string // the matched text
  context: string // where it lives, e.g. "Agenda · Friday, 19 Jun"
  route: string // page to open
  date?: string // day key — set the viewed day before navigating
}

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export function searchAll(query: string): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const hits: SearchHit[] = []
  const add = (label: string | undefined, context: string, route: string, date?: string) => {
    if (label && label.toLowerCase().includes(q)) hits.push({ label, context, route, date })
  }

  // --- Per-day journal (one localStorage key per day) ---
  for (const key of keysWithPrefix('gcos.agenda.')) {
    const d = key.slice('gcos.agenda.'.length)
    if (isDay(d)) for (const b of peekList<{ task: string }>(key) ?? []) add(b.task, `Agenda · ${prettyDate(d)}`, '/log', d)
  }
  for (const key of keysWithPrefix('gcos.todos.')) {
    const d = key.slice('gcos.todos.'.length)
    if (isDay(d)) for (const t of peekList<{ task: string }>(key) ?? []) add(t.task, `To-do · ${prettyDate(d)}`, '/log', d)
  }
  for (const key of keysWithPrefix('gcos.gratitude.')) {
    const d = key.slice('gcos.gratitude.'.length)
    if (isDay(d)) for (const g of peekList<{ text: string }>(key) ?? []) add(g.text, `Gratitude · ${prettyDate(d)}`, '/log', d)
  }
  for (const key of keysWithPrefix('gcos.reflection.')) {
    const d = key.slice('gcos.reflection.'.length)
    if (!isDay(d)) continue
    let val = ''
    try {
      val = localStorage.getItem(key) ?? '' // reflection is a plain string, not JSON
    } catch {
      /* ignore */
    }
    add(val, `Reflection · ${prettyDate(d)}`, '/log', d)
  }

  // --- Ongoing / module data ---
  for (const p of peekList<{ text: string }>('gcos.priorities.v1') ?? []) add(p.text, 'Weekly priority', '/')
  for (const l of peekList<{ title: string }>('gcos.loops.v1') ?? []) add(l.title, 'Open loop', '/loops')
  for (const t of peekList<{ title: string }>('gcos.work.tasks.v1') ?? []) add(t.title, 'Work task', '/work')
  for (const h of peekList<{ name: string }>('gcos.fin.holdings.v1') ?? []) add(h.name, 'Holding', '/finance')

  return hits.slice(0, 40)
}
