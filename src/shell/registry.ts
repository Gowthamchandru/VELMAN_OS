import { LayoutDashboard, HeartPulse, Wallet, Briefcase, Repeat, Inbox, History, ShieldCheck, CreditCard, Newspaper } from 'lucide-react'
import type { ModuleManifest } from './types'
import CommandCenter from '@/modules/command-center/CommandCenter'
import DailyLog from '@/modules/log/DailyLog'
import News from '@/modules/news/News'
import Loops, { LoopsWidget } from '@/modules/loops/Loops'
import Habits, { HabitsWidget } from '@/modules/habits/Habits'
import Health, { HealthWidget } from '@/modules/health/Health'
import Vault from '@/modules/vault/Vault'
import Subscriptions from '@/modules/subs/Subscriptions'
import Finance from '@/modules/finance/Finance'
import Work from '@/modules/work/Work'

// The single source of truth the shell renders from. Adding a pillar = adding
// one manifest here; nothing else in the shell needs to know about it.
export const modules: ModuleManifest[] = [
  {
    id: 'command-center',
    title: 'Command Center',
    icon: LayoutDashboard,
    route: '/',
    nav: true,
    status: 'live',
    page: CommandCenter,
  },
  {
    id: 'log',
    title: 'Daily Log',
    icon: History,
    route: '/log',
    nav: true,
    status: 'live',
    page: DailyLog,
  },
  {
    id: 'news',
    title: 'News',
    icon: Newspaper,
    route: '/news',
    nav: true,
    status: 'live',
    page: News,
  },
  {
    id: 'loops',
    title: 'Open Loops',
    icon: Inbox,
    route: '/loops',
    nav: true,
    status: 'live',
    page: Loops,
    widgets: [
      {
        id: 'open-loops',
        title: 'Open loops · waiting-on',
        icon: Inbox,
        order: 5,
        render: LoopsWidget,
      },
    ],
  },
  {
    id: 'habits',
    title: 'Habits',
    icon: Repeat,
    route: '/habits',
    nav: true,
    status: 'live',
    page: Habits,
    widgets: [
      {
        id: 'habits-consistency',
        title: 'Habit consistency',
        icon: Repeat,
        order: 10,
        render: HabitsWidget,
      },
    ],
  },
  {
    id: 'health',
    title: 'Health',
    icon: HeartPulse,
    route: '/health',
    nav: true,
    status: 'live',
    page: Health,
    widgets: [
      {
        id: 'health-readiness',
        title: 'Readiness',
        icon: HeartPulse,
        order: 20,
        render: HealthWidget,
      },
    ],
  },
  {
    id: 'vault',
    title: 'Vault',
    icon: ShieldCheck,
    route: '/vault',
    nav: true,
    status: 'live',
    page: Vault,
  },
  {
    id: 'subs',
    title: 'Subscriptions',
    icon: CreditCard,
    route: '/subscriptions',
    nav: true,
    status: 'live',
    page: Subscriptions,
  },
  {
    id: 'finance',
    title: 'Financial',
    icon: Wallet,
    route: '/finance',
    nav: true,
    status: 'live',
    page: Finance,
  },
  {
    id: 'work',
    title: 'Work',
    icon: Briefcase,
    route: '/work',
    nav: true,
    status: 'live',
    page: Work,
  },
]
