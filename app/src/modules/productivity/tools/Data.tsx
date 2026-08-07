// Export/Import (JSON file round-trip) and Sync Backup (writes a snapshot into
// the Obsidian vault via the existing local server bridge, so productivity data
// lands beside the rest of the second brain).
import { useState } from 'react'
import { Download, Upload, RefreshCw, HardDriveDownload, FolderOpen, Check } from 'lucide-react'
import { Card, Empty, Pill } from '@/components/ui'
import { useVaultStatus, captureToVault } from '@/lib/vault'
import { exportProductivity, importProductivity, PROD_PREFIX } from '../productivityStore'

function countRecords(): { key: string; label: string; n: number }[] {
  const label = (k: string) => k.replace(PROD_PREFIX, '').replace(/\.v\d+$/, '').replace(/([a-z])([A-Z])/g, '$1 $2')
  const out: { key: string; label: string; n: number }[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PROD_PREFIX)) continue
      let n = 0
      try {
        const v = JSON.parse(localStorage.getItem(k) ?? 'null')
        n = Array.isArray(v) ? v.length : 1
      } catch {
        n = 1
      }
      out.push({ key: k, label: label(k), n })
    }
  } catch {
    /* storage unavailable */
  }
  return out.sort((a, b) => b.n - a.n)
}

export function ExportImport() {
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const records = countRecords()
  const total = records.reduce((s, r) => s + r.n, 0)

  const download = () => {
    const blob = new Blob([exportProductivity()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `velman-productivity-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Exported to your downloads folder.')
    setErr('')
  }

  const upload = async (file: File) => {
    setMsg(''); setErr('')
    try {
      const n = importProductivity(await file.text())
      setMsg(`Restored ${n} collections. Reloading…`)
      setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed.')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="EXPORT" icon={Download}>
        <p className="text-sm text-ink-muted">Save every productivity collection as one JSON file — notes, lists, planners, goals, board and sessions.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {records.length === 0 ? <Empty>Nothing to export yet.</Empty> : records.map((r) => <Pill key={r.key}>{r.label} · {r.n}</Pill>)}
        </div>
        <button onClick={download} disabled={!records.length} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent py-2.5 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:opacity-90 disabled:opacity-40">
          <Download size={14} /> Download {total} records
        </button>
      </Card>

      <Card title="IMPORT" icon={Upload}>
        <p className="text-sm text-ink-muted">Restore from a previously exported file. Collections in the file <b className="text-ink">replace</b> the ones here with the same name; anything not in the file is left alone.</p>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-border py-6 text-sm text-ink-muted transition-colors hover:border-accent hover:text-accent">
          <Upload size={15} /> Choose a .json file
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f) }} />
        </label>
        {msg && <p className="mt-2 text-xs text-online">{msg}</p>}
        {err && <p className="mt-2 text-xs text-danger">{err}</p>}
      </Card>
    </div>
  )
}

export function SyncBackup() {
  const status = useVaultStatus()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const records = countRecords()
  const total = records.reduce((s, r) => s + r.n, 0)
  const connected = status.online && status.configured && status.exists

  const backup = async () => {
    setBusy(true); setMsg(''); setErr('')
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
      const summary = records.map((r) => `- ${r.label}: ${r.n}`).join('\n')
      const body = [
        `Snapshot of the Velman OS productivity suite, taken ${stamp}.`,
        '',
        '## Contents',
        summary || '- (empty)',
        '',
        '## Restore',
        'Productivity ▸ Export/Import ▸ Import, then choose the JSON below.',
        '',
        '```json',
        exportProductivity(),
        '```',
      ].join('\n')
      const r = await captureToVault(`Productivity backup ${stamp}`, body)
      setMsg(`Saved to your vault: ${r.path}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Backup failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card
        title="VAULT BACKUP"
        icon={HardDriveDownload}
        action={connected ? <Pill color="#00ffa3">Connected</Pill> : status.online ? <Pill color="#ffb020">No vault</Pill> : <Pill color="#566d91">Server offline</Pill>}
      >
        {connected ? (
          <>
            <p className="text-sm text-ink-muted">
              Writes a dated snapshot of all {total} productivity records into your Obsidian vault's inbox, so it sits alongside the rest of your second brain and rides along with whatever backs that folder up.
            </p>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-ink-faint">
              <FolderOpen size={12} /> {status.path}\{status.inboxDir}
            </div>
            <button onClick={backup} disabled={busy || !total} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent py-2.5 font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:opacity-90 disabled:opacity-40">
              <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> {busy ? 'Backing up…' : 'Back up to vault now'}
            </button>
            {msg && <p className="mt-2 flex items-center gap-1.5 text-xs text-online"><Check size={13} /> {msg}</p>}
            {err && <p className="mt-2 text-xs text-danger">{err}</p>}
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            {status.online
              ? <>No Obsidian vault is configured. Add <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">OBSIDIAN_VAULT</code> to your <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">.env</code> and restart the server.</>
              : <>The local server isn't running. Start it with <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">npm run dev:all</code> — this panel connects automatically.</>}
          </p>
        )}
      </Card>

      <Card title="WHAT GETS BACKED UP">
        {records.length === 0 ? (
          <Empty>Nothing stored yet — use the tools and come back.</Empty>
        ) : (
          <ul className="divide-y-2 divide-border">
            {records.map((r) => (
              <li key={r.key} className="flex items-center justify-between py-1.5 text-sm">
                <span className="capitalize text-ink-muted">{r.label}</span>
                <span className="font-mono tabular-nums text-ink">{r.n}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 border-t-2 border-border pt-2 text-[11px] text-ink-faint">
          Backups are plain markdown with a JSON block — readable in Obsidian, restorable through Export/Import.
        </p>
      </Card>
    </div>
  )
}
