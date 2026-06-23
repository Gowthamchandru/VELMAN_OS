import { Plus, X, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, Stat } from '@/components/ui'
import { useHoldings, newHolding, compute, ASSET_LIST, portfolioTotals, inr, pct } from '../financeReal'

const STATUS_COLOR = { gain: '#059669', loss: '#d93a2b', flat: '#9ca3af' }
const num = (v: string) => { const n = parseFloat(v.replace(/,/g, '')); return isNaN(n) ? 0 : n }
const inputBase = 'w-full rounded bg-transparent px-1 py-1 text-sm text-ink outline-none focus:bg-surface-2 focus:ring-1 focus:ring-accent'
const numInput = `${inputBase} text-right tabular-nums`
const tooltipStyle = { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12, color: 'var(--color-ink)' }

const COLS = [180, 132, 64, 88, 96, 92, 92, 104, 64, 56, 32]
const TH = 'pb-2 px-1 font-bold align-bottom'

export default function Portfolio() {
  const { items, add, update, remove } = useHoldings()
  const rows = items.map(compute)
  const tot = portfolioTotals(items)
  const byPnl = [...rows].sort((a, b) => b.pnl - a.pnl)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Invested" value={inr(tot.invested, true)} sub={`${tot.count} holdings`} />
        <Stat label="Current value" value={inr(tot.current, true)} />
        <Stat label="Unrealised P&L" value={`+${inr(tot.pnl, true)}`} sub={`${pct(tot.roi)} ROI`} />
        <Stat label="Best / worst" value={tot.best?.name ?? '—'} sub={tot.worst ? `worst: ${tot.worst.name}` : ''} />
      </div>

      <Card
        title={`Holdings · ${items.length}`}
        action={
          <button onClick={() => add(newHolding())} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-2.5 py-1 font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:opacity-90">
            <Plus size={13} /> Add holding
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed text-sm">
            <colgroup>{COLS.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.06em] text-ink-faint">
                <th className={`${TH} text-left`}>Asset</th>
                <th className={`${TH} text-left`}>Type</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={`${TH} text-right`}>Buy ₹</th>
                <th className={`${TH} text-right`}>Now ₹</th>
                <th className={`${TH} text-right`}>Invested</th>
                <th className={`${TH} text-right`}>Current</th>
                <th className={`${TH} text-right`}>P&amp;L</th>
                <th className={`${TH} text-right`}>ROI</th>
                <th className={`${TH} text-right`}>Days</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.id} className="group border-t-2 border-border">
                  <td className="px-1"><input className={inputBase} value={h.name} onChange={(e) => update(h.id, { name: e.target.value })} /></td>
                  <td className="px-1">
                    <select className={`${inputBase} text-ink-muted`} value={h.type} onChange={(e) => update(h.id, { type: e.target.value })}>
                      {ASSET_LIST.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td><input className={numInput} value={h.qty} onChange={(e) => update(h.id, { qty: num(e.target.value) })} /></td>
                  <td><input className={numInput} value={h.buyPrice} onChange={(e) => update(h.id, { buyPrice: num(e.target.value) })} /></td>
                  <td><input className={numInput} value={h.currentPrice} onChange={(e) => update(h.id, { currentPrice: num(e.target.value) })} /></td>
                  <td className="whitespace-nowrap px-1 text-right tabular-nums text-ink-muted">{inr(h.invested, true)}</td>
                  <td className="whitespace-nowrap px-1 text-right tabular-nums text-ink">{inr(h.current, true)}</td>
                  <td className="whitespace-nowrap px-1 text-right tabular-nums" style={{ color: STATUS_COLOR[h.status] }}>{h.pnl >= 0 ? '+' : ''}{inr(h.pnl, true)}</td>
                  <td className="whitespace-nowrap px-1 text-right tabular-nums" style={{ color: STATUS_COLOR[h.status] }}>{(h.roi * 100).toFixed(1)}%</td>
                  <td className="px-1 text-right tabular-nums text-ink-faint">{h.holdingDays}</td>
                  <td className="text-right"><button onClick={() => remove(h.id)} aria-label="remove" className="text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger"><X size={14} /></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-semibold">
                <td className="px-1 pt-2 font-heading text-[11px] uppercase tracking-[0.1em] text-ink-faint" colSpan={5}>Totals</td>
                <td className="whitespace-nowrap px-1 pt-2 text-right tabular-nums text-ink-muted">{inr(tot.invested, true)}</td>
                <td className="whitespace-nowrap px-1 pt-2 text-right tabular-nums text-ink">{inr(tot.current, true)}</td>
                <td className="whitespace-nowrap px-1 pt-2 text-right tabular-nums text-emerald-600">+{inr(tot.pnl, true)}</td>
                <td className="px-1 pt-2 text-right tabular-nums text-emerald-600">{(tot.roi * 100).toFixed(1)}%</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">Edit any cell — invested, current, P&amp;L, ROI and every chart recompute instantly. Persisted locally.</p>
      </Card>

      <Card title="Profit / loss by holding" icon={BarChart3}>
        <div style={{ height: byPnl.length * 27 }}>
          <ResponsiveContainer width="99%" height="100%">
            <BarChart layout="vertical" data={byPnl} margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={130} tick={{ fill: 'var(--color-ink-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-surface-2)' }} formatter={(v) => [inr(Number(v), true), 'P&L']} />
              <Bar isAnimationActive={false} dataKey="pnl" radius={[0, 4, 4, 0]}>
                {byPnl.map((h) => <Cell key={h.id} fill={h.pnl >= 0 ? '#059669' : '#d93a2b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
