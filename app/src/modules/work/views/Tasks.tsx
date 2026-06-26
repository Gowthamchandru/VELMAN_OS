import { Plus, X, BarChart3, Users, PieChart as PieIcon } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, Stat } from '@/components/ui'
import {
  useTasks, newTask, daysLeft, taskKpis,
  PRIORITIES, STATUSES, CATEGORIES, PRIORITY_COLOR, STATUS_COLOR,
  type Priority, type Status,
} from '../tasksStore'

const CAT_PALETTE = ['#1c4d8c', '#059669', '#d97706', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308', '#64748b']
const tooltipStyle = { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12, color: 'var(--color-ink)' }
const sel = 'w-full rounded bg-transparent px-1 py-1 text-sm outline-none focus:bg-surface-2 focus:ring-1 focus:ring-accent'
const COLS = [38, 230, 118, 112, 120, 56, 134, 108, 30]
const TH = 'pb-2 px-1 text-left font-bold align-bottom'

export default function Tasks() {
  const { items, add, update, remove } = useTasks()
  const k = taskKpis(items)
  const catData = k.byCategory.map((c, i) => ({ ...c, color: CAT_PALETTE[i % CAT_PALETTE.length] }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total tasks" value={`${k.total}`} sub={`${k.done} done`} />
        <Stat label="Due today" value={`${k.dueToday}`} />
        <Stat label="Overdue" value={`${k.overdue}`} />
        <Stat label="Completed" value={`${k.done} / ${k.total}`} sub={`${Math.round((k.done / (k.total || 1)) * 100)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="By priority" icon={BarChart3}>
          <div className="h-40">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={k.byPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="key" tick={{ fill: 'var(--color-ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-ink-faint)', fontSize: 10 }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-surface-2)' }} />
                <Bar isAnimationActive={false} dataKey="n" radius={[4, 4, 0, 0]}>
                  {k.byPriority.map((p) => <Cell key={p.key} fill={PRIORITY_COLOR[p.key as Priority]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="By assignee" icon={Users}>
          <div style={{ height: Math.max(120, k.byAssignee.length * 30) }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart layout="vertical" data={k.byAssignee} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="key" width={70} tick={{ fill: 'var(--color-ink-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-surface-2)' }} />
                <Bar isAnimationActive={false} dataKey="n" fill="#1c4d8c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="By category" icon={PieIcon}>
          <div className="flex items-center gap-3">
            <div className="h-32 w-32 shrink-0">
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={false} data={catData} dataKey="n" nameKey="key" innerRadius={36} outerRadius={60} paddingAngle={2} stroke="none">
                    {catData.map((c) => <Cell key={c.key} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-1 text-xs">
              {catData.map((c) => (
                <li key={c.key} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: c.color }} />
                  <span className="flex-1 text-ink-muted">{c.key}</span>
                  <span className="tabular-nums text-ink-faint">{c.n}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card
        title={`Task tracker · ${items.length}`}
        action={
          <button onClick={() => add(newTask())} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-2.5 py-1 font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:opacity-90">
            <Plus size={13} /> Add task
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] table-fixed text-sm">
            <colgroup>{COLS.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.06em] text-ink-faint">
                <th className={TH}></th>
                <th className={TH}>Task</th>
                <th className={TH}>Category</th>
                <th className={TH}>Priority</th>
                <th className={TH}>Due</th>
                <th className={`${TH} text-right`}>Days</th>
                <th className={TH}>Status</th>
                <th className={TH}>Assignee</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const dl = daysLeft(t.due)
                const done = t.status === 'Done'
                return (
                  <tr key={t.id} className="group border-t-2 border-border">
                    <td className="px-1">
                      <button onClick={() => update(t.id, { status: done ? 'Backlog' : 'Done' })} aria-label="toggle done" className={`grid size-4 place-items-center rounded border-2 text-[10px] ${done ? 'border-accent bg-accent/20 text-accent' : 'border-border text-transparent hover:border-accent'}`}>✓</button>
                    </td>
                    <td className="px-1"><input className={`${sel} ${done ? 'text-ink-faint line-through' : 'text-ink'}`} value={t.title} onChange={(e) => update(t.id, { title: e.target.value })} /></td>
                    <td className="px-1">
                      <select className={`${sel} text-ink-muted`} value={t.category} onChange={(e) => update(t.id, { category: e.target.value })}>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-1">
                      <select className={`${sel} font-medium`} style={{ color: PRIORITY_COLOR[t.priority] }} value={t.priority} onChange={(e) => update(t.id, { priority: e.target.value as Priority })}>
                        {PRIORITIES.map((p) => <option key={p} className="text-ink">{p}</option>)}
                      </select>
                    </td>
                    <td className="px-1"><input type="date" className={`${sel} text-ink-muted`} value={t.due ?? ''} onChange={(e) => update(t.id, { due: e.target.value || null })} /></td>
                    <td className="px-1 text-right tabular-nums" style={{ color: dl !== null && dl < 0 ? '#d93a2b' : 'var(--color-ink-faint)' }}>{dl ?? '—'}</td>
                    <td className="px-1">
                      <select className={`${sel} font-medium`} style={{ color: STATUS_COLOR[t.status] }} value={t.status} onChange={(e) => update(t.id, { status: e.target.value as Status })}>
                        {STATUSES.map((s) => <option key={s} className="text-ink">{s}</option>)}
                      </select>
                    </td>
                    <td className="px-1"><input className={`${sel} text-ink`} value={t.assignee} onChange={(e) => update(t.id, { assignee: e.target.value })} /></td>
                    <td className="text-right"><button onClick={() => remove(t.id)} aria-label="remove" className="text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger"><X size={14} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
