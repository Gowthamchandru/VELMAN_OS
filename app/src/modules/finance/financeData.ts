// New finance data layer — transaction-driven (Income / Spending / Saving /
// Investment) plus manually-seeded Investments. The Agent (statement upload)
// merges parsed transactions into the same `useTxns` store, so the pages
// automate from real statements. Interim localStorage; Stage 4 = synced DB.
import { useCollection, uid } from '@/lib/store'
import { todayKey, addDaysKey } from '@/lib/time'

export type TxnType = 'income' | 'spending' | 'saving' | 'investment'
export interface Txn {
  id: string
  date: string // YYYY-MM-DD
  description: string
  amount: number // positive INR
  type: TxnType
  category: string
  source?: string // e.g. statement file it came from
}

export type InvGroup = 'Stocks' | 'Mutual Funds' | 'Government Scheme'
export type StockKind = 'ETF' | 'Direct Stock' | 'Fund' | 'Options' | ''
export interface Investment {
  id: string
  name: string
  group: InvGroup
  kind: StockKind // only meaningful for Stocks
  invested: number
  current: number
}

export const INV_GROUPS: InvGroup[] = ['Stocks', 'Mutual Funds', 'Government Scheme']
export const STOCK_KINDS: StockKind[] = ['ETF', 'Direct Stock', 'Fund', 'Options']

const d = (n: number) => addDaysKey(todayKey(), n)

const txnSeed: Txn[] = [
  { id: 't1', date: d(-26), description: 'Consulting / salary credit', amount: 250000, type: 'income', category: 'Salary' },
  { id: 't2', date: d(-12), description: 'Clinic income', amount: 120000, type: 'income', category: 'Practice' },
  { id: 't3', date: d(-25), description: 'House rent', amount: 45000, type: 'spending', category: 'Rent' },
  { id: 't4', date: d(-20), description: 'Groceries', amount: 18000, type: 'spending', category: 'Groceries' },
  { id: 't5', date: d(-14), description: 'Dining out', amount: 9000, type: 'spending', category: 'Food' },
  { id: 't6', date: d(-10), description: 'Fuel', amount: 6000, type: 'spending', category: 'Transport' },
  { id: 't7', date: d(-8), description: 'Electricity & utilities', amount: 4500, type: 'spending', category: 'Utilities' },
  { id: 't8', date: d(-6), description: 'Shopping', amount: 12000, type: 'spending', category: 'Shopping' },
  { id: 't9', date: d(-5), description: 'Subscriptions', amount: 4649, type: 'spending', category: 'Subscriptions' },
  { id: 't10', date: d(-22), description: 'Transfer to FD / savings', amount: 50000, type: 'saving', category: 'Fixed Deposit' },
  { id: 't11', date: d(-18), description: 'SIP — Axis Bluechip', amount: 20000, type: 'investment', category: 'Mutual Funds' },
  { id: 't12', date: d(-18), description: 'SIP — SBI Small Cap', amount: 15000, type: 'investment', category: 'Mutual Funds' },
  { id: 't13', date: d(-15), description: 'PPF contribution', amount: 12500, type: 'investment', category: 'Government Scheme' },
]

const invSeed: Investment[] = [
  { id: 'i1', name: 'Nifty 50 ETF', group: 'Stocks', kind: 'ETF', invested: 50000, current: 58000 },
  { id: 'i2', name: 'Reliance Industries', group: 'Stocks', kind: 'Direct Stock', invested: 80000, current: 95000 },
  { id: 'i3', name: 'HDFC Bank', group: 'Stocks', kind: 'Direct Stock', invested: 60000, current: 64000 },
  { id: 'i4', name: 'Nasdaq 100 Fund', group: 'Stocks', kind: 'Fund', invested: 30000, current: 36000 },
  { id: 'i5', name: 'Nifty Call Option', group: 'Stocks', kind: 'Options', invested: 20000, current: 17000 },
  { id: 'i6', name: 'Axis Bluechip', group: 'Mutual Funds', kind: '', invested: 50000, current: 61000 },
  { id: 'i7', name: 'SBI Small Cap', group: 'Mutual Funds', kind: '', invested: 40000, current: 55000 },
  { id: 'i8', name: 'PPF', group: 'Government Scheme', kind: '', invested: 150000, current: 162000 },
  { id: 'i9', name: 'NPS', group: 'Government Scheme', kind: '', invested: 100000, current: 118000 },
  { id: 'i10', name: 'Sovereign Gold Bond', group: 'Government Scheme', kind: '', invested: 50000, current: 62000 },
]

export const useTxns = () => useCollection<Txn>('gcos.fin.txns.v1', txnSeed)
export const useInvestments = () => useCollection<Investment>('gcos.fin.investments.v1', invSeed)

export const newTxn = (t: Omit<Txn, 'id'>): Txn => ({ id: uid(), ...t })
export const newInvestment = (name: string, group: InvGroup, kind: StockKind, invested: number, current: number): Investment => ({
  id: uid(),
  name,
  group,
  kind,
  invested: invested || 0,
  current: current || 0,
})

// ---- aggregates ----
export const sumByType = (txns: Txn[], type: TxnType) => txns.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)

export function byCategory(txns: Txn[], type: TxnType): { name: string; value: number }[] {
  const m = new Map<string, number>()
  for (const t of txns.filter((x) => x.type === type)) m.set(t.category, (m.get(t.category) ?? 0) + t.amount)
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function investmentTotals(inv: Investment[]) {
  const invested = inv.reduce((s, x) => s + x.invested, 0)
  const current = inv.reduce((s, x) => s + x.current, 0)
  return { invested, current, pnl: current - invested, roi: invested ? (current - invested) / invested : 0 }
}

export function byGroup(inv: Investment[]) {
  return INV_GROUPS.map((g) => {
    const items = inv.filter((x) => x.group === g)
    return { group: g, items, ...investmentTotals(items) }
  }).filter((g) => g.items.length > 0)
}

// Merge agent-parsed transactions, de-duping by date+amount+description.
export function dedupeMerge(existing: Txn[], incoming: Txn[]): Txn[] {
  const key = (t: Txn) => `${t.date}|${t.amount}|${t.description.trim().toLowerCase()}`
  const seen = new Set(existing.map(key))
  const fresh = incoming.filter((t) => !seen.has(key(t)))
  return [...existing, ...fresh]
}

const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
export function inr(n: number, compact = false): string {
  if (compact) {
    const a = Math.abs(n)
    if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
    if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
    if (a >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`
  }
  return `₹${fmt.format(Math.round(n))}`
}
