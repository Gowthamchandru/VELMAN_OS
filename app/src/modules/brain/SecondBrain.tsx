// Second Brain — the Obsidian vault, inside Velman OS. Browse and search your
// notes, capture thoughts straight into the vault's Inbox, and sync Work tasks
// two-way as markdown files. Everything goes through the local server; the
// vault never leaves your machine.
import { useEffect, useState } from 'react'
import { Brain, FileText, FolderOpen, Inbox, RefreshCw, Search, Send } from 'lucide-react'
import { Card, Empty, Pill, Stat } from '@/components/ui'
import {
  useVaultStatus,
  searchVault,
  readVaultNote,
  captureToVault,
  syncTasksWithVault,
  syncTodayJournal,
  autoSyncAll,
  type VaultSearchResult,
} from '@/lib/vault'

const fld = 'rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent'

function StatusPill({ s }: { s: ReturnType<typeof useVaultStatus> }) {
  if (s.checking) return <Pill>Checking…</Pill>
  if (!s.online) return <Pill color="#9ca3af">Server offline</Pill>
  if (!s.configured) return <Pill color="#d97706">Not configured</Pill>
  if (!s.exists) return <Pill color="#d93a2b">Vault path invalid</Pill>
  return <Pill color="#059669">Connected</Pill>
}

function SetupCard({ offline }: { offline: boolean }) {
  return (
    <Card title="CONNECT YOUR VAULT" icon={FolderOpen}>
      {offline ? (
        <p className="text-sm text-ink-muted">
          The assistant server isn't running. Start everything with{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">npm run dev:all</code> from the{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">app/</code> folder.
        </p>
      ) : (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-muted">
          <li>
            Open <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">.env</code> in the project root
            (create it from <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">.env.example</code>).
          </li>
          <li>
            Add <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">OBSIDIAN_VAULT=D:\path\to\your\vault</code>{' '}
            — the folder Obsidian opens.
          </li>
          <li>Restart the server. This page connects automatically.</li>
        </ol>
      )}
    </Card>
  )
}

export default function SecondBrain() {
  const status = useVaultStatus()
  const connected = status.online && status.configured && status.exists

  // --- task sync ---
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const runSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const r = await syncTasksWithVault()
      await syncTodayJournal().catch(() => null)
      const extras = [
        r.counts.renamed ? `${r.counts.renamed} renamed` : '',
        r.counts.deduped ? `${r.counts.deduped} duplicates archived` : '',
      ].filter(Boolean)
      setSyncMsg(
        `Synced — ${r.total} tasks in the vault (${r.counts.created} created, ${r.counts.updated} updated, ${r.counts.archived} archived${extras.length ? ', ' + extras.join(', ') : ''}).`,
      )
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Sync failed.')
    } finally {
      setSyncing(false)
    }
  }
  // Quiet sync (tasks + today's journal) once the page opens and the vault is reachable.
  useEffect(() => {
    if (connected) void autoSyncAll()
  }, [connected])

  // --- search + reader ---
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<VaultSearchResult[] | null>(null)
  const [note, setNote] = useState<{ path: string; content: string } | null>(null)
  const [searchErr, setSearchErr] = useState('')
  const runSearch = async () => {
    if (!q.trim()) return
    setSearching(true)
    setSearchErr('')
    try {
      setResults(await searchVault(q.trim()))
    } catch (e) {
      setSearchErr(e instanceof Error ? e.message : 'Search failed.')
      setResults(null)
    } finally {
      setSearching(false)
    }
  }
  const openNote = async (path: string) => {
    try {
      setNote(await readVaultNote(path))
    } catch (e) {
      setSearchErr(e instanceof Error ? e.message : 'Could not open the note.')
    }
  }

  // --- capture ---
  const [capTitle, setCapTitle] = useState('')
  const [capText, setCapText] = useState('')
  const [capMsg, setCapMsg] = useState('')
  const [capturing, setCapturing] = useState(false)
  const runCapture = async () => {
    if (!capText.trim()) return
    setCapturing(true)
    setCapMsg('')
    try {
      const r = await captureToVault(capTitle.trim(), capText.trim())
      setCapMsg(`Saved to ${r.path}`)
      setCapTitle('')
      setCapText('')
    } catch (e) {
      setCapMsg(e instanceof Error ? e.message : 'Capture failed.')
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Brain size={18} className="text-accent" />
          <h2 className="text-lg">Second Brain</h2>
          <StatusPill s={status} />
        </div>
        {connected && (
          <span className="font-mono text-xs text-ink-faint" title={status.path}>
            {status.path}
          </span>
        )}
      </div>

      {!connected ? (
        <SetupCard offline={!status.online} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Notes in vault" value={status.notes ?? '—'} sub="every .md file" />
            <Stat label="Tasks synced" value={status.tasks ?? '—'} sub={`${status.tasksDir}/ in the vault`} />
            <Stat label="Captures land in" value={status.inboxDir ?? 'Inbox'} sub="triage them in Obsidian" />
          </div>

          <Card
            title="WORK TASKS ↔ VAULT"
            icon={RefreshCw}
            action={
              <button
                onClick={runSync}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-50"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync now'}
              </button>
            }
          >
            <p className="text-sm text-ink-muted">
              Every Work task is a markdown file in <span className="font-mono text-xs">{status.tasksDir}/</span>, named by
              its title, with its fields as properties. Tasks link to <span className="font-mono text-xs">[[Velman OS]]</span>{' '}
              and their area note, so the graph clusters by what they belong to. Edit either side — newest edit wins per
              task; deletes and duplicates become <span className="font-mono text-xs">archived: true</span> instead of
              removed files. Each day also writes a <span className="font-mono text-xs">Journal/</span> note of what got
              done. Syncs automatically when this page or Work opens.
            </p>
            {syncMsg && <p className="mt-2 text-xs text-ink-faint">{syncMsg}</p>}
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="SEARCH THE VAULT" icon={Search}>
              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  placeholder="Search note names and contents…"
                  className={`${fld} min-w-0 flex-1`}
                />
                <button
                  onClick={runSearch}
                  disabled={searching || !q.trim()}
                  className="rounded-[10px] bg-accent px-4 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {searching ? '…' : 'Search'}
                </button>
              </div>
              {searchErr && <p className="mt-2 text-xs text-danger">{searchErr}</p>}
              <div className="mt-3 space-y-1.5">
                {results?.length === 0 && <Empty>No notes matched.</Empty>}
                {results?.map((r) => (
                  <button
                    key={r.path}
                    onClick={() => openNote(r.path)}
                    className={`block w-full rounded-xl border-2 p-2.5 text-left transition-colors ${
                      note?.path === r.path ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <FileText size={13} className="shrink-0 text-accent" />
                      <span className="truncate">{r.path.replace(/\.md$/i, '')}</span>
                    </div>
                    {r.snippet && <div className="mt-0.5 truncate text-xs text-ink-faint">…{r.snippet}…</div>}
                  </button>
                ))}
              </div>
            </Card>

            <Card title={note ? note.path.replace(/\.md$/i, '') : 'NOTE'} icon={FileText}>
              {note ? (
                <pre className="max-h-[26rem] overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">
                  {note.content}
                </pre>
              ) : (
                <Empty>Search on the left, then open a note to read it here.</Empty>
              )}
            </Card>
          </div>

          <Card title="CAPTURE TO INBOX" icon={Inbox}>
            <div className="space-y-2">
              <input value={capTitle} onChange={(e) => setCapTitle(e.target.value)} placeholder="Title (optional)" className={`${fld} w-full`} />
              <textarea
                value={capText}
                onChange={(e) => setCapText(e.target.value)}
                placeholder="A thought, an idea, a link — lands as a note in your vault's Inbox."
                rows={3}
                className={`${fld} w-full resize-y`}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={runCapture}
                  disabled={capturing || !capText.trim()}
                  className="flex items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Send size={12} /> {capturing ? 'Saving…' : 'Save to vault'}
                </button>
                {capMsg && <span className="font-mono text-xs text-ink-faint">{capMsg}</span>}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
