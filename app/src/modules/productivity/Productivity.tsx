// Productivity — a suite of 16 tools behind a tile grid. The grid is the
// landing view; picking a tile swaps in that tool and the selection persists
// in the ephemeral store, so navigating away and back keeps your place.
import {
  StickyNote, ListChecks, CheckSquare, Repeat, Timer, CalendarDays, CalendarRange,
  Target, Calendar as CalendarIcon, Bell, FileText, SquareKanban, RefreshCw, Crosshair,
  ArrowLeftRight, HardDriveDownload, ArrowLeft, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { useEphemeral } from '@/lib/store'
import { Notes, RichTextNotes } from './tools/Notes'
import { Checklists, TodoList, RecurringTasks } from './tools/Lists'
import { DailyPlanner, WeeklyPlanner, Calendar } from './tools/Planners'
import { Pomodoro, FocusMode } from './tools/Timers'
import { GoalTracker, Reminders, HabitTracker } from './tools/Tracking'
import { KanbanBoard } from './tools/Board'
import { ExportImport, SyncBackup } from './tools/Data'

interface Tool {
  id: string
  label: string
  blurb: string
  icon: LucideIcon
  view: ComponentType
}

// Order mirrors the tile layout requested for this suite.
const TOOLS: Tool[] = [
  { id: 'notes', label: 'Notes', blurb: 'Quick capture, pin what matters', icon: StickyNote, view: Notes },
  { id: 'checklist', label: 'Checklist', blurb: 'Reusable lists you can reset', icon: ListChecks, view: Checklists },
  { id: 'todo', label: 'To-do List', blurb: 'Priorities and due dates', icon: CheckSquare, view: TodoList },
  { id: 'habits', label: 'Habit Tracker', blurb: 'Weekly grid and streaks', icon: Repeat, view: HabitTracker },
  { id: 'pomodoro', label: 'Pomodoro Timer', blurb: 'Work / break cycles', icon: Timer, view: Pomodoro },
  { id: 'daily', label: 'Daily Planner', blurb: 'Time-block any day', icon: CalendarDays, view: DailyPlanner },
  { id: 'weekly', label: 'Weekly Planner', blurb: 'Mon–Sun board', icon: CalendarRange, view: WeeklyPlanner },
  { id: 'goals', label: 'Goal Tracker', blurb: 'Progress toward a number', icon: Target, view: GoalTracker },
  { id: 'calendar', label: 'Calendar', blurb: 'Month view with events', icon: CalendarIcon, view: Calendar },
  { id: 'reminders', label: 'Reminder System', blurb: 'Alerts when things are due', icon: Bell, view: Reminders },
  { id: 'rich', label: 'Rich Text Notes', blurb: 'Formatted writing', icon: FileText, view: RichTextNotes },
  { id: 'kanban', label: 'Kanban Board', blurb: 'Drag cards across columns', icon: SquareKanban, view: KanbanBoard },
  { id: 'recurring', label: 'Recurring Tasks', blurb: 'Repeats that roll forward', icon: RefreshCw, view: RecurringTasks },
  { id: 'focus', label: 'Focus Mode', blurb: 'One task, nothing else', icon: Crosshair, view: FocusMode },
  { id: 'data', label: 'Export/Import', blurb: 'Back up or restore as JSON', icon: ArrowLeftRight, view: ExportImport },
  { id: 'sync', label: 'Sync Backup', blurb: 'Snapshot into your vault', icon: HardDriveDownload, view: SyncBackup },
]

export default function Productivity() {
  const [openId, setOpenId] = useEphemeral('gcos.prod.open', '')
  const tool = TOOLS.find((t) => t.id === openId)

  if (tool) {
    const View = tool.view
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setOpenId('')}
            className="flex items-center gap-1.5 rounded-[10px] border-2 border-border px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ArrowLeft size={14} /> All tools
          </button>
          <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><tool.icon size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-ink">{tool.label}</h1>
          </div>
        </div>
        <View />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Zap size={20} /></div>
        <h1 className="text-2xl font-semibold text-ink">Productivity</h1>
        <span className="ml-auto font-mono text-xs text-ink-faint">{TOOLS.length} tools</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setOpenId(t.id)}
            className="group flex items-start gap-3 rounded-2xl border-2 border-border bg-surface p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:brand-glow"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-ink-muted transition-colors group-hover:bg-accent group-hover:text-white">
              <t.icon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-ink">{t.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">{t.blurb}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
