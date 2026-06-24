import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Briefcase, Users, Plus, Trash2, ChevronLeft, Building2, Lightbulb, ShieldCheck, Upload, Eye, FileText } from 'lucide-react'
import { LockScreen } from '@/components/LockScreen'
import { Card, Stat } from '@/components/ui'
import { useCompanies, newCompany, newDepartment, totalEmployees, groupTotal, type Company, type Department } from './companiesStore'
import {
  useWorkDocs,
  newWorkDoc,
  readFileAsDataUrl,
  MAX_FILE_BYTES,
  WORK_DOC_CATEGORIES,
  type WorkDoc,
  type WorkDocCategory,
} from './workVaultStore'

const fld = 'rounded-[10px] border-2 border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-accent'

// ─── Company list card ────────────────────────────────────────────────────────

function CompanyCard({ c, onOpen }: { c: Company; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-surface p-4 text-left hover:border-accent hover:brand-glow">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft px-2.5 font-heading text-[13px] font-bold text-accent">
          {c.name}
        </span>
        <Building2 size={16} className="shrink-0 text-ink-faint" />
      </div>
      <div className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Users size={14} className="text-accent" /> <span className="font-semibold tabular-nums text-ink">{totalEmployees(c)}</span> employees
      </div>
      <div className="text-[11px] text-ink-faint">{c.departments.length} departments · {c.verticals.length} verticals</div>
    </button>
  )
}

// ─── Department row ───────────────────────────────────────────────────────────

function DeptRow({ d, onUpdate, onRemove }: { d: Department; onUpdate: (p: Partial<Department>) => void; onRemove: () => void }) {
  return (
    <div className="group rounded-xl border-2 border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <input value={d.name} onChange={(e) => onUpdate({ name: e.target.value })} className="min-w-0 flex-1 rounded bg-transparent text-sm font-medium text-ink outline-none focus:bg-surface-2" />
        <input type="number" value={d.count} onChange={(e) => onUpdate({ count: Number(e.target.value) })} className="w-16 rounded bg-transparent text-right text-sm font-semibold tabular-nums text-ink outline-none focus:bg-surface-2" />
        <span className="text-[11px] text-ink-faint">staff</span>
        <button onClick={onRemove} aria-label="remove department" className="text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger"><Trash2 size={13} /></button>
      </div>
      <div className="mt-2 flex items-start gap-1.5 rounded-[8px] border border-dashed border-border bg-surface-2/40 px-2 py-1.5 text-[11px] text-ink-faint">
        <Lightbulb size={12} className="mt-0.5 shrink-0 text-accent" />
        Assistant will suggest how to improve {d.name || 'this department'} once connected.
      </div>
    </div>
  )
}

// ─── Work vault doc card ──────────────────────────────────────────────────────

function WorkDocCard({ d, onUpload, onRemove }: { d: WorkDoc; onUpload: (f: File) => void; onRemove: () => void }) {
  return (
    <div className="flex flex-col rounded-xl border-2 border-border bg-surface p-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{d.name}</div>
        <div className="truncate text-xs text-ink-faint">
          {d.category}{d.number ? ` · ${d.number}` : ''}{d.issuer ? ` · ${d.issuer}` : ''}
        </div>
        {d.expires && (
          <div className="mt-0.5 text-[11px] text-ink-faint">Expires {d.expires}</div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {d.dataUrl ? (
          <a href={d.dataUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-[8px] border-2 border-border px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:text-accent">
            <Eye size={12} /> View
          </a>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-ink-faint"><FileText size={12} /> No file yet</span>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 rounded-[8px] border-2 border-border px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:text-accent">
          <Upload size={12} /> {d.dataUrl ? 'Replace' : 'Upload'}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
        </label>
        <button onClick={onRemove} aria-label="delete" className="ml-auto text-ink-faint hover:text-danger"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}

// ─── Work vault panel (shown inside a company) ────────────────────────────────

function CompanyVault({ company }: { company: Company }) {
  const { items, add, update, remove } = useWorkDocs()
  const docs = items.filter((d) => d.companyId === company.id)

  const [vertical, setVertical] = useState(company.verticals[0] ?? '')
  const [name, setName] = useState('')
  const [cat, setCat] = useState<WorkDocCategory>('Trade License')
  const [number, setNumber] = useState('')
  const [issuer, setIssuer] = useState('')
  const [issued, setIssued] = useState('')
  const [expires, setExpires] = useState('')
  const [file, setFile] = useState<{ dataUrl: string; fileName: string } | null>(null)
  const [err, setErr] = useState('')

  const takeFile = async (f: File | undefined, cb: (v: { dataUrl: string; fileName: string }) => void) => {
    if (!f) return
    if (f.size > MAX_FILE_BYTES) { setErr(`"${f.name}" is too large (max 1.5 MB).`); return }
    setErr('')
    cb({ dataUrl: await readFileAsDataUrl(f), fileName: f.name })
  }

  const submit = () => {
    const n = name.trim()
    if (!n || !vertical) return
    add({
      ...newWorkDoc(company.id, vertical, n, cat),
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

  const verticals = company.verticals.length ? company.verticals : ['General']

  return (
    <div className="space-y-4">
      <Card title="Add a legal document">
        <div className="flex flex-wrap items-end gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Document name" className={`${fld} min-w-[12rem] flex-1`} />
          <select value={vertical} onChange={(e) => setVertical(e.target.value)} className={fld}>
            {verticals.map((v) => <option key={v}>{v}</option>)}
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value as WorkDocCategory)} className={fld}>
            {WORK_DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Doc number" className={`${fld} w-40`} />
          <input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Issuer" className={`${fld} w-36`} />
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
            Issued
            <input type="date" value={issued} onChange={(e) => setIssued(e.target.value)} className={`${fld} font-mono text-xs`} />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
            Expires
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={`${fld} font-mono text-xs`} />
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
      </Card>

      {verticals.map((v) => {
        const vDocs = docs.filter((d) => d.vertical === v)
        if (!vDocs.length) return null
        const showTitle = verticals.length > 1
        return (
          <Card key={v} title={showTitle ? v : undefined}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vDocs.map((d) => (
                <WorkDocCard
                  key={d.id}
                  d={d}
                  onUpload={(f) => takeFile(f, (val) => update(d.id, { dataUrl: val.dataUrl, fileName: val.fileName }))}
                  onRemove={() => remove(d.id)}
                />
              ))}
            </div>
          </Card>
        )
      })}

      {docs.length === 0 && (
        <p className="text-sm text-ink-faint">No documents yet — add the first one above.</p>
      )}
    </div>
  )
}

// ─── Company detail (tabs: Departments | Vault) ───────────────────────────────

type DetailTab = 'departments' | 'vault'

function CompanyDetail({ c, onUpdate, onBack }: { c: Company; onUpdate: (p: Partial<Company>) => void; onBack: () => void }) {
  const [tab, setTab] = useState<DetailTab>('departments')
  const [deptName, setDeptName] = useState('')
  const setDepts = (departments: Department[]) => onUpdate({ departments })
  const addDept = () => {
    const n = deptName.trim()
    if (!n) return
    setDepts([...c.departments, newDepartment(n, 0)])
    setDeptName('')
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-muted hover:text-accent"><ChevronLeft size={15} /> All companies</button>

      <div className="flex flex-wrap items-center gap-3">
        <input value={c.name} onChange={(e) => onUpdate({ name: e.target.value })} className="rounded bg-transparent text-2xl font-semibold text-ink outline-none focus:bg-surface-2" />
        <div className="ml-auto flex gap-2">
          <Stat label="Employees" value={totalEmployees(c)} sub="total" />
          <Stat label="Departments" value={c.departments.length} sub="active" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border-2 border-border bg-surface p-1 w-fit">
        {(['departments', 'vault'] as DetailTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 font-heading text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
              tab === t ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t === 'vault' && <ShieldCheck size={13} />}
            {t === 'departments' ? 'Departments' : 'Vault'}
          </button>
        ))}
      </div>

      {tab === 'departments' && (
        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.departments.map((d) => (
              <DeptRow
                key={d.id}
                d={d}
                onUpdate={(p) => setDepts(c.departments.map((x) => (x.id === d.id ? { ...x, ...p } : x)))}
                onRemove={() => setDepts(c.departments.filter((x) => x.id !== d.id))}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t-2 border-border pt-3">
            <input value={deptName} onChange={(e) => setDeptName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDept()} placeholder="Add a department…" className={`${fld} w-56`} />
            <button onClick={addDept} className="grid size-9 place-items-center rounded-[10px] bg-accent text-white hover:opacity-90"><Plus size={16} /></button>
          </div>
        </Card>
      )}

      {tab === 'vault' && (
        <LockScreen id="work-vault" label="Company Vault">
          <CompanyVault company={c} />
        </LockScreen>
      )}
    </div>
  )
}

// ─── Work root ────────────────────────────────────────────────────────────────

export default function Work() {
  const { items, add, update } = useCompanies()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const openId = searchParams.get('co')
  const open = items.find((c) => c.id === openId) ?? null

  const handleOpen = (id: string) => navigate(`/work?co=${id}`)
  const handleBack = () => navigate('/work')

  const addCompany = () => {
    const c = code.trim()
    if (!c) return
    add(newCompany(c, name.trim()))
    setCode('')
    setName('')
  }

  if (open) {
    return (
      <div>
        <CompanyDetail c={open} onUpdate={(p) => update(open.id, p)} onBack={handleBack} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Briefcase size={20} /></div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Work</h1>
          <p className="text-sm text-ink-muted">Your companies — tap one for departments &amp; legal vault.</p>
        </div>
        <div className="ml-auto hidden gap-2 lg:flex">
          <Stat label="Group headcount" value={groupTotal(items)} sub={`${items.length} companies`} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((c) => (
          <CompanyCard key={c.id} c={c} onOpen={() => handleOpen(c.id)} />
        ))}
      </div>

      <Card title="Add a company">
        <div className="flex flex-wrap items-end gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCompany()} placeholder="Code (e.g. TRI)" className={`${fld} w-32`} />
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCompany()} placeholder="Full name (optional)" className={`${fld} min-w-[12rem] flex-1`} />
          <button onClick={addCompany} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"><Plus size={14} /> Add</button>
        </div>
      </Card>
    </div>
  )
}
