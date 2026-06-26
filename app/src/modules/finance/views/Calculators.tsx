import { useState } from 'react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { TrendingUp, Palmtree } from 'lucide-react'
import { Card, Stat } from '@/components/ui'
import { useHoldings, portfolioTotals, sipFutureValue, retirementForecast, inr } from '../financeReal'

const num = (v: string) => { const n = parseFloat(v.replace(/,/g, '')); return isNaN(n) ? 0 : n }
const tooltipStyle = { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12, color: 'var(--color-ink)' }
const axis = { fill: 'var(--color-ink-faint)', fontSize: 10 }
const yFmt = (v: number) => (Math.abs(v) >= 1e7 ? `${(v / 1e7).toFixed(1)}Cr` : `${Math.round(v / 1e5)}L`)

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <div>
      <div className="mb-1 font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">{label}</div>
      <div className="flex items-center rounded-[10px] border-2 border-border bg-surface focus-within:border-accent">
        <input className="w-full bg-transparent px-2.5 py-1.5 text-sm tabular-nums text-ink outline-none" value={value} onChange={(e) => onChange(num(e.target.value))} />
        {suffix && <span className="pr-2.5 text-xs text-ink-faint">{suffix}</span>}
      </div>
    </div>
  )
}

export default function Calculators() {
  const { items: holdings } = useHoldings()
  const pf = portfolioTotals(holdings)

  const [sip, setSip] = useState({ monthly: 20000, years: 15, ret: 12 })
  const sipRes = sipFutureValue(sip.monthly, sip.years, sip.ret / 100)
  const sipSeries = Array.from({ length: sip.years }, (_, k) => {
    const y = k + 1
    const v = sipFutureValue(sip.monthly, y, sip.ret / 100)
    return { year: y, Invested: Math.round(v.invested), Value: Math.round(v.fv) }
  })

  const [ret, setRet] = useState({ currentAge: 30, retireAge: 50, monthlyExpenses: 50000, inflation: 6, expectedReturn: 12, monthlySIP: 20000, withdrawalRate: 4 })
  const rf = retirementForecast({
    currentAge: ret.currentAge, retireAge: ret.retireAge, monthlyExpenses: ret.monthlyExpenses,
    inflation: ret.inflation / 100, expectedReturn: ret.expectedReturn / 100, monthlySIP: ret.monthlySIP,
    currentPortfolio: pf.current, withdrawalRate: ret.withdrawalRate / 100,
  })
  const years = Math.max(0, ret.retireAge - ret.currentAge)
  const i = ret.expectedReturn / 100 / 12
  const retSeries = Array.from({ length: years + 1 }, (_, y) => {
    const fvCur = pf.current * Math.pow(1 + ret.expectedReturn / 100, y)
    const n = y * 12
    const fvSip = i === 0 ? ret.monthlySIP * n : ret.monthlySIP * ((Math.pow(1 + i, n) - 1) / i) * (1 + i)
    return { age: ret.currentAge + y, Portfolio: Math.round(fvCur + fvSip) }
  })

  return (
    <div className="space-y-4">
      <Card title="SIP calculator" icon={TrendingUp}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Monthly investment" value={sip.monthly} onChange={(n) => setSip({ ...sip, monthly: n })} suffix="₹" />
          <Field label="Duration" value={sip.years} onChange={(n) => setSip({ ...sip, years: n })} suffix="yr" />
          <Field label="Expected return" value={sip.ret} onChange={(n) => setSip({ ...sip, ret: n })} suffix="%" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Invested" value={inr(sipRes.invested, true)} />
          <Stat label="Gain" value={inr(sipRes.gain, true)} />
          <Stat label="Future value" value={inr(sipRes.fv, true)} />
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="99%" height="100%">
            <AreaChart data={sipSeries} margin={{ left: -6, right: 6, top: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}y`} />
              <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={yFmt} width={34} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v), true)} labelFormatter={(l) => `Year ${l}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area isAnimationActive={false} type="monotone" dataKey="Value" stroke="#1c4d8c" fill="#1c4d8c22" strokeWidth={2} />
              <Area isAnimationActive={false} type="monotone" dataKey="Invested" stroke="#9ca3af" fill="#9ca3af22" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Retirement / FIRE forecast" icon={Palmtree}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Current age" value={ret.currentAge} onChange={(n) => setRet({ ...ret, currentAge: n })} />
          <Field label="Retire at" value={ret.retireAge} onChange={(n) => setRet({ ...ret, retireAge: n })} />
          <Field label="Monthly expense" value={ret.monthlyExpenses} onChange={(n) => setRet({ ...ret, monthlyExpenses: n })} suffix="₹" />
          <Field label="Monthly SIP" value={ret.monthlySIP} onChange={(n) => setRet({ ...ret, monthlySIP: n })} suffix="₹" />
          <Field label="Inflation" value={ret.inflation} onChange={(n) => setRet({ ...ret, inflation: n })} suffix="%" />
          <Field label="Return" value={ret.expectedReturn} onChange={(n) => setRet({ ...ret, expectedReturn: n })} suffix="%" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="FIRE number" value={inr(rf.fireNumber, true)} />
          <Stat label="Projected" value={inr(rf.projected, true)} />
          <Stat label="Readiness" value={`${Math.round(rf.readiness * 100)}%`} />
          <Stat label="Lasts" value={`${rf.sustainability.toFixed(0)} yr`} sub="of expenses" />
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="99%" height="100%">
            <LineChart data={retSeries} margin={{ left: -6, right: 6, top: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="age" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={yFmt} width={34} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v), true)} labelFormatter={(l) => `Age ${l}`} />
              <ReferenceLine y={rf.fireNumber} stroke="#d97706" strokeDasharray="4 4" label={{ value: 'FIRE target', fill: '#d97706', fontSize: 10, position: 'insideTopRight' }} />
              <Line isAnimationActive={false} type="monotone" dataKey="Portfolio" stroke="#059669" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-ink-muted">Monthly passive income at retirement ≈ <b className="text-ink">{inr(rf.monthlyPassive, true)}</b> · the amber line is your FIRE target · current portfolio {inr(pf.current, true)} feeds in live.</p>
      </Card>
    </div>
  )
}
