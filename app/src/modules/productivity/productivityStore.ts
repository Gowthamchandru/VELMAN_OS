// Productivity suite — data layer. Every tool persists through the same
// localStorage seam as the rest of the app (`gcos.prod.*` keys), so the
// Export/Import and vault-backup tools can round-trip all of it generically.
//
// Deliberately NOT re-implemented here: habits. The Habit Tracker tile reads
// the existing habitsStore so there is one source of truth shared with /habits.
import { useCollection, useLocalValue, uid } from '@/lib/store'
import { todayKey } from '@/lib/time'

// ─── Notes ───────────────────────────────────────────────────────────────────
export interface Note { id: string; title: string; body: string; pinned: boolean; updatedAt: number }
export const useNotes = () => useCollection<Note>('gcos.prod.notes.v1')
export const newNote = (): Note => ({ id: uid(), title: 'Untitled note', body: '', pinned: false, updatedAt: Date.now() })

export interface RichNote { id: string; title: string; html: string; updatedAt: number }
export const useRichNotes = () => useCollection<RichNote>('gcos.prod.richnotes.v1')
export const newRichNote = (): RichNote => ({ id: uid(), title: 'Untitled', html: '', updatedAt: Date.now() })

// ─── Checklists (reusable — reset all boxes to run it again) ─────────────────
export interface ChecklistItem { id: string; text: string; done: boolean }
export interface Checklist { id: string; name: string; items: ChecklistItem[] }
export const useChecklists = () => useCollection<Checklist>('gcos.prod.checklists.v1')
export const newChecklist = (name: string): Checklist => ({ id: uid(), name, items: [] })
export const checklistProgress = (c: Checklist) => {
  const done = c.items.filter((i) => i.done).length
  return { done, total: c.items.length, pct: c.items.length ? Math.round((done / c.items.length) * 100) : 0 }
}

// ─── To-do list (standing list, not the per-day planner to-dos) ──────────────
export type TodoPriority = 'High' | 'Med' | 'Low'
export const TODO_PRIORITIES: TodoPriority[] = ['High', 'Med', 'Low']
export const TODO_PRIORITY_COLOR: Record<TodoPriority, string> = { High: '#ff2e63', Med: '#ffb020', Low: '#00d9ff' }
export interface ProdTodo { id: string; text: string; done: boolean; priority: TodoPriority; due: string | null; createdAt: number }
export const useProdTodos = () => useCollection<ProdTodo>('gcos.prod.todos.v1')
export const newProdTodo = (text: string, priority: TodoPriority = 'Med', due: string | null = null): ProdTodo =>
  ({ id: uid(), text, done: false, priority, due, createdAt: Date.now() })

// ─── Daily planner (time blocks for one date) ───────────────────────────────
export interface PlanBlock { id: string; date: string; time: string; text: string; done: boolean }
export const usePlanBlocks = () => useCollection<PlanBlock>('gcos.prod.dayplan.v1')
export const newPlanBlock = (date: string, time: string, text: string): PlanBlock =>
  ({ id: uid(), date, time, text, done: false })

// ─── Weekly planner (Mon–Sun columns, day index 0–6) ────────────────────────
export interface WeekItem { id: string; day: number; text: string; done: boolean }
export const useWeekItems = () => useCollection<WeekItem>('gcos.prod.weekplan.v1')
export const newWeekItem = (day: number, text: string): WeekItem => ({ id: uid(), day, text, done: false })
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Goal tracker ────────────────────────────────────────────────────────────
export interface Goal { id: string; name: string; target: number; current: number; unit: string; due: string | null }
export const useGoals = () => useCollection<Goal>('gcos.prod.goals.v1')
export const newGoal = (name: string, target: number, unit: string, due: string | null): Goal =>
  ({ id: uid(), name, target: target || 1, current: 0, unit, due })
export const goalPct = (g: Goal) => Math.min(100, Math.round((g.current / (g.target || 1)) * 100))

// ─── Calendar events ─────────────────────────────────────────────────────────
export const EVENT_COLORS = ['#00d9ff', '#00ffa3', '#ffb020', '#ff2e63', '#a78bfa']
export interface CalEvent { id: string; date: string; time: string; title: string; color: string }
export const useEvents = () => useCollection<CalEvent>('gcos.prod.events.v1')
export const newEvent = (date: string, time: string, title: string, color: string): CalEvent =>
  ({ id: uid(), date, time, title, color })

// ─── Reminders (fire a browser notification when due) ───────────────────────
export interface Reminder { id: string; text: string; at: string; done: boolean; notified: boolean }
export const useReminders = () => useCollection<Reminder>('gcos.prod.reminders.v1')
export const newReminder = (text: string, at: string): Reminder =>
  ({ id: uid(), text, at, done: false, notified: false })

// ─── Kanban (personal board — separate from Work's company task board) ──────
export const KANBAN_COLS = ['To do', 'Doing', 'Blocked', 'Done'] as const
export type KanbanCol = (typeof KANBAN_COLS)[number]
export interface KanbanCard { id: string; col: KanbanCol; text: string; note: string }
export const useKanban = () => useCollection<KanbanCard>('gcos.prod.kanban.v1')
export const newKanbanCard = (col: KanbanCol, text: string): KanbanCard => ({ id: uid(), col, text, note: '' })

// ─── Recurring tasks ─────────────────────────────────────────────────────────
export type Freq = 'Daily' | 'Weekly' | 'Monthly'
export const FREQS: Freq[] = ['Daily', 'Weekly', 'Monthly']
export const FREQ_DAYS: Record<Freq, number> = { Daily: 1, Weekly: 7, Monthly: 30 }
export interface Recurring { id: string; text: string; freq: Freq; nextDue: string; streak: number }
export const useRecurring = () => useCollection<Recurring>('gcos.prod.recurring.v1')
export const newRecurring = (text: string, freq: Freq): Recurring =>
  ({ id: uid(), text, freq, nextDue: todayKey(), streak: 0 })
export const advanceDue = (from: string, freq: Freq): string => {
  const d = new Date(from + 'T00:00:00')
  d.setDate(d.getDate() + FREQ_DAYS[freq])
  return d.toISOString().slice(0, 10)
}

// ─── Pomodoro / Focus sessions (shared log) ─────────────────────────────────
export interface Session { id: string; label: string; minutes: number; at: number; kind: 'pomodoro' | 'focus' }
export const useSessions = () => useCollection<Session>('gcos.prod.sessions.v1')
export const newSession = (label: string, minutes: number, kind: Session['kind']): Session =>
  ({ id: uid(), label, minutes, at: Date.now(), kind })
export const usePomodoroSettings = () => {
  const [work, setWork] = useLocalValue('gcos.prod.pomo.work', '25')
  const [brk, setBrk] = useLocalValue('gcos.prod.pomo.break', '5')
  return { work: +work || 25, brk: +brk || 5, setWork: (n: number) => setWork(String(n)), setBrk: (n: number) => setBrk(String(n)) }
}

// ─── Export / import — every productivity key, round-trippable ──────────────
export const PROD_PREFIX = 'gcos.prod.'

export function exportProductivity(): string {
  const out: Record<string, unknown> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PROD_PREFIX)) continue
      const raw = localStorage.getItem(k)
      if (raw === null) continue
      try {
        out[k] = JSON.parse(raw)
      } catch {
        out[k] = raw
      }
    }
  } catch {
    /* storage unavailable */
  }
  return JSON.stringify({ app: 'velman-os', kind: 'productivity', exportedAt: new Date().toISOString(), data: out }, null, 2)
}

// Returns how many keys were restored, or throws with a readable reason.
export function importProductivity(json: string): number {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error("That isn't valid JSON.")
  }
  const data = (parsed as { data?: Record<string, unknown> })?.data
  if (!data || typeof data !== 'object') throw new Error('No productivity data found in that file.')
  let n = 0
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith(PROD_PREFIX)) continue
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
    n++
  }
  return n
}
