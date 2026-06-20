// India-first demo finance data (INR). Stands in until manual entry / CSV / CAS
// import is wired. Numbers in rupees. Personal vs company scoped where relevant.

export type Scope = 'personal' | 'company'

// Indian-grouped currency, compact lakh/crore for big numbers.
export function inr(n: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(n)
    if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
    if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  }
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export const summary = {
  netWorth: 18430000, // 1.84 Cr
  netWorthDelta30d: 312000,
  monthlySpend: 184500,
  monthlyIncome: 420000,
  investedValue: 9650000,
  currentValue: 11280000,
  companyCash: 2600000,
  companyBurn: 540000, // per month
}
export const companyRunwayMonths = +(summary.companyCash / summary.companyBurn).toFixed(1)

export const netWorth12m = [
  { m: 'Jul', value: 1.51 },
  { m: 'Aug', value: 1.56 },
  { m: 'Sep', value: 1.6 },
  { m: 'Oct', value: 1.63 },
  { m: 'Nov', value: 1.69 },
  { m: 'Dec', value: 1.72 },
  { m: 'Jan', value: 1.75 },
  { m: 'Feb', value: 1.76 },
  { m: 'Mar', value: 1.79 },
  { m: 'Apr', value: 1.8 },
  { m: 'May', value: 1.82 },
  { m: 'Jun', value: 1.843 },
] // ₹ crore — matches the ₹1.84 Cr headline

export const spendByCategory = [
  { name: 'Rent / EMI', value: 62000, budget: 65000 },
  { name: 'Groceries', value: 24500, budget: 22000 },
  { name: 'Dining out', value: 18200, budget: 12000 },
  { name: 'Fuel / transport', value: 12800, budget: 14000 },
  { name: 'Utilities', value: 9600, budget: 10000 },
  { name: 'Domestic help', value: 18000, budget: 18000 },
  { name: 'School fees', value: 22000, budget: 22000 },
  { name: 'Subscriptions', value: 5400, budget: 6000 },
]

export interface Holding {
  name: string
  klass: string
  invested: number
  current: number
  xirr: number
}
export const holdings: Holding[] = [
  { name: 'Parag Parikh Flexi Cap (SIP)', klass: 'Mutual fund', invested: 1450000, current: 1980000, xirr: 18.4 },
  { name: 'Nippon Small Cap (SIP)', klass: 'Mutual fund', invested: 820000, current: 1140000, xirr: 22.1 },
  { name: 'NSE direct equity', klass: 'Stocks', invested: 1200000, current: 1410000, xirr: 12.6 },
  { name: 'PPF', klass: 'Fixed income', invested: 900000, current: 1080000, xirr: 7.1 },
  { name: 'NPS Tier-1', klass: 'Retirement', invested: 600000, current: 760000, xirr: 11.2 },
  { name: 'Fixed deposits', klass: 'Fixed income', invested: 1500000, current: 1640000, xirr: 6.8 },
  { name: 'Sovereign Gold Bonds', klass: 'Gold', invested: 480000, current: 610000, xirr: 13.9 },
  { name: 'Real estate (plot)', klass: 'Real estate', invested: 2700000, current: 3000000, xirr: 5.4 },
]

export const allocation = [
  { name: 'Mutual funds', value: 3120000, color: '#60a5fa' },
  { name: 'Stocks', value: 1410000, color: '#34d399' },
  { name: 'Fixed income', value: 2720000, color: '#fbbf24' },
  { name: 'Real estate', value: 3000000, color: '#f472b6' },
  { name: 'Gold', value: 610000, color: '#fb923c' },
  { name: 'Retirement', value: 760000, color: '#a78bfa' },
]

export interface Obligation {
  name: string
  amount: number
  due: string
  kind: 'SIP' | 'EMI' | 'Bill' | 'Tax'
  scope: Scope
}
export const obligations: Obligation[] = [
  { name: 'Parag Parikh SIP', amount: 25000, due: '5 Jul', kind: 'SIP', scope: 'personal' },
  { name: 'Nippon Small Cap SIP', amount: 15000, due: '7 Jul', kind: 'SIP', scope: 'personal' },
  { name: 'Home loan EMI', amount: 52000, due: '5 Jul', kind: 'EMI', scope: 'personal' },
  { name: 'GST (company)', amount: 96000, due: '20 Jul', kind: 'Tax', scope: 'company' },
  { name: 'Advance tax Q1', amount: 145000, due: '15 Jul', kind: 'Tax', scope: 'company' },
  { name: 'Health insurance premium', amount: 38000, due: '28 Jul', kind: 'Bill', scope: 'personal' },
]

export const taxHeadroom = [
  { section: '80C', used: 110000, limit: 150000 },
  { section: '80D', used: 25000, limit: 50000 },
  { section: '80CCD(1B) NPS', used: 50000, limit: 50000 },
]
