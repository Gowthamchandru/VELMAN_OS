import { LayoutDashboard, HeartPulse, Wallet, Briefcase, Repeat, History, ShieldCheck, CreditCard, Newspaper, Plane, Building2, Brain, Zap } from 'lucide-react'
import SecondBrain from '@/modules/brain/SecondBrain'
import Productivity from '@/modules/productivity/Productivity'
import type { ModuleManifest } from './types'
import CommandCenter from '@/modules/command-center/CommandCenter'
import DailyLog from '@/modules/log/DailyLog'
import News from '@/modules/news/News'
import Habits, { HabitsWidget } from '@/modules/habits/Habits'
import Health, { HealthWidget } from '@/modules/health/Health'
import Vault from '@/modules/vault/Vault'
import Subscriptions from '@/modules/subs/Subscriptions'
import Finance from '@/modules/finance/Finance'
import Work from '@/modules/work/Work'
import Flights from '@/modules/flights/Flights'
import Business from '@/modules/business/Business'

// The single source of truth the shell renders from. Adding a pillar = adding
// one manifest here; nothing else in the shell needs to know about it.
export const modules: ModuleManifest[] = [
  {
    id: 'command-center',
    mode: 'both',
    title: 'Command Center',
    icon: LayoutDashboard,
    route: '/',
    nav: true,
    status: 'live',
    page: CommandCenter,
  },
  {
    id: 'brain',
    mode: 'both',
    title: 'Second Brain',
    icon: Brain,
    route: '/brain',
    nav: true,
    status: 'live',
    page: SecondBrain,
  },
  {
    id: 'productivity',
    mode: 'both',
    title: 'Productivity',
    icon: Zap,
    route: '/productivity',
    nav: true,
    status: 'live',
    page: Productivity,
  },
  {
    id: 'work',
    mode: 'professional',
    title: 'Task Management',
    icon: Briefcase,
    route: '/work',
    nav: true,
    status: 'live',
    page: Work,
  },
  {
    id: 'log',
    mode: 'personal',
    title: 'Daily Log',
    icon: History,
    route: '/log',
    nav: true,
    status: 'live',
    page: DailyLog,
  },
  {
    id: 'news',
    mode: 'personal',
    title: 'News',
    icon: Newspaper,
    route: '/news',
    nav: true,
    status: 'live',
    page: News,
  },
  {
    id: 'flights',
    mode: 'professional',
    title: 'Booking',
    icon: Plane,
    route: '/flights',
    nav: true,
    status: 'live',
    page: Flights,
  },
  {
    id: 'habits',
    mode: 'personal',
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
    mode: 'personal',
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
    mode: 'personal',
    title: 'Vault',
    icon: ShieldCheck,
    route: '/vault',
    nav: true,
    status: 'live',
    page: Vault,
  },
  {
    id: 'subs',
    mode: 'professional',
    title: 'Subscriptions',
    icon: CreditCard,
    route: '/subscriptions',
    nav: true,
    status: 'live',
    page: Subscriptions,
  },
  {
    id: 'finance',
    mode: 'personal',
    title: 'Financial',
    icon: Wallet,
    route: '/finance',
    nav: true,
    status: 'live',
    page: Finance,
  },
  {
    id: 'business',
    mode: 'professional',
    title: 'Business',
    icon: Building2,
    route: '/business',
    nav: true,
    status: 'live',
    page: Business,
  },
]
