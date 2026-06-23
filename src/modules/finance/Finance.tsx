import { useState } from 'react'
import { Wallet, TrendingUp, PiggyBank, ShoppingCart, LineChart, Scale, Target, Calculator } from 'lucide-react'
import { Card, Stat } from '@/components/ui'
import { prettyDate } from '@/lib/time'
import { useTxns, sumByType, byCategory, inr, type Txn, type TxnType } from './financeData'
import { useHoldings, useAssets, useLiabilities, portfolioTotals, netWorth } from './financeReal'
import Portfolio from './views/Portfolio'
import NetWorth from './views/NetWorth'
import Goals from './views/Goals'
import Calculators from './views/Calculators'

// One coherent finance flow: cash flow (transactions) → wealth (portfolio,
// net worth) → planning (goals, calculators). The Dashboard, Portfolio and
// Net Worth tabs — and the AI daily brief — all read the SAME financeReal
// store, so the portfolio/net-worth numbers can never disagree across surfaces.
const TABS = ['Dashboard', 'Income', 'Spending', 'Saving', 'Portfolio', 'Net Worth', 'Goals', 'Calculators'] as const
type Tab = (typeof TABS)[number]
const ICON: Record<Tab, typeof LineChart> = {
  Dashboard: LineChart,
  Income: TrendingUp,
  Spending: ShoppingCart,
  Saving: PiggyBank,
  Portfolio: Wallet,
  'Net Worth': Scale,
  Goals: Target,
  Calculators: Calculator,
}
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

function Dashboard({ txns }: { txns: Txn[] }) {
  // Wealth side reads financeReal — the same source as the Portfolio / Net Worth
  // tabs and the AI brief, so every surface shows identical numbers.
  const { items: holdings } = useHoldings()
  const { items: assets } = useAssets()
  const { items: liabilities } = useLiabilities()
  const pf = portfolioTotals(holdings)
  const nw = netWorth(assets, liabilities, pf.current)

  const income = sumByType(txns, 'income')
  const spending = sumByType(txns, 'spending')
  const saving = sumByType(txns, 'saving')
  const invested = sumByType(txns, 'investment')
  const net = income - spending - saving - invested
  const savingsRate = income ? Math.round(((saving + invested) / income) * 100) : 0
  const pnlColor = pf.pnl >= 0 ? '#059669' : '#d93a2b'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Income" value={inr(income, true)} sub="this period" />
        <Stat label="Spending" value={inr(spending, true)} sub="this period" />
        <Stat label="Saved + invested" value={inr(saving + invested, true)} sub={`${savingsRate}% savings rate`} />
        <Stat label="Net cash flow" value={inr(net, true)} sub={net >= 0 ? 'surplus' : 'deficit'} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Net worth" value={inr(nw.net, true)} sub="assets − liabilities" />
        <Stat label="Portfolio value" value={inr(pf.current, true)} sub={`${pf.count} holdings`} />
        <Stat label="Unrealised P&L" value={`${pf.pnl >= 0 ? '+' : ''}${inr(pf.pnl, true)}`} sub={`${(pf.roi * 100).toFixed(1)}% ROI`} />
        <Stat label="Liabilities" value={inr(nw.totalLiab, true)} sub="outstanding" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Income vs spending">
          <CatBars data={[{ name: 'Income', value: income }, { name: 'Spending', value: spending }, { name: 'Saved', value: saving }, { name: 'Invested', value: invested }]} color="#1c4d8c" />
        </Card>
        <Card title="Portfolio">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold tabular-nums text-ink">{inr(pf.current, true)}</span>
            <span className="text-sm font-medium" style={{ color: pnlColor }}>{pf.pnl >= 0 ? '+' : ''}{inr(pf.pnl, true)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-faint">current value · unrealised P&L — open the Portfolio tab to edit holdings</p>
          <div className="mt-3"><CatBars data={byCategory(txns, 'spending').slice(0, 4)} color="#d93a2b" /></div>
        </Card>
      </div>
      <Card title="Recent transactions"><TxnTable txns={txns} /></Card>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Wallet size={20} /></div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Financial</h1>
          <p className="text-sm text-ink-muted">Cash flow, portfolio, net worth, goals &amp; calculators — all in one place.</p>
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

      {tab === 'Dashboard' && <Dashboard txns={txns} />}
      {tab === 'Income' && <FlowTab txns={txns} type="income" color="#059669" label="Income" />}
      {tab === 'Spending' && <FlowTab txns={txns} type="spending" color="#d93a2b" label="Spending" />}
      {tab === 'Saving' && <FlowTab txns={txns} type="saving" color="#1c4d8c" label="Saving" />}
      {tab === 'Portfolio' && <Portfolio />}
      {tab === 'Net Worth' && <NetWorth />}
      {tab === 'Goals' && <Goals />}
      {tab === 'Calculators' && <Calculators />}
    </div>
  )
}
