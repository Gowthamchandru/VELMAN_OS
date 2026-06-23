// Document vault — government IDs + certificates (school/college/medical), with
// renewal reminders. Files are stored as base64 data URLs in localStorage for
// now (small files only); Stage 4 moves these to encrypted, synced storage.
import { useCollection, uid } from '@/lib/store'
import { todayKey, addDaysKey, daysFromToday, shortDate } from '@/lib/time'

export type DocCategory = 'Government ID' | 'School' | 'College' | 'Medical' | 'Other'
export const DOC_CATEGORIES: DocCategory[] = ['Government ID', 'School', 'College', 'Medical', 'Other']

export interface Doc {
  id: string
  name: string
  category: DocCategory
  number?: string // for government IDs
  issuer?: string
  fileName?: string
  dataUrl?: string // base64 data URL (small files only)
  issued?: string // YYYY-MM-DD
  expires?: string // YYYY-MM-DD — renewal/expiry; drives reminders
  createdAt: string
}

// Example docs so the page isn't bare. The medical cert renews every 5 years and
// is intentionally seeded to fall due in ~30 days to show the reminder.
const seed: Doc[] = [
  { id: 'doc-aadhaar', name: 'Aadhaar Card', category: 'Government ID', number: 'XXXX XXXX 1234', issuer: 'UIDAI', createdAt: todayKey() },
  { id: 'doc-pan', name: 'PAN Card', category: 'Government ID', number: 'ABCDE1234F', issuer: 'Income Tax Dept', createdAt: todayKey() },
  { id: 'doc-passport', name: 'Passport', category: 'Government ID', number: 'P1234567', issuer: 'MEA', expires: addDaysKey(todayKey(), 400), createdAt: todayKey() },
  { id: 'doc-scl', name: '10th & 12th Marksheets (SCL)', category: 'School', issuer: 'State Board', issued: '2008-05-20', createdAt: todayKey() },
  { id: 'doc-clg', name: 'Degree Certificate (CLG)', category: 'College', issuer: 'University', issued: '2014-06-15', createdAt: todayKey() },
  { id: 'doc-med', name: 'Medical License Certificate', category: 'Medical', issuer: 'State Medical Council', issued: addDaysKey(todayKey(), -1810), expires: addDaysKey(todayKey(), 15), createdAt: todayKey() },
]

export const useDocs = () => useCollection<Doc>('gcos.docs.v2', seed)
export const newDoc = (name: string, category: DocCategory): Doc => ({ id: uid(), name, category, createdAt: todayKey() })

// Reminder fires 20 days before the renewal/expiry date.
export const REMINDER_DAYS = 20
export type ExpiryStatus = 'none' | 'ok' | 'soon' | 'overdue'
export function expiryStatus(d: Doc): ExpiryStatus {
  if (!d.expires) return 'none'
  const days = daysFromToday(d.expires)
  if (days < 0) return 'overdue'
  if (days <= REMINDER_DAYS) return 'soon'
  return 'ok'
}
export function expiryLabel(d: Doc): string {
  if (!d.expires) return ''
  const days = daysFromToday(d.expires)
  if (days < 0) return `expired ${-days}d ago`
  if (days === 0) return 'expires today'
  if (days <= REMINDER_DAYS) return `renew in ${days}d`
  return `valid till ${shortDate(d.expires)}`
}
export const STATUS_COLOR: Record<ExpiryStatus, string> = {
  none: 'var(--color-ink-faint)',
  ok: '#059669',
  soon: '#d97706',
  overdue: '#d93a2b',
}

export const MAX_FILE_BYTES = 1.5 * 1024 * 1024 // localStorage-safe ceiling for now
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}
