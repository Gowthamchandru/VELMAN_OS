// Habits as PER-DAY completion logs (keyed by date) — gives real streaks +
// history, mirroring the per-day journal. Definitions (the habit labels) are two
// editable lists; each day's completions are a list of habit ids done that day.
import seedJson from '@/seed/plannerSeed.json'
import type { PlannerSeed } from '@/lib/types'
import { useCollection, toggleListItem, peekList, uid } from '@/lib/store'
import { todayKey, addDaysKey, keyToDate } from '@/lib/time'

const s = seedJson as PlannerSeed

export interface Habit {
  id: string
  label: string
}

const selfCareSeed: Habit[] = s.selfCare.map((r, i) => ({ id: `sc-${i}`, label: r.label }))
const dailySeed: Habit[] = s.habits.map((r, i) => ({ id: `hb-${i}`, label: r.label }))

export const useSelfCareDefs = () => useCollection<Habit>('gcos.habit.selfcare.v1', selfCareSeed)
export const useDailyDefs = () => useCollection<Habit>('gcos.habit.daily.v1', dailySeed)
export const newHabit = (label: string): Habit => ({ id: uid(), label })

export const habitLogKey = (date: string) => `gcos.habitlog.${date}`

// 7 day-keys Mon..Sun for the week containing today, + today's index (0 = Mon).
export function weekDateKeys(): { dates: string[]; todayIdx: number } {
  const today = todayKey()
  const dow = (keyToDate(today).getDay() + 6) % 7 // 0 = Monday
  const monday = addDaysKey(today, -dow)
  return { dates: Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i)), todayIdx: dow }
}

export const isHabitDone = (date: string, id: string): boolean =>
  (peekList<{ id: string }>(habitLogKey(date)) ?? []).some((x) => x.id === id)

export const toggleHabit = (date: string, id: string) => toggleListItem(habitLogKey(date), id)

// Current streak: consecutive days done ending today (an unfinished today does
// NOT break it — we count from yesterday in that case).
export function habitStreak(id: string): number {
  let cursor = todayKey()
  if (!isHabitDone(cursor, id)) cursor = addDaysKey(cursor, -1)
  let n = 0
  while (isHabitDone(cursor, id)) {
    n++
    cursor = addDaysKey(cursor, -1)
    if (n > 3650) break
  }
  return n
}

// How many of the given days this habit was done.
export const weekDoneCount = (id: string, dates: string[]): number =>
  dates.reduce((acc, d) => acc + (isHabitDone(d, id) ? 1 : 0), 0)

// How many habits exist (definitions), reading non-reactively — for day summaries.
export function habitDefCount(): number {
  const sc = peekList<Habit>('gcos.habit.selfcare.v1') ?? selfCareSeed
  const dl = peekList<Habit>('gcos.habit.daily.v1') ?? dailySeed
  return sc.length + dl.length
}

// Completion stats for a SINGLE day — for the Daily Log recap.
export function dayHabitStats(date: string): { done: number; total: number; pct: number } {
  const done = (peekList<{ id: string }>(habitLogKey(date)) ?? []).length
  const total = habitDefCount() || 1
  return { done, total, pct: Math.round((done / total) * 100) }
}

// Aggregate weekly stats across a set of habit ids (widget + AI snapshot).
export function weekHabitStats(ids: string[]): { done: number; total: number; pct: number } {
  const { dates } = weekDateKeys()
  const total = ids.length * dates.length || 1
  let done = 0
  for (const id of ids) for (const d of dates) if (isHabitDone(d, id)) done++
  return { done, total, pct: Math.round((done / total) * 100) }
}

// One-time: fill this week (up to today) with example completions so the grid,
// streaks and % aren't empty on first open. Runs once (flagged).
function seedHabitExamplesOnce() {
  try {
    const FLAG = 'gcos.habitSeed.v1'
    if (localStorage.getItem(FLAG)) return
    const { dates, todayIdx } = weekDateKeys()
    const ids = [...selfCareSeed, ...dailySeed].map((h) => h.id)
    dates.forEach((d, i) => {
      if (i > todayIdx) return // don't pre-complete future days
      if (peekList(habitLogKey(d))) return
      const done = ids.filter((_, j) => (i + j) % 5 !== 0) // ~80%, varied per day
      localStorage.setItem(habitLogKey(d), JSON.stringify(done.map((id) => ({ id }))))
    })
    localStorage.setItem(FLAG, '1')
  } catch {
    /* ignore */
  }
}
seedHabitExamplesOnce()
