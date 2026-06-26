// Live time helpers for real-time UI (the agenda "now" line, ticking clocks).
import { useEffect, useState } from 'react'

// A Date that re-renders on an interval (default every 30s — agenda granularity).
export function useNow(intervalMs = 30000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

// Minutes since midnight for a Date.
export const minutesOfDay = (d: Date): number => d.getHours() * 60 + d.getMinutes()

// Parse "7:00 AM" / "7:00:00 AM" / "19:30" → minutes since midnight (or null).
export function parseTimeToMinutes(s: string): number | null {
  if (!s) return null
  const m = s.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const ap = m[3]?.toUpperCase()
  if (ap === 'PM' && h !== 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return h * 60 + min
}

// "7:05 PM" style clock for a Date.
export const clockLabel = (d: Date): string =>
  d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

// "Monday, 19 Jun" style date.
export const dateLabel = (d: Date): string =>
  d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

// Monday–Sunday range for the week containing d: "15–21 Jun" or "29 Jun – 5 Jul".
export function weekRangeLabel(d: Date): string {
  const mondayOffset = (d.getDay() + 6) % 7 // days since Monday (0 = Mon)
  const mon = new Date(d)
  mon.setDate(d.getDate() - mondayOffset)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const day = (x: Date) => x.toLocaleDateString('en-IN', { day: 'numeric' })
  const month = (x: Date) => x.toLocaleDateString('en-IN', { month: 'short' })
  return mon.getMonth() === sun.getMonth()
    ? `${day(mon)}–${day(sun)} ${month(sun)}`
    : `${day(mon)} ${month(mon)} – ${day(sun)} ${month(sun)}`
}

// Time-of-day greeting.
export function greeting(d: Date): string {
  const h = d.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night'
}

// ---- Day keys: 'YYYY-MM-DD' in local time, the id for a day's records. ----
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export const todayKey = (): string => dateKey(new Date())

// Parse a day key back to a local Date (noon, to dodge DST/TZ edges).
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12)
}
export const addDaysKey = (key: string, n: number): string => {
  const d = keyToDate(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

// "Friday, 19 Jun" from a day key.
export const prettyDate = (key: string): string => dateLabel(keyToDate(key))
// "Friday" from a day key.
export const weekdayName = (key: string): string =>
  keyToDate(key).toLocaleDateString('en-IN', { weekday: 'long' })
// "19 Jun" from a day key.
export const shortDate = (key: string): string =>
  keyToDate(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
// Signed whole-day difference: key minus today (negative = past).
export function daysFromToday(key: string): number {
  const ms = keyToDate(key).getTime() - keyToDate(todayKey()).getTime()
  return Math.round(ms / 86400000)
}
