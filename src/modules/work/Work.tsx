import { useState } from 'react'
import { Briefcase, Users, Plus, Trash2, ChevronLeft, Building2, Lightbulb } from 'lucide-react'
import { Card, Stat } from '@/components/ui'
import { useCompanies, newCompany, newDepartment, totalEmployees, groupTotal, type Company, type Department } from './companiesStore'

const fld = 'rounded-[10px] border-2 border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-accent'

function CompanyCard({ c, onOpen }: { c: Company; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex flex-col items-start gap-2 rounded-2xl border-2 border-border bg-surface p-4 text-left hover:border-accent hover:brand-glow">
      <div className="flex w-full items-center justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-soft font-heading text-[13px] font-bold text-accent">{c.code}</span>
        <Building2 size={16} className="text-ink-faint" />
      </div>
      <div className="font-heading text-[13px] font-bold tracking-[0.06em] text-ink">{c.name}</div>
      <div className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Users size={14} className="text-accent" /> <span className="font-semibold tabular-nums text-ink">{totalEmployees(c)}</span> employees
      </div>
      <div className="text-[11px] text-ink-faint">{c.departments.length} departments</div>
    </button>
  )
}

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

function CompanyDetail({ c, onUpdate, onBack }: { c: Company; onUpdate: (p: Partial<Company>) => void; onBack: () => void }) {
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
        <span className="grid size-12 place-items-center rounded-xl bg-accent-soft font-heading text-[15px] font-bold text-accent">{c.code}</span>
        <input value={c.name} onChange={(e) => onUpdate({ name: e.target.value })} className="rounded bg-transparent text-2xl font-semibold text-ink outline-none focus:bg-surface-2" />
        <div className="ml-auto flex gap-2">
          <Stat label="Employees" value={totalEmployees(c)} sub="total" />
          <Stat label="Departments" value={c.departments.length} sub="active" />
        </div>
      </div>

      <Card title="Departments · latest headcount">
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
    </div>
  )
}

export default function Work() {
  const { items, add, update } = useCompanies()
  const [openId, setOpenId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const open = items.find((c) => c.id === openId) ?? null

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
        <CompanyDetail c={open} onUpdate={(p) => update(open.id, p)} onBack={() => setOpenId(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Briefcase size={20} /></div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Work</h1>
          <p className="text-sm text-ink-muted">Your companies — tap one for department headcounts. The assistant suggests department improvements.</p>
        </div>
        <div className="ml-auto hidden gap-2 lg:flex">
          <Stat label="Group headcount" value={groupTotal(items)} sub={`${items.length} companies`} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((c) => (
          <CompanyCard key={c.id} c={c} onOpen={() => setOpenId(c.id)} />
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
