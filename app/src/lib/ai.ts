// AI layer for Velman OS. Builds STRUCTURED SNAPSHOTS (never raw records) of the
// user's day / whole app, then talks to Claude through the LOCAL assistant
// server (server/index.mjs), which uses the Claude Pro subscription via the
// Agent SDK. Only the compact snapshot leaves the browser — to localhost — and
// the Pro token never touches the browser at all.
import { useEffect, useState } from 'react'
import { useLocalValue } from '@/lib/store'
import { prettyDate, weekdayName, todayKey } from '@/lib/time'
import { usePriorities, useTodos, useAgenda, useGratitude, useReflection } from '@/modules/planner/plannerStore'
import { useSelfCareDefs, useDailyDefs, weekHabitStats } from '@/modules/habits/habitsStore'
import { useLoops, displayStatus, dueLabel as loopDueLabel } from '@/modules/loops/loopsStore'
import { useHoldings, useAssets, useLiabilities, useGoals, portfolioTotals, netWorth, goalProgress, inr } from '@/modules/finance/financeReal'
import { useTasks, taskKpis } from '@/modules/work/tasksStore'
import { useCompanies, totalEmployees, groupTotal } from '@/modules/work/companiesStore'
import { useDocs, expiryStatus, expiryLabel } from '@/modules/vault/vaultStore'
import { useSubs, dueStatus as subDueStatus, dueLabel as subDueLabel, monthlyINR } from '@/modules/subs/subsStore'
import { useVerticals } from '@/modules/news/newsData'
import * as health from '@/modules/health/healthDemo'

export const useLastBrief = () => useLocalValue('gcos.brief.last')

export type BriefMode = 'morning' | 'evening'

// Where the local assistant server lives (override with VITE_GCOS_SERVER).
const SERVER = (import.meta.env.VITE_GCOS_SERVER as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8787'

export type ServerMode = 'subscription' | 'apikey' | 'none'
export interface ServerHealth { checking: boolean; online: boolean; mode: ServerMode; model?: string }

// Poll the local server so the UI can show whether the Pro assistant is ready.
export function useServerHealth(pollMs = 8000): ServerHealth {
  const [state, setState] = useState<ServerHealth>({ checking: true, online: false, mode: 'none' })
  useEffect(() => {
    let alive = true
    const ping = async () => {
      try {
        const res = await fetch(`${SERVER}/api/health`, { signal: AbortSignal.timeout(4000) })
        if (!res.ok) throw new Error('bad status')
        const j = await res.json()
        if (alive) setState({ checking: false, online: true, mode: j.mode ?? 'none', model: j.model })
      } catch {
        if (alive) setState({ checking: false, online: false, mode: 'none' })
      }
    }
    ping()
    const id = setInterval(ping, pollMs)
    return () => { alive = false; clearInterval(id) }
  }, [pollMs])
  return state
}

// Assemble a compact snapshot of the SELECTED day from every module's live data.
export function useGcSnapshot(date: string) {
  const { items: priorities } = usePriorities()
  const { items: todos } = useTodos(date)
  const { items: agenda } = useAgenda(date)
  const { items: gratitude } = useGratitude(date)
  const [reflection] = useReflection(date)
  const { items: loops } = useLoops()
  const habitIds = [...useSelfCareDefs().items, ...useDailyDefs().items].map((h) => h.id)
  const holdings = useHoldings().items
  const assets = useAssets().items
  const liabilities = useLiabilities().items
  const tasks = useTasks().items

  const pf = portfolioTotals(holdings)
  const nw = netWorth(assets, liabilities, pf.current)
  const k = taskKpis(tasks)
  const hs = weekHabitStats(habitIds)

  return {
    today: { date: prettyDate(date), weekday: weekdayName(date) },
    agenda: agenda.filter((a) => a.task).map((a) => ({ time: a.time, task: a.task, category: a.category, done: a.done })),
    weeklyPriorities: priorities.map((p) => ({ text: p.text, done: p.done })),
    todos: todos.map((t) => ({ task: t.task, done: t.done, mostImportant: !!t.mit })),
    openLoops: loops.filter((l) => l.status !== 'closed').map((l) => ({ title: l.title, status: displayStatus(l), owner: l.owner, context: l.context, due: l.due })),
    habits: { completedThisWeek: hs.done, totalChecks: hs.total, consistencyPct: hs.pct },
    finance: { netWorth: inr(nw.net, true), portfolioValue: inr(pf.current, true), portfolioROIpct: +(pf.roi * 100).toFixed(1) },
    work: { totalTasks: k.total, dueToday: k.dueToday, overdue: k.overdue, done: k.done },
    gratitude: gratitude.map((g) => g.text),
    reflection,
  }
}

// POST to the local server and return its text, with friendly error messages.
async function postToServer(path: string, body: unknown): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${SERVER}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(`Can't reach the assistant server at ${SERVER}. Start it with "npm run server" (or "npm run dev:all").`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Server error (${res.status}).`)
  return (data as { text?: string }).text ?? ''
}

export function generateBrief(snapshot: unknown, mode: BriefMode): Promise<string> {
  return postToServer('/api/brief', { snapshot, mode })
}

// ============================================================================
// Whole-app assistant — answers questions across EVERY module so the user can
// just ask instead of clicking through pages.
// ============================================================================

export function useAssistantContext() {
  const date = todayKey()
  const { items: priorities } = usePriorities()
  const { items: todos } = useTodos(date)
  const { items: agenda } = useAgenda(date)
  const { items: gratitude } = useGratitude(date)
  const [reflection] = useReflection(date)
  const { items: loops } = useLoops()
  const { items: docs } = useDocs()
  const { items: subs } = useSubs()
  const { items: holdings } = useHoldings()
  const { items: assets } = useAssets()
  const { items: liabilities } = useLiabilities()
  const { items: goals } = useGoals()
  const { items: tasks } = useTasks()
  const { items: companies } = useCompanies()
  const { items: verticals } = useVerticals()
  const habitIds = [...useSelfCareDefs().items, ...useDailyDefs().items].map((h) => h.id)

  const pf = portfolioTotals(holdings)
  const nw = netWorth(assets, liabilities, pf.current)
  const k = taskKpis(tasks)
  const hs = weekHabitStats(habitIds)
  const monthlySubs = subs.reduce((s, x) => s + monthlyINR(x), 0)

  return {
    today: { date: prettyDate(date), weekday: weekdayName(date) },
    agenda: agenda.filter((a) => a.task).map((a) => ({ time: a.time, task: a.task, category: a.category, done: a.done })),
    weeklyPriorities: priorities.map((p) => ({ text: p.text, done: p.done })),
    todos: todos.map((t) => ({ task: t.task, done: t.done, mostImportant: !!t.mit })),
    openLoops: loops
      .filter((l) => l.status !== 'closed')
      .map((l) => ({ title: l.title, status: displayStatus(l), owner: l.owner, context: l.context, due: l.due ? loopDueLabel(l.due) : null })),
    vault: docs.map((d) => ({ name: d.name, category: d.category, number: d.number, issuer: d.issuer, status: expiryStatus(d), expiry: expiryLabel(d) || null })),
    subscriptions: {
      monthlyTotalINR: inr(monthlySubs, true),
      items: subs.map((s) => ({ name: s.name, amount: s.amount, currency: s.currency, billing: s.billing, category: s.category, status: subDueStatus(s), due: subDueLabel(s), autopay: s.autopay })),
    },
    finance: {
      netWorth: inr(nw.net, true),
      totalAssets: inr(nw.totalAssets, true),
      totalLiabilities: inr(nw.totalLiab, true),
      portfolioValue: inr(pf.current, true),
      portfolioInvested: inr(pf.invested, true),
      portfolioPnL: inr(pf.pnl, true),
      portfolioROIpct: +(pf.roi * 100).toFixed(1),
      bestHolding: pf.best?.name ?? null,
      worstHolding: pf.worst?.name ?? null,
      topHoldings: [...holdings.map((h) => ({ name: h.name, type: h.type, value: h.qty * h.currentPrice })).sort((a, b) => b.value - a.value)]
        .slice(0, 8)
        .map((h) => ({ name: h.name, type: h.type, value: inr(h.value, true) })),
      goals: goals.map((g) => ({ name: g.name, target: inr(g.target, true), saved: inr(g.saved, true), progressPct: Math.round(goalProgress(g).pct * 100), priority: g.priority, targetDate: g.targetDate })),
    },
    work: {
      totalTasks: k.total, dueToday: k.dueToday, overdue: k.overdue, done: k.done,
      attention: tasks.filter((t) => t.status !== 'Done').filter((t) => { const dl = t.due ? Math.ceil((new Date(t.due).getTime() - Date.now()) / 86400000) : null; return dl !== null && dl <= 0 }).map((t) => ({ title: t.title, priority: t.priority, assignee: t.assignee, status: t.status })),
      companies: companies.map((c) => ({ code: c.code, name: c.name, employees: totalEmployees(c), departments: c.departments.map((d) => `${d.name} (${d.count})`) })),
      groupHeadcount: groupTotal(companies),
    },
    habits: { completedThisWeek: hs.done, totalChecks: hs.total, consistencyPct: hs.pct },
    health: {
      readiness: `${health.readiness.score}/100 — ${health.readiness.verdict}`,
      sleepLastNight: `${Math.floor(health.sleepLastNight.asleepMin / 60)}h ${health.sleepLastNight.asleepMin % 60}m`,
      restingHr: health.heart.restingHr, hrv: health.heart.hrv,
      steps: health.activity.steps, stepsGoal: health.activity.stepsGoal,
      bmi: health.bmi, bloodPressure: `${health.bp.systolic}/${health.bp.diastolic}`,
      weightKg: health.body.weightKg, goalWeightKg: health.body.goalWeightKg,
      note: 'Health figures are demo data (Apple Watch ingest is planned).',
    },
    newsVerticals: verticals.map((v) => v.name),
    gratitude: gratitude.map((g) => g.text),
    reflection,
  }
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export function askAssistant(context: unknown, history: ChatMessage[], question: string): Promise<string> {
  return postToServer('/api/assistant', { context, history, question })
}
