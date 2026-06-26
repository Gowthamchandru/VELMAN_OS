// Editable Task Tracker + Kanban data, modelled on the Task Tracker / Kanban templates.
import { useCollection, uid } from '@/lib/store'

export type Priority = 'Urgent' | 'High' | 'Med' | 'Low'
export type Status = 'Backlog' | 'In Progress' | 'Review' | 'Done' | 'On Hold'

export const PRIORITIES: Priority[] = ['Urgent', 'High', 'Med', 'Low']
export const STATUSES: Status[] = ['Backlog', 'In Progress', 'Review', 'Done', 'On Hold']
export const CATEGORIES = ['Work', 'Finance', 'Health', 'Personal', 'Family', 'Education', 'Travel', 'Other'] as const

export const PRIORITY_COLOR: Record<Priority, string> = { Urgent: '#d93a2b', High: '#d97706', Med: '#1c4d8c', Low: '#059669' }
export const STATUS_COLOR: Record<Status, string> = {
  Backlog: '#9ca3af', 'In Progress': '#1c4d8c', Review: '#d97706', Done: '#059669', 'On Hold': '#6b7280',
}

export interface Task {
  id: string
  title: string
  category: string
  priority: Priority
  status: Status
  assignee: string
  due: string | null // ISO date
  notes: string
  createdAt: string
}

const d = (offset: number) => {
  const t = new Date()
  t.setDate(t.getDate() + offset)
  return t.toISOString().slice(0, 10)
}

const T = (title: string, category: string, priority: Priority, status: Status, assignee: string, dueOffset: number, notes = ''): Task =>
  ({ id: uid(), title, category, priority, status, assignee, due: d(dueOffset), notes, createdAt: d(-5) })

const seed: Task[] = [
  T('Close 2 enterprise deals', 'Work', 'Urgent', 'In Progress', 'Meera', 2, 'Follow up on slipped deals'),
  T('Unblock ops support backlog', 'Work', 'Urgent', 'On Hold', 'Diya', 0, 'Needs your decision'),
  T('Send investor update', 'Work', 'High', 'Backlog', 'You', 3, 'Monthly update'),
  T('Review revised vendor quote', 'Work', 'Med', 'Review', 'Legal', -1, 'Overdue'),
  T('Finalise Q3 hiring plan', 'Work', 'High', 'In Progress', 'Meera', 5, ''),
  T('Ship pricing v2', 'Work', 'High', 'Done', 'Kabir', -2, 'Live'),
  T('Update SIP allocations', 'Finance', 'Med', 'Backlog', 'You', 7, 'Rebalance crypto down'),
  T('Annual health checkup', 'Health', 'Low', 'Backlog', 'You', 10, 'Book Dr. appointment'),
  T('Plan team offsite', 'Work', 'Low', 'Backlog', 'Kabir', 21, ''),
  T('Approve marketing budget', 'Finance', 'High', 'Review', 'You', 1, ''),
  T('Draft board deck outline', 'Work', 'High', 'In Progress', 'You', 4, ''),
  T('Family trip planning', 'Family', 'Low', 'On Hold', 'You', 30, ''),
]

export const useTasks = () => useCollection<Task>('gcos.work.tasks.v1', seed)

export const newTask = (status: Status = 'Backlog'): Task =>
  ({ id: uid(), title: 'New task', category: 'Work', priority: 'Med', status, assignee: 'You', due: d(7), notes: '', createdAt: d(0) })

export function daysLeft(due: string | null): number | null {
  if (!due) return null
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86400000)
}

export function taskKpis(tasks: Task[]) {
  const dl = (t: Task) => daysLeft(t.due)
  const open = tasks.filter((t) => t.status !== 'Done')
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'Done').length,
    dueToday: open.filter((t) => dl(t) === 0).length,
    overdue: open.filter((t) => { const n = dl(t); return n !== null && n < 0 }).length,
    byStatus: STATUSES.map((s) => ({ key: s, n: tasks.filter((t) => t.status === s).length })),
    byPriority: PRIORITIES.map((p) => ({ key: p, n: tasks.filter((t) => t.priority === p).length })),
    byAssignee: [...new Set(tasks.map((t) => t.assignee))].map((a) => ({ key: a, n: tasks.filter((t) => t.assignee === a).length })).sort((x, y) => y.n - x.n),
    byCategory: [...new Set(tasks.map((t) => t.category))].map((c) => ({ key: c, n: tasks.filter((t) => t.category === c).length })).sort((x, y) => y.n - x.n),
  }
}
