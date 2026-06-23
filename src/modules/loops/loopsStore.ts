import { useCollection, uid } from '@/lib/store'
import { todayKey, addDaysKey, daysFromToday, shortDate } from '@/lib/time'

export type LoopStatus = 'open' | 'waiting' | 'overdue' | 'closed'
// What we actually store — 'overdue' is DERIVED from the due date, never stored.
export type StoredStatus = 'open' | 'waiting' | 'closed'

export interface OpenLoop {
  id: string
  title: string
  owner: string | null
  context: string // grouping: Work / Home / Finance / Health / Personal
  status: StoredStatus
  due: string | null // 'YYYY-MM-DD' or null
  createdAt: string // 'YYYY-MM-DD'
}

export const CONTEXTS = ['Work', 'Home', 'Finance', 'Health', 'Personal'] as const

const seed: OpenLoop[] = [
  { id: 'seed-1', title: 'Reply to investor intro email', owner: 'You', context: 'Work', status: 'open', due: todayKey(), createdAt: addDaysKey(todayKey(), -1) },
  { id: 'seed-2', title: 'Vendor sent revised quote — review', owner: 'Acme Vendor', context: 'Work', status: 'waiting', due: addDaysKey(todayKey(), 2), createdAt: addDaysKey(todayKey(), -2) },
  { id: 'seed-3', title: 'Renew health insurance', owner: 'You', context: 'Finance', status: 'waiting', due: addDaysKey(todayKey(), -1), createdAt: addDaysKey(todayKey(), -5) },
]

export function useLoops() {
  return useCollection<OpenLoop>('gcos.loops.v2', seed)
}

export function newLoop(title: string, context = 'Work', owner: string | null = null, due: string | null = null): OpenLoop {
  return { id: uid(), title, owner, context, status: 'open', due, createdAt: todayKey() }
}

// open → waiting → closed → open
export function nextStatus(s: StoredStatus): StoredStatus {
  return s === 'open' ? 'waiting' : s === 'waiting' ? 'closed' : 'open'
}

// Derived status: an open/waiting loop past its due date AUTO-shows as overdue.
export function displayStatus(loop: OpenLoop): LoopStatus {
  if (loop.status !== 'closed' && loop.due && loop.due < todayKey()) return 'overdue'
  return loop.status
}

// Human due label: Today / Tomorrow / Yesterday / in 3d / 2d overdue / 19 Jun.
export function dueLabel(due: string | null): string {
  if (!due) return ''
  const diff = daysFromToday(due)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${-diff}d overdue`
  if (diff <= 7) return `in ${diff}d`
  return shortDate(due)
}

// Days since created — "open for N days".
export function ageDays(loop: OpenLoop): number {
  return loop.createdAt ? Math.max(0, -daysFromToday(loop.createdAt)) : 0
}
