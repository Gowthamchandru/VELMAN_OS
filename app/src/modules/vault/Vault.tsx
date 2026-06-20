import { useState } from 'react'
import { ShieldCheck, Bell, Upload, Eye, Trash2, Plus, FileText } from 'lucide-react'
import { Card } from '@/components/ui'
import {
  useDocs,
  newDoc,
  expiryStatus,
  expiryLabel,
  STATUS_COLOR,
  readFileAsDataUrl,
  MAX_FILE_BYTES,
  DOC_CATEGORIES,
  type Doc,
  type DocCategory,
} from './vaultStore'

const fieldCls = 'rounded-[10px] border-2 border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-accent'

function ExpiryBadge({ d }: { d: Doc }) {
  const status = expiryStatus(d)
  if (status === 'none') return null
  const c = STATUS_COLOR[status]
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: c, background: `${c}1f` }}>
      {expiryLabel(d)}
    </span>
  )
}

function DocCard({ d, onUpload, onRemove }: { d: Doc; onUpload: (file: File) => void; onRemove: () => void }) {
  return (
    <div className="flex flex-col rounded-xl border-2 border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{d.name}</div>
          <div className="truncate text-xs text-ink-faint">
            {d.issuer}
            {d.number ? ` · ${d.number}` : ''}
          </div>
        </div>
        <ExpiryBadge d={d} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {d.dataUrl ? (
          <a
            href={d.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-[8px] border-2 border-border px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:text-accent"
          >
            <Eye size={12} /> View
          </a>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <FileText size={12} /> No file yet
          </span>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 rounded-[8px] border-2 border-border px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:text-accent">
          <Upload size={12} /> {d.dataUrl ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
          />
        </label>
        <button onClick={onRemove} aria-label="delete" className="ml-auto text-ink-faint hover:text-danger">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function Vault() {
  const { items, add, update, remove } = useDocs()
  const [name, setName] = useState('')
  const [cat, setCat] = useState<DocCategory>('Government ID')
  const [number, setNumber] = useState('')
  const [issuer, setIssuer] = useState('')
  const [issued, setIssued] = useState('')
  const [expires, setExpires] = useState('')
  const [file, setFile] = useState<{ dataUrl: string; fileName: string } | null>(null)
  const [err, setErr] = useState('')

  const takeFile = async (f: File | undefined, cb: (v: { dataUrl: string; fileName: string }) => void) => {
    if (!f) return
    if (f.size > MAX_FILE_BYTES) {
      setErr(`"${f.name}" is too large (max 1.5 MB for now). Compress it or attach a smaller scan.`)
      return
    }
    setErr('')
    cb({ dataUrl: await readFileAsDataUrl(f), fileName: f.name })
  }

  const submit = () => {
    const n = name.trim()
    if (!n) return
    add({
      ...newDoc(n, cat),
      number: number.trim() || undefined,
      issuer: issuer.trim() || undefined,
      issued: issued || undefined,
      expires: expires || undefined,
      dataUrl: file?.dataUrl,
      fileName: file?.fileName,
    })
    setName('')
    setNumber('')
    setIssuer('')
    setIssued('')
    setExpires('')
    setFile(null)
  }

  const reminders = items.filter((d) => {
    const s = expiryStatus(d)
    return s === 'soon' || s === 'overdue'
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Vault</h1>
          <p className="text-sm text-ink-muted">Your IDs, certificates &amp; licenses in one place — with renewal reminders.</p>
        </div>
      </div>

      {reminders.length > 0 && (
        <Card className="border-l-4 border-l-[#d97706]">
          <div className="mb-2 flex items-center gap-2 font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            <Bell size={13} className="text-[#d97706]" /> Renewal reminders
          </div>
          <ul className="space-y-1">
            {reminders.map((d) => {
              const c = STATUS_COLOR[expiryStatus(d)]
              return (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: c }} />
                  <span className="text-ink">{d.name}</span>
                  <span className="font-semibold" style={{ color: c }}>— {expiryLabel(d)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Card title="Add a document">
        <div className="flex flex-wrap items-end gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Document name" className={`${fieldCls} min-w-[12rem] flex-1`} />
          <select value={cat} onChange={(e) => setCat(e.target.value as DocCategory)} className={fieldCls}>
            {DOC_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {cat === 'Government ID' && (
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="ID number" className={`${fieldCls} w-40`} />
          )}
          <input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Issuer" className={`${fieldCls} w-36`} />
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
            Issued
            <input type="date" value={issued} onChange={(e) => setIssued(e.target.value)} className={`${fieldCls} font-mono text-xs`} />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
            Expires / renew
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={`${fieldCls} font-mono text-xs`} />
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border-2 border-border px-2.5 py-2 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:text-accent">
            <Upload size={13} /> {file ? '1 file' : 'Attach'}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => takeFile(e.target.files?.[0], setFile)} />
          </label>
          <button onClick={submit} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90">
            <Plus size={14} /> Add
          </button>
        </div>
        {err && <p className="mt-2 text-xs text-danger">{err}</p>}
        <p className="mt-2 text-[11px] text-ink-faint">Files stay on this device (max 1.5 MB each for now). Set an “Expires / renew” date to get a reminder as it nears.</p>
      </Card>

      {DOC_CATEGORIES.map((c) => {
        const docs = items.filter((d) => d.category === c)
        if (!docs.length) return null
        return (
          <Card key={c} title={c}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docs.map((d) => (
                <DocCard
                  key={d.id}
                  d={d}
                  onUpload={(f) => takeFile(f, (v) => update(d.id, { dataUrl: v.dataUrl, fileName: v.fileName }))}
                  onRemove={() => remove(d.id)}
                />
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
