// Client side of the Obsidian vault bridge. All disk access happens in
// server/index.mjs — this file just calls its /api/vault endpoints and, for
// tasks, adopts the canonical merge result into the local store.
import { useEffect, useState } from 'react'
import { SERVER } from '@/lib/server'
import { peekList, replaceList } from '@/lib/store'
import { TASKS_KEY, readTombstones, clearTombstones, type Task } from '@/modules/work/tasksStore'

export interface VaultStatus {
  checking: boolean
  online: boolean // assistant server reachable
  configured: boolean // OBSIDIAN_VAULT set in .env
  exists?: boolean
  path?: string
  notes?: number
  tasks?: number
  tasksDir?: string
  inboxDir?: string
  error?: string
}

export function useVaultStatus(pollMs = 10000): VaultStatus {
  const [state, setState] = useState<VaultStatus>({ checking: true, online: false, configured: false })
  useEffect(() => {
    let alive = true
    const ping = async () => {
      try {
        const res = await fetch(`${SERVER}/api/vault/status`, { signal: AbortSignal.timeout(4000) })
        if (!res.ok) throw new Error('bad status')
        const j = await res.json()
        if (alive) setState({ checking: false, online: true, ...j })
      } catch {
        if (alive) setState({ checking: false, online: false, configured: false })
      }
    }
    ping()
    const id = setInterval(ping, pollMs)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [pollMs])
  return state
}

async function vaultFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${SERVER}${path}`, init)
  } catch {
    throw new Error(`Can't reach the assistant server at ${SERVER}. Start it with "npm run dev:all".`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Server error (${res.status}).`)
  return data as T
}

export interface VaultSearchResult {
  path: string
  snippet: string
  modified: string | null
}

export function searchVault(q: string): Promise<VaultSearchResult[]> {
  return vaultFetch<{ results: VaultSearchResult[] }>(`/api/vault/search?q=${encodeURIComponent(q)}`).then((r) => r.results)
}

export function readVaultNote(path: string): Promise<{ path: string; content: string }> {
  return vaultFetch(`/api/vault/note?p=${encodeURIComponent(path)}`)
}

export function captureToVault(title: string, text: string): Promise<{ path: string }> {
  return vaultFetch('/api/vault/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, text }),
  })
}

export interface SyncResult {
  counts: { created: number; updated: number; archived: number }
  total: number
}

// Two-way task sync: send local tasks + delete-tombstones, adopt the server's
// canonical merge (last-write-wins per task; vault archives instead of deletes).
export async function syncTasksWithVault(): Promise<SyncResult> {
  const tasks = peekList<Task>(TASKS_KEY) ?? []
  const deleted = readTombstones()
  const r = await vaultFetch<{ tasks: Task[]; counts: SyncResult['counts']; clearedTombstones: string[] }>(
    '/api/vault/tasks/sync',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, deleted }),
    },
  )
  replaceList(TASKS_KEY, r.tasks)
  clearTombstones(r.clearedTombstones)
  return { counts: r.counts, total: r.tasks.length }
}

// Fire-and-forget variant for page mounts — quiet when the server is offline
// or the vault isn't configured.
export async function autoSyncTasks(): Promise<SyncResult | null> {
  try {
    return await syncTasksWithVault()
  } catch {
    return null
  }
}
