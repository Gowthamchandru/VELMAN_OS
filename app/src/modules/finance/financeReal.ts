// Real Portfolio OS data layer, modelled on the Premium Investment Tracker.
// Holdings are the editable source of truth; everything else is computed live.
import { useCollection, uid } from '@/lib/store'

export type RiskLevel = 'Very Low' | 'Low' | 'Low-Medium' | 'Medium' | 'High' | 'Very High'

export interface AssetMeta { color: string; risk: RiskLevel; maxAlloc: number; riskScore: number }

export const ASSET_TYPES: Record<string, AssetMeta> = {
  Stock: { color: '#3b82f6', risk: 'High', maxAlloc: 0.4, riskScore: 75 },
  ETF: { color: '#06b6d4', risk: 'Medium', maxAlloc: 0.3, riskScore: 50 },
  'Mutual Fund': { color: '#8b5cf6', risk: 'Medium', maxAlloc: 0.4, riskScore: 50 },
  SIP: { color: '#a78bfa', risk: 'Medium', maxAlloc: 0.3, riskScore: 50 },
  Cryptocurrency: { color: '#f59e0b', risk: 'Very High', maxAlloc: 0.1, riskScore: 95 },
  Bond: { color: '#10b981', risk: 'Low', maxAlloc: 0.3, riskScore: 25 },
  Gold: { color: '#eab308', risk: 'Low-Medium', maxAlloc: 0.2, riskScore: 35 },
  'Real Estate': { color: '#ec4899', risk: 'Medium', maxAlloc: 0.3, riskScore: 50 },
  Savings: { color: '#64748b', risk: 'Very Low', maxAlloc: 0.2, riskScore: 10 },
  'Fixed Deposit': { color: '#22c55e', risk: 'Very Low', maxAlloc: 0.3, riskScore: 10 },
}
export const ASSET_LIST = Object.keys(ASSET_TYPES)

export interface Holding {
  id: string
  name: string
  type: string
  purchaseDate: string // ISO
  qty: number
  buyPrice: number
  currentPrice: number
  currency: string
  notes: string
}

const H = (name: string, type: string, purchaseDate: string, qty: number, buyPrice: number, currentPrice: number, notes = ''): Holding =>
  ({ id: `h-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, type, purchaseDate, qty, buyPrice, currentPrice, currency: 'INR', notes })

const holdingSeed: Holding[] = [
  H('Reliance Industries', 'Stock', '2023-01-15', 50, 2200, 2910),
  H('HDFC Top 100 Fund', 'Mutual Fund', '2023-03-01', 200, 680, 820),
  H('Bitcoin', 'Cryptocurrency', '2023-06-10', 0.15, 2100000, 5500000),
  H('Nifty 50 ETF', 'ETF', '2022-11-20', 100, 175, 240),
  H('Sovereign Gold Bond', 'Gold', '2023-09-05', 10, 5800, 7200),
  H('HDFC Bank', 'Stock', '2022-07-01', 75, 1450, 1720),
  H('SBI Fixed Deposit', 'Fixed Deposit', '2024-01-01', 1, 500000, 543000),
  H('Tata Steel', 'Stock', '2023-04-12', 200, 118, 162),
  H('Parag Parikh Flexi', 'Mutual Fund', '2022-12-01', 500, 42, 67),
  H('Ethereum', 'Cryptocurrency', '2023-08-15', 0.5, 180000, 320000),
  H('SIP – Axis Bluechip', 'SIP', '2022-01-01', 12, 5000, 5000),
  H('Bajaj Finance', 'Stock', '2021-10-10', 20, 5200, 7100),
]

export interface NetWorthItem { id: string; name: string; category: string; value: number; kind: 'asset' | 'liability' }
const assetSeed: NetWorthItem[] = [
  { id: 'nw-resi', name: 'Primary Residence', category: 'Real Estate', value: 8000000, kind: 'asset' },
  { id: 'nw-sav', name: 'Savings Account', category: 'Liquid', value: 500000, kind: 'asset' },
  { id: 'nw-fd', name: 'Fixed Deposits', category: 'Fixed Income', value: 543000, kind: 'asset' },
  { id: 'nw-gold', name: 'Gold & Jewellery', category: 'Gold', value: 300000, kind: 'asset' },
  { id: 'nw-veh', name: 'Vehicle', category: 'Lifestyle', value: 650000, kind: 'asset' },
  { id: 'nw-ppf', name: 'PPF / EPF', category: 'Retirement', value: 450000, kind: 'asset' },
]
const liabilitySeed: NetWorthItem[] = [
  { id: 'nw-home', name: 'Home Loan', category: 'Mortgage', value: 3500000, kind: 'liability' },
  { id: 'nw-car', name: 'Car Loan', category: 'Auto Loan', value: 350000, kind: 'liability' },
  { id: 'nw-cc', name: 'Credit Card', category: 'Consumer', value: 45000, kind: 'liability' },
]

export interface Goal { id: string; name: string; category: string; target: number; saved: number; monthly: number; targetDate: string; priority: 'High' | 'Medium' | 'Low' }
const goalSeed: Goal[] = [
  { id: 'g-1', name: 'Emergency Fund', category: 'Savings', target: 600000, saved: 250000, monthly: 20000, targetDate: '2025-12-01', priority: 'High' },
  { id: 'g-2', name: 'House Down Payment', category: 'Real Estate', target: 2000000, saved: 300000, monthly: 40000, targetDate: '2027-06-01', priority: 'High' },
  { id: 'g-3', name: 'Child Education', category: 'Investment', target: 5000000, saved: 100000, monthly: 15000, targetDate: '2035-01-01', priority: 'Medium' },
  { id: 'g-4', name: 'International Trip', category: 'Travel', target: 200000, saved: 80000, monthly: 10000, targetDate: '2025-06-01', priority: 'Low' },
  { id: 'g-5', name: 'Car Purchase', category: 'Lifestyle', target: 800000, saved: 200000, monthly: 25000, targetDate: '2026-03-01', priority: 'Medium' },
  { id: 'g-6', name: 'Stock Portfolio', category: 'Investment', target: 3000000, saved: 500000, monthly: 30000, targetDate: '2030-01-01', priority: 'High' },
]

export interface Dividend { id: string; name: string; type: string; shares: number; perShare: number; date: string; received: number; yield: number; frequency: string }
const dividendSeed: Dividend[] = [
  { id: 'd-1', name: 'HDFC Bank', type: 'Stock', shares: 100, perShare: 20.5, date: '2024-07-15', received: 2050, yield: 2.05, frequency: 'Annual' },
  { id: 'd-2', name: 'Infosys', type: 'Stock', shares: 50, perShare: 34, date: '2024-10-20', received: 1700, yield: 1.7, frequency: 'Semi-Annual' },
  { id: 'd-3', name: 'Nifty Bees ETF', type: 'ETF', shares: 200, perShare: 8.5, date: '2024-09-01', received: 1700, yield: 1.7, frequency: 'Quarterly' },
  { id: 'd-4', name: 'Reliance Industries', type: 'Stock', shares: 75, perShare: 10, date: '2024-08-05', received: 750, yield: 0.75, frequency: 'Annual' },
  { id: 'd-5', name: 'ICICI Prudential Div Yld', type: 'Mutual Fund', shares: 500, perShare: 2.4, date: '2024-11-15', received: 1200, yield: 1.2, frequency: 'Monthly' },
]

// --- Stores ---
export const useHoldings = () => useCollection<Holding>('gcos.fin.holdings.v1', holdingSeed)
export const useAssets = () => useCollection<NetWorthItem>('gcos.fin.assets.v1', assetSeed)
export const useLiabilities = () => useCollection<NetWorthItem>('gcos.fin.liabilities.v1', liabilitySeed)
export const useGoals = () => useCollection<Goal>('gcos.fin.goals.v1', goalSeed)
export const useDividends = () => useCollection<Dividend>('gcos.fin.dividends.v1', dividendSeed)

export const newHolding = (): Holding => ({ id: uid(), name: 'New holding', type: 'Stock', purchaseDate: new Date().toISOString().slice(0, 10), qty: 1, buyPrice: 0, currentPrice: 0, currency: 'INR', notes: '' })

// --- Compute ---
const DAY = 86400000
export interface ComputedHolding extends Holding { invested: number; current: number; pnl: number; roi: number; holdingDays: number; status: 'gain' | 'loss' | 'flat' }

export function compute(h: Holding): ComputedHolding {
  const invested = h.qty * h.buyPrice
  const current = h.qty * h.currentPrice
  const pnl = current - invested
  const roi = invested ? pnl / invested : 0
  const holdingDays = Math.max(0, Math.round((Date.now() - new Date(h.purchaseDate).getTime()) / DAY))
  return { ...h, invested, current, pnl, roi, holdingDays, status: pnl > 0 ? 'gain' : pnl < 0 ? 'loss' : 'flat' }
}

export function portfolioTotals(holdings: Holding[]) {
  const c = holdings.map(compute)
  const invested = c.reduce((s, h) => s + h.invested, 0)
  const current = c.reduce((s, h) => s + h.current, 0)
  const pnl = current - invested
  const roi = invested ? pnl / invested : 0
  const ranked = [...c].sort((a, b) => b.roi - a.roi)
  return { invested, current, pnl, roi, count: holdings.length, best: ranked[0], worst: ranked[ranked.length - 1], computed: c }
}

export interface AllocationRow { type: string; invested: number; current: number; pnl: number; weight: number; meta: AssetMeta }
export function assetAllocation(holdings: Holding[]): AllocationRow[] {
  const c = holdings.map(compute)
  const totalCurrent = c.reduce((s, h) => s + h.current, 0) || 1
  const byType = new Map<string, { invested: number; current: number }>()
  for (const h of c) {
    const e = byType.get(h.type) ?? { invested: 0, current: 0 }
    e.invested += h.invested
    e.current += h.current
    byType.set(h.type, e)
  }
  return [...byType.entries()]
    .map(([type, v]) => ({ type, invested: v.invested, current: v.current, pnl: v.current - v.invested, weight: v.current / totalCurrent, meta: ASSET_TYPES[type] ?? ASSET_TYPES.Stock }))
    .sort((a, b) => b.current - a.current)
}

export function riskScores(holdings: Holding[]) {
  const alloc = assetAllocation(holdings)
  const portfolioRisk = Math.round(alloc.reduce((s, a) => s + a.weight * a.meta.riskScore, 0))
  const concentration = alloc.length ? Math.max(...alloc.map((a) => a.weight)) : 0
  const classes = alloc.length
  const diversification = Math.min(100, Math.round((classes / 10) * 100 + 26))
  return { portfolioRisk, concentration, classes, diversification, alloc }
}

export function healthScore(holdings: Holding[]) {
  const t = portfolioTotals(holdings)
  const r = riskScores(holdings)
  const returns = Math.max(0, Math.min(40, (t.roi / 0.5) * 40))
  const diversification = Math.min(30, (r.classes / 7) * 30)
  const riskCtrl = Math.max(0, (1 - Math.min(1, r.concentration)) * 30)
  return Math.round(returns + diversification + riskCtrl)
}

export function netWorth(assets: NetWorthItem[], liabilities: NetWorthItem[], portfolioCurrent: number) {
  const totalAssets = assets.reduce((s, a) => s + a.value, 0) + portfolioCurrent
  const totalLiab = liabilities.reduce((s, a) => s + a.value, 0)
  return { totalAssets, totalLiab, net: totalAssets - totalLiab }
}

export function goalProgress(g: Goal) {
  const pct = g.target ? Math.min(1, g.saved / g.target) : 0
  const remaining = Math.max(0, g.target - g.saved)
  const months = g.monthly ? Math.ceil(remaining / g.monthly) : Infinity
  return { pct, remaining, months }
}

// --- Calculators ---
export function sipFutureValue(monthly: number, years: number, annualReturn: number) {
  const n = years * 12
  const i = annualReturn / 12
  const fv = i === 0 ? monthly * n : monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i)
  return { fv, invested: monthly * n, gain: fv - monthly * n }
}

export function retirementForecast(inp: {
  currentAge: number; retireAge: number; monthlyExpenses: number; inflation: number; expectedReturn: number; monthlySIP: number; currentPortfolio: number; withdrawalRate: number
}) {
  const years = inp.retireAge - inp.currentAge
  const annualExpensesAtRetirement = inp.monthlyExpenses * 12 * Math.pow(1 + inp.inflation, years)
  const fireNumber = annualExpensesAtRetirement / inp.withdrawalRate
  const i = inp.expectedReturn / 12
  const n = years * 12
  const fvCurrent = inp.currentPortfolio * Math.pow(1 + inp.expectedReturn, years)
  const fvSIP = i === 0 ? inp.monthlySIP * n : inp.monthlySIP * ((Math.pow(1 + i, n) - 1) / i) * (1 + i)
  const projected = fvCurrent + fvSIP
  const monthlyPassive = (projected * inp.withdrawalRate) / 12
  const readiness = fireNumber ? projected / fireNumber : 0
  const sustainability = annualExpensesAtRetirement ? projected / annualExpensesAtRetirement : 0
  return { years, annualExpensesAtRetirement, fireNumber, projected, monthlyPassive, readiness, sustainability }
}

// --- Formatting ---
export function inr(n: number, compact = false): string {
  if (compact) {
    const a = Math.abs(n)
    if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
    if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  }
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}
export const pct = (x: number) => `${(x * 100).toFixed(1)}%`
