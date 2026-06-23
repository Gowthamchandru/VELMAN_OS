// Domain + seed types for the planner data imported from the Excel sheet.
// These mirror scripts/importPlanner.mjs output. The eventual SQLite/Drizzle
// schema (Phase 0 design) will supersede these, but the shapes stay aligned.

export interface Category {
  name: string
  colorName: string | null
  hex: string | null
}

export interface WeekPriority {
  text: string
  done: boolean
}

export interface TrackerRow {
  label: string
  days: boolean[] // length 7, Mon..Sun for this sheet's week
}

export interface AgendaSlot {
  time: string
  category: string | null
  task: string | null
}

export interface Todo {
  n: number | string | null
  done: boolean
  task: string
}

export interface PlannerDay {
  date: string | null // ISO yyyy-mm-dd
  weekday: string | null
  gratitude: string[]
  agenda: AgendaSlot[]
  todos: Todo[]
  reflection: string | null
}

export interface PlannerSeed {
  meta: {
    source: string
    sheet: string
    weekStartDate: string | null
    dayStartTime: string
    importedFrom: string
  }
  categories: Category[]
  weekPriorities: WeekPriority[]
  selfCare: TrackerRow[]
  habits: TrackerRow[]
  days: PlannerDay[]
}
