// Subscriptions tracker — monthly/yearly recurring spend with renewal reminders.
// (Seeded with common examples; the uploaded sheets had no subscription data.)
import { useCollection, uid } from '@/lib/store'
import { todayKey, addDaysKey, keyToDate, dateKey, daysFromToday, shortDate } from '@/lib/time'

export type Billing = 'monthly' | 'yearly'
export type Currency = 'INR' | 'USD'

export interface Sub {
  id: string
  name: string
  amount: number // per billing period, in its currency
  currency: Currency
  billing: Billing
  category: string
  nextDue: string // YYYY-MM-DD
  autopay: boolean
}

export const SUB_CATEGORIES = ['AI', 'Cloud', 'Software', 'Entertainment', 'Shopping', 'Health', 'Other']
export const SUB_REMINDER_DAYS = 7
export const USD_INR = 83 // approx; used only to total mixed currencies

const seed: Sub[] = [
  { id: 'sub-claude', name: 'Claude Pro', amount: 20, currency: 'USD', billing: 'monthly', category: 'AI', nextDue: addDaysKey(todayKey(), 4), autopay: true },
  { id: 'sub-chatgpt', name: 'ChatGPT Plus', amount: 20, currency: 'USD', billing: 'monthly', category: 'AI', nextDue: addDaysKey(todayKey(), 12), autopay: true },
  { id: 'sub-prime', name: 'Amazon Prime', amount: 1499, currency: 'INR', billing: 'yearly', category: 'Shopping', nextDue: addDaysKey(todayKey(), 45), autopay: true },
  { id: 'sub-netflix', name: 'Netflix', amount: 649, currency: 'INR', billing: 'monthly', category: 'Entertainment', nextDue: addDaysKey(todayKey(), 9), autopay: true },
  { id: 'sub-google', name: 'Google One (2TB)', amount: 130, currency: 'INR', billing: 'monthly', category: 'Cloud', nextDue: addDaysKey(todayKey(), 20), autopay: true },
  { id: 'sub-icloud', name: 'iCloud+', amount: 75, currency: 'INR', billing: 'monthly', category: 'Cloud', nextDue: addDaysKey(todayKey(), -2), autopay: true },
  { id: 'sub-ms365', name: 'Microsoft 365', amount: 4199, currency: 'INR', billing: 'yearly', category: 'Software', nextDue: addDaysKey(todayKey(), 90), autopay: false },
]

export const useSubs = () => useCollection<Sub>('gcos.subs.v1', seed)
export const newSub = (name: string, amount: number, currency: Currency, billing: Billing, category: string, nextDue: string): Sub => ({
  id: uid(),
  name,
  amount: amount || 0,
  currency,
  billing,
  category: category || 'Other',
  nextDue,
  autopay: false,
})

export const money = (n: number, c: Currency): string => (c === 'USD' ? `$${Math.round(n).toLocaleString('en-US')}` : `₹${Math.round(n).toLocaleString('en-IN')}`)

// Monthly cost normalised to INR (for totals across currencies).
export function monthlyINR(s: Sub): number {
  const perMonth = s.billing === 'yearly' ? s.amount / 12 : s.amount
  return s.currency === 'USD' ? perMonth * USD_INR : perMonth
}

export type DueStatus = 'ok' | 'soon' | 'overdue'
export function dueStatus(s: Sub): DueStatus {
  const d = daysFromToday(s.nextDue)
  if (d < 0) return 'overdue'
  if (d <= SUB_REMINDER_DAYS) return 'soon'
  return 'ok'
}
export function dueLabel(s: Sub): string {
  const d = daysFromToday(s.nextDue)
  if (d < 0) return `overdue ${-d}d`
  if (d === 0) return 'due today'
  if (d <= SUB_REMINDER_DAYS) return `due in ${d}d`
  return `due ${shortDate(s.nextDue)}`
}
export const STATUS_COLOR: Record<DueStatus, string> = { ok: '#059669', soon: '#d97706', overdue: '#d93a2b' }

// Advance the due date by one billing period (after paying/renewing).
export function nextPeriod(s: Sub): string {
  const d = keyToDate(s.nextDue)
  if (s.billing === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return dateKey(d)
}
