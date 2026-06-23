// Editable planner core. Seeded ONCE from the imported Excel sheet, then fully
// editable + persistent via the localStorage store. Same seam PowerSync replaces.
import seedJson from '@/seed/plannerSeed.json'
import type { PlannerSeed } from '@/lib/types'
import { useCollection, useLocalValue, useEphemeral, peekList, uid } from '@/lib/store'
import { todayKey, addDaysKey } from '@/lib/time'

const s = seedJson as PlannerSeed

export interface Priority {
  id: string
  text: string
  done: boolean
}
export interface Todo {
  id: string
  task: string
  done: boolean
  mit?: boolean // a Most Important Task
}
export interface TrackerRow {
  id: string
  label: string
  days: boolean[] // length 7
}
export interface AgendaBlock {
  id: string
  time: string // "9:00 AM"
  task: string
  category: string
  done: boolean
}
export interface GratitudeLine {
  id: string
  text: string
}

// Example "this week's priorities" (founder context) — edit or replace freely.
const prioritySeed: Priority[] = [
  { id: 'pri-0', text: 'Close the Series A round', done: false },
  { id: 'pri-1', text: 'Hire the Head of Product', done: false },
  { id: 'pri-2', text: 'Ship the v2 dashboard', done: false },
  { id: 'pri-3', text: 'Finalise the Q3 budget', done: true },
]

// One-time example content for TODAY so the page isn't bare (see seedExamplesOnce).
const exampleAgenda: AgendaBlock[] = [
  { id: 'ex-ag-0', time: '7:00 AM', task: 'Morning workout', category: 'Health', done: true },
  { id: 'ex-ag-1', time: '8:30 AM', task: 'Review inbox & plan the day', category: 'Work', done: true },
  { id: 'ex-ag-2', time: '9:30 AM', task: 'Team standup', category: 'Work', done: false },
  { id: 'ex-ag-3', time: '11:00 AM', task: 'Investor call', category: 'Work', done: false },
  { id: 'ex-ag-4', time: '1:00 PM', task: 'Lunch break', category: 'Personal', done: false },
  { id: 'ex-ag-5', time: '3:00 PM', task: 'Product review', category: 'Work', done: false },
  { id: 'ex-ag-6', time: '6:30 PM', task: 'Evening walk', category: 'Health', done: false },
  { id: 'ex-ag-7', time: '9:00 PM', task: 'Family time', category: 'Family', done: false },
]
const exampleTodos: Todo[] = [
  { id: 'ex-td-0', task: 'Reply to investor intro email', done: false, mit: true },
  { id: 'ex-td-1', task: 'Review Q2 financials', done: false, mit: true },
  { id: 'ex-td-2', task: 'Approve marketing budget', done: false, mit: false },
  { id: 'ex-td-3', task: 'Sign vendor contract', done: true, mit: false },
]
const exampleGratitude: GratitudeLine[] = [
  { id: 'ex-gr-0', text: 'Grateful for a healthy, energetic start to the day.' },
  { id: 'ex-gr-1', text: 'Grateful for a team I can rely on.' },
  { id: 'ex-gr-2', text: 'Grateful for steady progress on the business.' },
]

const selfCareSeed: TrackerRow[] = s.selfCare.map((r, i) => ({ id: `sc-${i}`, label: r.label, days: [...r.days] }))
const habitSeed: TrackerRow[] = s.habits.map((r, i) => ({ id: `hab-${i}`, label: r.label, days: [...r.days] }))

// The day currently being viewed/edited. Defaults to today; resets each load.
export const useSelectedDate = () => useEphemeral('gcos.selectedDate', todayKey())

// ---- Weekly / ongoing (NOT per-day) ----
export const usePriorities = () => useCollection<Priority>('gcos.priorities.v2', prioritySeed)
export const useSelfCare = () => useCollection<TrackerRow>('gcos.selfcare.v1', selfCareSeed)
export const useHabits = () => useCollection<TrackerRow>('gcos.habits.v1', habitSeed)

// ---- Per-day records, keyed by 'YYYY-MM-DD'. New days start empty. ----
export const agendaKey = (date: string) => `gcos.agenda.${date}`
export const todosKey = (date: string) => `gcos.todos.${date}`
export const gratitudeKey = (date: string) => `gcos.gratitude.${date}`
export const reflectionKey = (date: string) => `gcos.reflection.${date}`

export const useAgenda = (date: string) => useCollection<AgendaBlock>(agendaKey(date), [])
export const useGratitude = (date: string) => useCollection<GratitudeLine>(gratitudeKey(date), [])
export const useReflection = (date: string) => useLocalValue(reflectionKey(date), '')

// One-time: populate TODAY with example content so a fresh install isn't bare.
// Guarded by a flag so it runs once; afterwards every day follows the per-day
// design (new days start empty / carry yesterday's open to-dos).
function seedExamplesOnce() {
  try {
    const FLAG = 'gcos.examplesSeeded.v1'
    if (localStorage.getItem(FLAG)) return
    const d = todayKey()
    const setIfEmpty = (key: string, val: unknown[]) => {
      const cur = peekList(key)
      if (!cur || cur.length === 0) localStorage.setItem(key, JSON.stringify(val))
    }
    setIfEmpty(agendaKey(d), exampleAgenda)
    setIfEmpty(todosKey(d), exampleTodos)
    setIfEmpty(gratitudeKey(d), exampleGratitude)
    localStorage.setItem(FLAG, '1')
  } catch {
    /* ignore */
  }
}
seedExamplesOnce()

// Roll-forward: when TODAY is first opened, seed it with the most recent past
// day's open to-dos, flagged as MITs (priorities) so they pin to the top.
// Only carries into today — never fabricates history for past days viewed later.
function carriedTodos(date: string): Todo[] {
  if (date !== todayKey()) return []
  if (peekList<Todo>(todosKey(date))) return [] // already initialized today
  for (let i = 1; i <= 30; i++) {
    const prev = peekList<Todo>(todosKey(addDaysKey(date, -i)))
    if (prev) return prev.filter((t) => !t.done).map((t) => ({ id: uid(), task: t.task, done: false, mit: true }))
  }
  return []
}
export const useTodos = (date: string) => useCollection<Todo>(todosKey(date), carriedTodos(date))

// Most recent past day's agenda, as fresh undone blocks — for "copy yesterday".
export function previousAgenda(date: string): AgendaBlock[] {
  for (let i = 1; i <= 30; i++) {
    const prev = peekList<AgendaBlock>(agendaKey(addDaysKey(date, -i)))
    if (prev && prev.length) return prev.map((b) => ({ id: uid(), time: b.time, task: b.task, category: b.category, done: false }))
  }
  return []
}

export const newPriority = (text: string): Priority => ({ id: uid(), text, done: false })
export const newTodo = (task: string): Todo => ({ id: uid(), task, done: false, mit: false })
export const newAgendaBlock = (time = '9:00 AM'): AgendaBlock => ({ id: uid(), time, task: 'New block', category: 'Work', done: false })

// Toggle one day cell in a tracker row's 7-day array.
export const toggleDay = (row: TrackerRow, idx: number): boolean[] =>
  row.days.map((d, i) => (i === idx ? !d : d))
