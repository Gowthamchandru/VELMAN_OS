import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Briefcase, Users, Plus, Trash2, ChevronLeft, Building2, ShieldCheck, Upload, Eye, FileText, Video, CheckSquare } from 'lucide-react'
import { LockScreen } from '@/components/LockScreen'
import { Card, Stat } from '@/components/ui'
import { useCompanies, newCompany, newDepartment, totalEmployees, groupTotal, type Company, type Department } from './companiesStore'
import {
  useDeptTasks, useMeetings, newDeptTask, newMeeting,
  DEPT_TASK_STATUSES, DEPT_TASK_STATUS_COLOR,
  type DeptTask, type DeptTaskStatus,
} from './deptStore'
import { todayKey } from '@/lib/time'
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

function DeptRow({ d, companyId, isSelected, onSelect, onUpdate, onRemove }: {
  d: Department
  companyId: string
  isSelected: boolean
  onSelect: () => void
  onUpdate: (p: Partial<Department>) => void
  onRemove: () => void
}) {
  const { items: allTasks } = useDeptTasks()
  const { items: allMeetings } = useMeetings()
  const openTasks = allTasks.filter((t) => t.companyId === companyId && t.department === d.name && t.status !== 'Done').length
  const meetingCount = allMeetings.filter((m) => m.companyId === companyId && m.department === d.name).length

  return (
    <div
      onClick={onSelect}
      className={`group cursor-pointer rounded-xl border-2 bg-surface p-3 transition-colors ${isSelected ? 'border-accent' : 'border-border hover:border-accent/50'}`}
    >
      <div className="flex items-center gap-2">
        <input
          value={d.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 rounded bg-transparent text-sm font-medium text-ink outline-none focus:bg-surface-2"
        />
        <input
          type="number"
          value={d.count}
          onChange={(e) => onUpdate({ count: Number(e.target.value) })}
          onClick={(e) => e.stopPropagation()}
          className="w-16 rounded bg-transparent text-right text-sm font-semibold tabular-nums text-ink outline-none focus:bg-surface-2"
        />
        <span className="text-[11px] text-ink-faint">staff</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          aria-label="remove department"
          className="text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        {openTasks > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-ink-faint">
            <CheckSquare size={11} className="text-accent" /> {openTasks} open
          </span>
        )}
        {meetingCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-ink-faint">
            <Video size={11} className="text-warn" /> {meetingCount}
          </span>
        )}
        {openTasks === 0 && meetingCount === 0 && (
          <span className="text-[11px] text-ink-faint">Click to add tasks & meetings</span>
        )}
      </div>
    </div>
  )
}

// ─── Department detail panel ──────────────────────────────────────────────────

function DeptDetail({ companyId, companyName, deptName }: { companyId: string; companyName: string; deptName: string }) {
  const { items: allTasks, add: addTask, update: updateTask, remove: removeTask } = useDeptTasks()
  const { items: allMeetings, add: addMeeting, remove: removeMeeting } = useMeetings()

  const tasks = allTasks.filter((t) => t.companyId === companyId && t.department === deptName)
  const meetings = allMeetings.filter((m) => m.companyId === companyId && m.department === deptName)

  const [taskTitle, setTaskTitle] = useState('')
  const [taskStatus, setTaskStatus] = useState<DeptTaskStatus>('Todo')
  const [taskAssignee, setTaskAssignee] = useState('')

  const [meetTitle, setMeetTitle] = useState('')
  const [meetDate, setMeetDate] = useState(todayKey())
  const [meetTime, setMeetTime] = useState('09:00')
  const [meetAttendees, setMeetAttendees] = useState('')

  const submitTask = () => {
    const t = taskTitle.trim()
    if (!t) return
    addTask({ ...newDeptTask(companyId, deptName), title: t, status: taskStatus, assignee: taskAssignee.trim() })
    setTaskTitle('')
    setTaskAssignee('')
  }

  const submitMeeting = () => {
    const t = meetTitle.trim()
    if (!t) return
    addMeeting({ ...newMeeting(companyId, companyName, deptName), title: t, date: meetDate, time: meetTime, attendees: meetAttendees.trim() })
    setMeetTitle('')
    setMeetAttendees('')
  }

  const cycleStatus = (task: DeptTask) => {
    const next: Record<DeptTaskStatus, DeptTaskStatus> = { Todo: 'In Progress', 'In Progress': 'Done', Done: 'Todo' }
    updateTask(task.id, { status: next[task.status] })
  }

  return (
    <div className="mt-3 space-y-4 rounded-xl border-2 border-accent/30 bg-accent-soft/10 p-4">
      <div className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-accent">{deptName}</div>

      {/* Tasks */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          <CheckSquare size={11} /> Tasks
        </div>
        {tasks.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-2.5 py-1.5">
                <button
                  onClick={() => cycleStatus(t)}
                  className="grid size-4 shrink-0 place-items-center rounded border-2 text-[10px]"
                  style={{
                    borderColor: DEPT_TASK_STATUS_COLOR[t.status],
                    background: DEPT_TASK_STATUS_COLOR[t.status] + '22',
                    color: DEPT_TASK_STATUS_COLOR[t.status],
                  }}
                >✓</button>
                <span className={`min-w-0 flex-1 text-sm ${t.status === 'Done' ? 'text-ink-faint line-through' : 'text-ink'}`}>{t.title}</span>
                <span className="shrink-0 rounded-full px-2 py-0.5 font-heading text-[10px] font-bold"
                  style={{ background: DEPT_TASK_STATUS_COLOR[t.status] + '18', color: DEPT_TASK_STATUS_COLOR[t.status] }}
                >{t.status}</span>
                {t.assignee && <span className="shrink-0 text-[11px] text-ink-faint">{t.assignee}</span>}
                <button onClick={() => removeTask(t.id)} className="shrink-0 text-ink-faint hover:text-danger"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitTask()} placeholder="Add a task…" className={`${fld} min-w-[10rem] flex-1 py-1.5 text-xs`} />
          <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value as DeptTaskStatus)} className={`${fld} py-1.5 text-xs`}>
            {DEPT_TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} placeholder="Assignee" className={`${fld} w-28 py-1.5 text-xs`} />
          <button onClick={submitTask} className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-accent text-white hover:opacity-90"><Plus size={14} /></button>
        </div>
      </div>

      {/* Meetings */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          <Video size={11} /> Meetings
        </div>
        {meetings.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {meetings.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-2.5 py-1.5">
                <Video size={13} className="shrink-0 text-warn" />
                <span className="min-w-0 flex-1 text-sm text-ink">{m.title}</span>
                <span className="shrink-0 font-mono text-[11px] text-ink-faint">{m.date} · {m.time}</span>
                {m.attendees && <span className="shrink-0 text-[11px] text-ink-faint">{m.attendees}</span>}
                <button onClick={() => removeMeeting(m.id)} className="shrink-0 text-ink-faint hover:text-danger"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input value={meetTitle} onChange={(e) => setMeetTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitMeeting()} placeholder="Meeting title…" className={`${fld} min-w-[10rem] flex-1 py-1.5 text-xs`} />
          <input type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} className={`${fld} font-mono py-1.5 text-xs`} />
          <input type="time" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} className={`${fld} w-28 font-mono py-1.5 text-xs`} />
          <input value={meetAttendees} onChange={(e) => setMeetAttendees(e.target.value)} placeholder="Attendees" className={`${fld} w-36 py-1.5 text-xs`} />
          <button onClick={submitMeeting} className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-warn text-white hover:opacity-90"><Plus size={14} /></button>
        </div>
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
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
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
                companyId={c.id}
                isSelected={selectedDept === d.name}
                onSelect={() => setSelectedDept(selectedDept === d.name ? null : d.name)}
                onUpdate={(p) => setDepts(c.departments.map((x) => (x.id === d.id ? { ...x, ...p } : x)))}
                onRemove={() => setDepts(c.departments.filter((x) => x.id !== d.id))}
              />
            ))}
          </div>
          {selectedDept && (
            <DeptDetail companyId={c.id} companyName={c.name} deptName={selectedDept} />
          )}
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
