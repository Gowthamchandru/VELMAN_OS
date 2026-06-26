// Tiny reactive localStorage store — the interim persistence layer.
// It lives behind the same seam PowerSync + Drizzle will later replace, so
// modules that use useCollection() won't change when real sync lands.
import { useSyncExternalStore } from 'react'

type Listener = () => void
const listeners = new Set<Listener>()
const cache = new Map<string, unknown>()

let version = 0
function subscribe(l: Listener) {
  listeners.add(l)
  return () => listeners.delete(l)
}
function emit() {
  version++
  listeners.forEach((l) => l())
}

function getList<T>(key: string, seed: T[]): T[] {
  if (!cache.has(key)) {
    try {
      const stored = localStorage.getItem(key)
      if (stored) cache.set(key, JSON.parse(stored))
      else {
        cache.set(key, seed)
        localStorage.setItem(key, JSON.stringify(seed))
      }
    } catch {
      cache.set(key, seed)
    }
  }
  return cache.get(key) as T[]
}

function setList<T>(key: string, value: T[]) {
  cache.set(key, value)
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota errors */
  }
  emit()
}

export function uid(): string {
  return (crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.round(Math.random() * 1e9)}`)
}

export interface Collection<T> {
  items: T[]
  add: (item: T) => void
  update: (id: string, patch: Partial<T>) => void
  remove: (id: string) => void
}

// Reactive CRUD over a localStorage-backed array of records (each has an `id`).
export function useCollection<T extends { id: string }>(key: string, seed: T[] = []): Collection<T> {
  const items = useSyncExternalStore(
    subscribe,
    () => getList<T>(key, seed),
    () => seed,
  )
  return {
    items,
    add: (item) => setList(key, [...getList<T>(key, seed), item]),
    update: (id, patch) => setList(key, getList<T>(key, seed).map((x) => (x.id === id ? { ...x, ...patch } : x))),
    remove: (id) => setList(key, getList<T>(key, seed).filter((x) => x.id !== id)),
  }
}

// Ephemeral reactive scalar — in-memory only, resets each page load. For UI
// state like the currently-viewed day (we always reopen on "today").
const ephemeral = new Map<string, unknown>()
export function useEphemeral<T>(key: string, initial: T): [T, (v: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => (ephemeral.has(key) ? (ephemeral.get(key) as T) : initial),
    () => initial,
  )
  return [value, (v: T) => { ephemeral.set(key, v); emit() }]
}

// One-off read of a localStorage-backed array without subscribing — used to
// carry yesterday's unfinished to-dos forward, and by global search.
export function peekList<T>(key: string): T[] | null {
  if (cache.has(key)) return cache.get(key) as T[]
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : null
  } catch {
    return null
  }
}

// Re-render on ANY store change (for components that read via peekList, e.g.
// the habit grid reading many per-day logs without one hook per day).
export function useStoreTick(): number {
  return useSyncExternalStore(subscribe, () => version, () => version)
}

// Toggle a {id} entry in a localStorage-backed list (used for habit day-logs).
export function toggleListItem(key: string, id: string) {
  const cur = getList<{ id: string }>(key, [])
  setList(key, cur.some((x) => x.id === id) ? cur.filter((x) => x.id !== id) : [...cur, { id }])
}

// All localStorage keys starting with a prefix (for global search across days).
export function keysWithPrefix(prefix: string): string[] {
  const out: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) out.push(k)
    }
  } catch {
    /* ignore */
  }
  return out
}

// Reactive single string value (e.g. an API key, the last brief).
export function useLocalValue(key: string, initial = ''): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      if (!cache.has(key)) {
        try {
          const s = localStorage.getItem(key)
          cache.set(key, s ?? initial)
        } catch {
          cache.set(key, initial)
        }
      }
      return cache.get(key) as string
    },
    () => initial,
  )
  const set = (v: string) => {
    cache.set(key, v)
    try {
      localStorage.setItem(key, v)
    } catch {
      /* ignore */
    }
    emit()
  }
  return [value, set]
}
