import type { ComponentType, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

// A widget a module contributes to the Command Center home grid.
export interface CommandWidget {
  id: string
  title: string
  icon: LucideIcon
  span?: 1 | 2 | 3 // grid columns on a 3-col home
  order?: number
  render: () => ReactNode
}

// The plug-in contract every pillar/module implements. The shell discovers
// modules through this manifest alone — it never imports module internals.
export interface ModuleManifest {
  id: string
  title: string
  icon: LucideIcon
  route: string // e.g. "/health"
  nav: boolean // show in the sidebar
  status?: 'live' | 'planned'
  page: ComponentType
  widgets?: CommandWidget[] // contributed to the Command Center
}
