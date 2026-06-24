import { useState } from 'react'
import { Wallet, TrendingUp, PiggyBank, ShoppingCart, LineChart, Plus, Trash2 } from 'lucide-react'
import { Card, Stat } from '@/components/ui'
import { LockScreen } from '@/components/LockScreen'
import { prettyDate } from '@/lib/time'
import {
  useTxns,
  useInvestments,
  newInvestment,
  sumByType,
  byCategory,
  byGroup,
  investmentTotals,
  inr,
  INV_GROUPS,
  STOCK_KINDS,
  type Txn,
  type TxnType,
  type InvGroup,
  type StockKind,
} from './financeData'

const TABS = ['Dashboard', 'Income', 'Investment', 'Saving', 'Spending'] as const
type Tab = (typeof TABS)[number]
const TYPE_COLOR: Record<TxnType, string> = { income: '#059669', spending: '#d93a2b', saving: '#1c4d8c', investment: '#d97706' }

function CatBars({ data, color }: { data: { name: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  if (!data.length) return <p className="py-2 text-sm text-ink-faint">No data yet.</p>
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-ink-muted">{d.name}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-surface-2">
            <div className="h-full rounded" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <span className="w-20 shrink-0 text-right text-xs tabular-nums text-ink-faint">{inr(d.value)}</span>
        </div>
      ))}
    </div>
  )
}

function TxnTable({ txns }: { txns: Txn[] }) {
  if (!txns.length) return <p className="py-2 text-sm text-ink-faint">No transactions yet.</p>
  const sorted = [...txns].sort((a, b) => (a.date < b.date ? 1 : -1))
  return (
    <ul className="divide-y-2 divide-border">
      {sorted.slice(0, 40).map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
          <span className="w-20 shrink-0 font-mono text-[11px] text-ink-faint">{prettyDate(t.date).replace(/^\w+,\s/, '')}</span>
          <span className="min-w-0 flex-1 truncate text-ink">{t.description}</span>
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: TYPE_COLOR[t.type], background: `${TYPE_COLOR[t.type]}1f` }}>{t.category}</span>
          <span className="w-24 shrink-0 text-right tabular-nums text-ink">{inr(t.amount)}</span>
        </li>
      ))}
    </ul>
  )
}

function Dashboard({ txns, invCurrent, invPnl }: { txns: Txn[]; invCurrent: number; invPnl: number }) {
  const income = sumByType(txns, 'income')
  const spending = sumByType(txns, 'spending')
  const saving = sumByType(txns, 'saving')
  const invested = sumByType(txns, 'investment')
  const net = income - spending - saving - invested
  const savingsRate = income ? Math.round(((saving + invested) / income) * 100) : 0
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Income" value={inr(income, true)} sub="this period" />
        <Stat label="Spending" value={inr(spending, true)} sub="this period" />
        <Stat label="Saved + invested" value={inr(saving + invested, true)} sub={`${savingsRate}% savings rate`} />
        <Stat label="Net cash flow" value={inr(net, true)} sub={net >= 0 ? 'surplus' : 'deficit'} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Income vs spending">
          <CatBars data={[{ name: 'Income', value: income }, { name: 'Spending', value: spending }, { name: 'Saved', value: saving }, { name: 'Invested', value: invested }]} color="#1c4d8c" />
        </Card>
        <Card title="Portfolio">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold tabular-nums text-ink">{inr(invCurrent, true)}</span>
            <span className="text-sm font-medium" style={{ color: invPnl >= 0 ? '#059669' : '#d93a2b' }}>{invPnl >= 0 ? '+' : ''}{inr(invPnl, true)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-faint">current value Â· unrealised P&L</p>
          <div className="mt-3"><CatBars data={byCategory(txns, 'spending').slice(0, 4)} color="#d93a2b" /></div>
        </Card>
      </div>
      <Card title="Recent transactions"><TxnTable txns={txns} /></Card>
    </div>
  )
}

function InvestmentTab() {
  const { items, add, update, remove } = useInvestments()
  const [name, setName] = useState('')
  const [group, setGroup] = useState<InvGroup>('Stocks')
  const [kind, setKind] = useState<StockKind>('ETF')
  const [invested, setInvested] = useState('')
  const [current, setCurrent] = useState('')
  const submit = () => {
    if (!name.trim()) return
    add(newInvestment(name.trim(), group, group === 'Stocks' ? kind : '', Number(invested), Number(current)))
    setName('')
    setInvested('')
    setCurrent('')
  }
  const tot = investmentTotals(items)
  const fld = 'rounded-[10px] border-2 border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-accent'
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invested" value={inr(tot.invested, true)} />
        <Stat label="Current value" value={inr(tot.current, true)} />
        <Stat label="Unrealised P&L" value={inr(tot.pnl, true)} sub={`${(tot.roi * 100).toFixed(1)}% ROI`} />
        <Stat label="Holdings" value={items.length} sub="across groups" />
      </div>

      <Card title="Add a holding">
        <div className="flex flex-wrap items-end gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Nifty 50 ETF)" className={`${fld} min-w-[12rem] flex-1`} />
          <select value={group} onChange={(e) => setGroup(e.target.value as InvGroup)} className={fld}>
            {INV_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </select>
          {group === 'Stocks' && (
            <select value={kind} onChange={(e) => setKind(e.target.value as StockKind)} className={fld}>
              {STOCK_KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          )}
          <input value={invested} onChange={(e) => setInvested(e.target.value)} type="number" placeholder="Invested â‚¹" className={`${fld} w-32`} />
          <input value={current} onChange={(e) => setCurrent(e.target.value)} type="number" placeholder="Current â‚¹" className={`${fld} w-32`} />
          <button onClick={submit} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"><Plus size={14} /> Add</button>
        </div>
      </Card>

      {byGroup(items).map((g) => (
        <Card key={g.group} title={`${g.group} Â· ${inr(g.current, true)} (${g.pnl >= 0 ? '+' : ''}${inr(g.pnl, true)})`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-heading text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="pb-1.5">Holding</th>
                {g.group === 'Stocks' && <th className="pb-1.5">Kind</th>}
                <th className="pb-1.5 text-right">Invested</th>
                <th className="pb-1.5 text-right">Current</th>
                <th className="pb-1.5 text-right">P&amp;L</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-border">
              {g.items.map((h) => {
                const pnl = h.current - h.invested
                const roi = h.invested ? (pnl / h.invested) * 100 : 0
                return (
                  <tr key={h.id} className="group">
                    <td className="py-1.5">
                      <input value={h.name} onChange={(e) => update(h.id, { name: e.target.value })} className="w-full rounded bg-transparent text-ink outline-none focus:bg-surface-2" />
                    </td>
                    {g.group === 'Stocks' && (
                      <td className="py-1.5">
                        <select value={h.kind} onChange={(e) => update(h.id, { kind: e.target.value as StockKind })} className="rounded bg-transparent text-xs text-ink-muted outline-none">
                          {STOCK_KINDS.map((k) => <option key={k}>{k}</option>)}
                        </select>
                      </td>
                    )}
                    <td className="py-1.5 text-right tabular-nums text-ink-muted">
                      <input value={h.invested} onChange={(e) => update(h.id, { invested: Number(e.target.value) })} type="number" className="w-24 rounded bg-transparent text-right outline-none focus:bg-surface-2" />
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-ink-muted">
                      <input value={h.current} onChange={(e) => update(h.id, { current: Number(e.target.value) })} type="number" className="w-24 rounded bg-transparent text-right outline-none focus:bg-surface-2" />
                    </td>
                    <td className="py-1.5 text-right tabular-nums" style={{ color: pnl >= 0 ? '#059669' : '#d93a2b' }}>{pnl >= 0 ? '+' : ''}{inr(pnl)} <span className="text-[10px] text-ink-faint">({roi.toFixed(0)}%)</span></td>
                    <td className="py-1.5 text-right"><button onClick={() => remove(h.id)} className="text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger"><Trash2 size={13} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  )
}

function FlowTab({ txns, type, color, label }: { txns: Txn[]; type: TxnType; color: string; label: string }) {
  const list = txns.filter((t) => t.type === type)
  const total = sumByType(txns, type)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`${label} this period`} value={inr(total, true)} sub={`${list.length} transactions`} />
      </div>
      <Card title={`${label} by category`}><CatBars data={byCategory(txns, type)} color={color} /></Card>
      <Card title={`${label} transactions`}><TxnTable txns={list} /></Card>
    </div>
  )
}

export default function Finance() {
  const [tab, setTab] = useState<Tab>('Dashboard')
  const { items: txns } = useTxns()
  const { items: inv } = useInvestments()
  const tot = investmentTotals(inv)
  const ICON: Record<Tab, typeof LineChart> = { Dashboard: LineChart, Income: TrendingUp, Investment: Wallet, Saving: PiggyBank, Spending: ShoppingCart }

  return (
    <LockScreen id="finance" label="Financial">
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Wallet size={20} /></div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Financial</h1>
          <p className="text-sm text-ink-muted">Income, spending, saving &amp; investments â€” all in one place.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b-2 border-border">
        {TABS.map((t) => {
          const Icon = ICON[t]
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-0.5 flex items-center gap-1.5 border-b-2 px-3 py-2 font-heading text-[11px] font-bold uppercase tracking-wide ${tab === t ? 'border-accent text-accent' : 'border-transparent text-ink-faint hover:text-ink'}`}
            >
              <Icon size={13} /> {t}
            </button>
          )
        })}
      </div>

      {tab === 'Dashboard' && <Dashboard txns={txns} invCurrent={tot.current} invPnl={tot.pnl} />}
      {tab === 'Income' && <FlowTab txns={txns} type="income" color="#059669" label="Income" />}
      {tab === 'Investment' && <InvestmentTab />}
      {tab === 'Saving' && <FlowTab txns={txns} type="saving" color="#1c4d8c" label="Saving" />}
      {tab === 'Spending' && <FlowTab txns={txns} type="spending" color="#d93a2b" label="Spending" />}
    </div>
    </LockScreen>
  )
}
