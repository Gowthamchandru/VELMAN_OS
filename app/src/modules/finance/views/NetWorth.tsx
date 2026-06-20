import { Plus, X, PieChart as PieIcon, Scale } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, Stat } from '@/components/ui'
import { uid } from '@/lib/store'
import { useAssets, useLiabilities, useHoldings, portfolioTotals, netWorth, inr, type NetWorthItem } from '../financeReal'

const PALETTE = ['#1c4d8c', '#059669', '#d97706', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308', '#64748b']
const tooltipStyle = { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12, color: 'var(--color-ink)' }

const num = (v: string) => { const n = parseFloat(v.replace(/,/g, '')); return isNaN(n) ? 0 : n }
const cellInput = 'rounded bg-transparent px-1 py-0.5 text-sm text-ink outline-none focus:bg-surface-2 focus:ring-1 focus:ring-accent'

function ItemList({
  title,
  store,
  kind,
  accent,
  extraRow,
}: {
  title: string
  store: { items: NetWorthItem[]; add: (i: NetWorthItem) => void; update: (id: string, p: Partial<NetWorthItem>) => void; remove: (id: string) => void }
  kind: 'asset' | 'liability'
  accent: string
  extraRow?: { name: string; value: number }
}) {
  const total = store.items.reduce((s, i) => s + i.value, 0) + (extraRow?.value ?? 0)
  return (
    <Card
      title={title}
      action={
        <button onClick={() => store.add({ id: uid(), name: 'New item', category: '', value: 0, kind })} className="flex items-center gap-1 rounded-[10px] border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted hover:text-accent">
          <Plus size={12} /> Add
        </button>
      }
    >
      <ul className="space-y-1">
        {extraRow && (
          <li className="flex items-center gap-2 border-b-2 border-border py-1.5 text-sm">
            <span className="flex-1 text-ink">{extraRow.name}</span>
            <span className="tabular-nums text-ink" style={{ color: accent }}>{inr(extraRow.value, true)}</span>
            <span className="w-4" />
          </li>
        )}
        {store.items.map((i) => (
          <li key={i.id} className="group flex items-center gap-2 py-1 text-sm">
            <input className={`${cellInput} min-w-0 flex-1`} value={i.name} onChange={(e) => store.update(i.id, { name: e.target.value })} />
            <input className={`${cellInput} w-28 text-right tabular-nums`} value={i.value} onChange={(e) => store.update(i.id, { value: num(e.target.value) })} />
            <button onClick={() => store.remove(i.id)} aria-label="remove" className="text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger"><X size={13} /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t-2 border-border pt-2">
        <span className="font-heading text-[11px] uppercase tracking-[0.1em] text-ink-faint">Total {kind}s</span>
        <span className="text-base font-semibold tabular-nums" style={{ color: accent }}>{inr(total, true)}</span>
      </div>
    </Card>
  )
}

export default function NetWorth() {
  const assets = useAssets()
  const liabilities = useLiabilities()
  const { items: holdings } = useHoldings()
  const pf = portfolioTotals(holdings)
  const nw = netWorth(assets.items, liabilities.items, pf.current)
  const composition = [{ name: 'Investment Portfolio', value: pf.current }, ...assets.items.map((a) => ({ name: a.name, value: a.value }))]
    .filter((x) => x.value > 0)
    .map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }))
  const liabPct = nw.totalAssets ? (nw.totalLiab / nw.totalAssets) * 100 : 0
  const netPct = nw.totalAssets ? (nw.net / nw.totalAssets) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total assets" value={inr(nw.totalAssets, true)} sub="incl. live portfolio" />
        <Stat label="Liabilities" value={inr(nw.totalLiab, true)} />
        <Stat label="Net worth" value={inr(nw.net, true)} sub="assets − liabilities" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Asset composition" icon={PieIcon}>
          <div className="flex items-center gap-3">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={false} data={composition} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2} stroke="none">
                    {composition.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v), true)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-1 text-xs">
              {composition.map((c) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="min-w-0 flex-1 truncate text-ink-muted">{c.name}</span>
                  <span className="tabular-nums text-ink-faint">{inr(c.value, true)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card title="Assets vs liabilities" icon={Scale}>
          <div className="space-y-3 pt-1">
            <div>
              <div className="mb-1 flex justify-between text-xs"><span className="text-ink-muted">Total assets</span><span className="tabular-nums text-ink">{inr(nw.totalAssets, true)}</span></div>
              <div className="h-5 overflow-hidden rounded bg-surface-2"><div className="h-full rounded bg-online" style={{ width: '100%' }} /></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs"><span className="text-ink-muted">Liabilities</span><span className="tabular-nums text-danger">{inr(nw.totalLiab, true)}</span></div>
              <div className="h-5 overflow-hidden rounded bg-surface-2"><div className="h-full rounded" style={{ width: `${liabPct}%`, background: '#d93a2b' }} /></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs"><span className="text-ink-muted">Net worth</span><span className="tabular-nums text-accent">{inr(nw.net, true)}</span></div>
              <div className="h-5 overflow-hidden rounded bg-surface-2"><div className="h-full rounded bg-accent" style={{ width: `${netPct}%` }} /></div>
            </div>
            <p className="text-[11px] text-ink-faint">Liabilities are {liabPct.toFixed(0)}% of assets — net worth is {netPct.toFixed(0)}% of what you own.</p>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ItemList title="Assets" store={assets} kind="asset" accent="#059669" extraRow={{ name: 'Investment Portfolio (live)', value: pf.current }} />
        <ItemList title="Liabilities" store={liabilities} kind="liability" accent="#d93a2b" />
      </div>
    </div>
  )
}
