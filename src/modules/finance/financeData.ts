// Cash-flow data layer — transaction-driven (Income / Spending / Saving). The
// Agent (statement upload) merges parsed transactions into the same `useTxns`
// store, so the pages automate from real statements. Investments / portfolio
// live in financeReal.ts (the single holdings + net-worth source of truth).
// Interim localStorage; Stage 4 = synced DB.
import { useCollection, uid } from '@/lib/store'
import { todayKey, addDaysKey } from '@/lib/time'

// 'investment' transactions still exist (money moving into investments is real
// cash flow); the holdings they buy are tracked in financeReal's Portfolio.
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

export const useTxns = () => useCollection<Txn>('gcos.fin.txns.v1', txnSeed)

export const newTxn = (t: Omit<Txn, 'id'>): Txn => ({ id: uid(), ...t })

// ---- aggregates ----
export const sumByType = (txns: Txn[], type: TxnType) => txns.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)

export function byCategory(txns: Txn[], type: TxnType): { name: string; value: number }[] {
  const m = new Map<string, number>()
  for (const t of txns.filter((x) => x.type === type)) m.set(t.category, (m.get(t.category) ?? 0) + t.amount)
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
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
