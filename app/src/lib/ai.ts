// AI layer for GC OS. Builds a STRUCTURED SNAPSHOT (never raw records) of the
// user's day and asks Claude for a brief. Per the locked privacy decision, only
// this compact snapshot leaves the device; the API key lives in localStorage.
import Anthropic from '@anthropic-ai/sdk'
import { useLocalValue } from '@/lib/store'
import { prettyDate, weekdayName } from '@/lib/time'
import { usePriorities, useTodos, useAgenda, useGratitude, useReflection } from '@/modules/planner/plannerStore'
import { useSelfCareDefs, useDailyDefs, weekHabitStats } from '@/modules/habits/habitsStore'
import { useLoops, displayStatus } from '@/modules/loops/loopsStore'
import { useHoldings, useAssets, useLiabilities, portfolioTotals, netWorth, inr } from '@/modules/finance/financeReal'
import { useTasks, taskKpis } from '@/modules/work/tasksStore'

export const useApiKey = () => useLocalValue('gcos.anthropic.key')
export const useLastBrief = () => useLocalValue('gcos.brief.last')

export type BriefMode = 'morning' | 'evening'

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

const SYSTEM = `You are the chief-of-staff inside "GC Operating System", a personal productivity dashboard for Dr. Gowtham — a founder/CEO based in India (INR, IST). You receive a compact JSON snapshot of his day (agenda, priorities, to-dos, open loops/waiting-on, habit consistency, finances, work tasks, gratitude, reflection). Write tight, scannable, founder-grade output. Be specific to the data — reference actual items by name. No preamble, no "Here is...". Use short markdown: a one-line headline, then a few bullet lines. Keep it under ~160 words. India + founder context. Never invent data not in the snapshot.`

const PROMPT: Record<BriefMode, string> = {
  morning:
    'Write the MORNING BRIEF. Cover, in this order: (1) one headline sentence on the shape of today; (2) the 1–3 Most Important Tasks (impact-ranked) drawn from priorities/agenda/work; (3) overdue or due-today follow-ups from open loops and work tasks; (4) one decision or thing that needs him today; (5) one short health/habit or money nudge. End with one recommended first move.',
  evening:
    'Write the END-OF-DAY WRAP with three short labelled sections — **Done today**, **Still open**, **Tomorrow** — each a few bullets pulled from the snapshot (completed vs open priorities/to-dos/loops). Close with one reflection prompt or encouragement.',
}

export async function generateBrief(apiKey: string, snapshot: unknown, mode: BriefMode): Promise<string> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' },
  })
  const res = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1200,
    system: SYSTEM,
    messages: [
      { role: 'user', content: `${PROMPT[mode]}\n\nToday's snapshot (JSON):\n${JSON.stringify(snapshot, null, 2)}` },
    ],
  })
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}
