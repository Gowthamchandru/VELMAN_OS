import { useCollection, uid } from '@/lib/store'
import { todayKey } from '@/lib/time'

export type DeptTaskStatus = 'Todo' | 'In Progress' | 'Done'
export const DEPT_TASK_STATUSES: DeptTaskStatus[] = ['Todo', 'In Progress', 'Done']
export const DEPT_TASK_STATUS_COLOR: Record<DeptTaskStatus, string> = {
  Todo: '#9ca3af',
  'In Progress': '#1c4d8c',
  Done: '#059669',
}

export interface DeptTask {
  id: string
  companyId: string
  department: string
  title: string
  status: DeptTaskStatus
  assignee: string
  due: string
}

export interface Meeting {
  id: string
  companyId: string
  companyName: string
  department: string
  title: string
  date: string      // YYYY-MM-DD
  time: string      // "09:00" (24hr)
  attendees: string
}

export const useDeptTasks = () => useCollection<DeptTask>('gcos.work.dept-tasks.v1', [])
export const useMeetings = () => useCollection<Meeting>('gcos.work.meetings.v1', [])

export const newDeptTask = (companyId: string, department: string): DeptTask => ({
  id: uid(), companyId, department, title: '', status: 'Todo', assignee: '', due: '',
})

export const newMeeting = (companyId: string, companyName: string, department: string): Meeting => ({
  id: uid(), companyId, companyName, department, title: '', date: todayKey(), time: '09:00', attendees: '',
})
