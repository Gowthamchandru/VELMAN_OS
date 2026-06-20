import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { HeartPulse, Moon, Activity, Flame, Scale, Dumbbell, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui'
import { Gauge, ActivityRings, BandPill, bandColor } from './HealthBits'
import {
  readiness,
  sleepLastNight,
  sleep7d,
  activity,
  heart,
  body,
  bmi,
  bmiCategoryIndia,
  bp,
  bpCategory,
  workouts,
  nutrition,
} from './healthDemo'

const fmtHm = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`

const chartAxis = { fill: 'var(--color-ink-faint)', fontSize: 11 }
const tooltipStyle = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--color-ink)',
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="text-xl font-semibold text-ink">{value}</div>
      {sub && <div className="text-xs text-ink-muted">{sub}</div>}
    </div>
  )
}

export default function Health() {
  const bmiCat = bmiCategoryIndia(bmi)
  const bpCat = bpCategory(bp.systolic, bp.diastolic)
  const stages = sleepLastNight.stages
  const totalStage = stages.deep + stages.rem + stages.core + stages.awake

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <HeartPulse size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Health</h1>
            <p className="text-sm text-ink-muted">Body, sleep &amp; recovery · this week</p>
          </div>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-ink-faint">
          demo data · Apple Watch sync pending
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Readiness" icon={Activity}>
          <div className="flex items-center gap-4">
            <Gauge pct={readiness.score} color={bandColor(readiness.band)} center={readiness.score} sub="/ 100" />
            <div className="min-w-0">
              <BandPill band={readiness.band}>{readiness.verdict.split('—')[0].trim()}</BandPill>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{readiness.verdict}</p>
            </div>
          </div>
        </Card>

        <Card title="Activity" icon={Flame}>
          <div className="flex items-center gap-4">
            <ActivityRings
              rings={[
                { pct: (activity.move.value / activity.move.goal) * 100, color: '#fb7185' },
                { pct: (activity.exercise.value / activity.exercise.goal) * 100, color: '#a3e635' },
                { pct: (activity.stand.value / activity.stand.goal) * 100, color: '#38bdf8' },
              ]}
            />
            <div className="space-y-1 text-xs">
              <div className="text-ink"><b>{activity.steps.toLocaleString('en-IN')}</b> steps</div>
              <div className="text-rose-600">{activity.move.value} / {activity.move.goal} kcal</div>
              <div className="text-lime-600">{activity.exercise.value} / {activity.exercise.goal} min</div>
              <div className="text-sky-600">{activity.stand.value} / {activity.stand.goal} hr</div>
            </div>
          </div>
        </Card>

        <Card title="Sleep last night" icon={Moon}>
          <div className="text-2xl font-semibold text-ink">{fmtHm(sleepLastNight.asleepMin)}</div>
          <div className="text-xs text-ink-muted">in bed {fmtHm(sleepLastNight.inBedMin)}</div>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full">
            <span style={{ width: `${(stages.deep / totalStage) * 100}%`, background: '#6366f1' }} title="Deep" />
            <span style={{ width: `${(stages.rem / totalStage) * 100}%`, background: '#22d3ee' }} title="REM" />
            <span style={{ width: `${(stages.core / totalStage) * 100}%`, background: '#60a5fa' }} title="Core" />
            <span style={{ width: `${(stages.awake / totalStage) * 100}%`, background: 'var(--color-ink-faint)' }} title="Awake" />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-faint">
            <span>Deep {stages.deep}m</span>
            <span>REM {stages.rem}m</span>
            <span>Core {stages.core}m</span>
            <span>Awake {stages.awake}m</span>
          </div>
        </Card>

        <Card title="Heart" icon={HeartPulse}>
          <div className="flex gap-6">
            <Metric label="Resting HR" value={`${heart.restingHr}`} sub="bpm" />
            <Metric label="HRV" value={`${heart.hrv}`} sub="ms" />
          </div>
          <div className="mt-3 h-12">
            <ResponsiveContainer width="99%" height="100%">
              <LineChart data={heart.hrv7d}>
                <Line isAnimationActive={false} type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Sleep · 7 days" icon={Moon} className="lg:col-span-2">
          <div className="h-48">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={sleep7d}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tick={chartAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxis} axisLine={false} tickLine={false} domain={[0, 9]} width={24} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-surface-2)' }} formatter={(v) => [`${v} h`, 'Sleep']} />
                <Bar isAnimationActive={false} dataKey="value" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Body" icon={Scale}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-ink">{body.weightKg}</span>
            <span className="text-sm text-ink-muted">kg</span>
            <span className="ml-auto text-sm text-ink-muted">BMI {bmi}</span>
          </div>
          <div className="mt-1"><BandPill band={bmiCat.band}>{bmiCat.label}</BandPill></div>
          <div className="my-3 h-12">
            <ResponsiveContainer width="99%" height="100%">
              <LineChart data={body.weight30d}>
                <Line isAnimationActive={false} type="monotone" dataKey="value" stroke="#d97706" strokeWidth={2} dot={{ r: 2 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} kg`, 'Weight']} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="text-ink-muted">Blood pressure</span>
            <span className="flex items-center gap-2 text-ink">
              {bp.systolic}/{bp.diastolic} <BandPill band={bpCat.band}>{bpCat.label}</BandPill>
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-ink-muted">Goal weight</span>
            <span className="text-ink">{body.goalWeightKg} kg · {(body.weightKg - body.goalWeightKg).toFixed(1)} to go</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Workouts · this week" icon={Dumbbell} className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="pb-2 font-medium">Day</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 text-right font-medium">Duration</th>
                <th className="pb-2 text-right font-medium">kcal</th>
                <th className="pb-2 text-right font-medium">Avg HR</th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((w, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2 text-ink-muted">{w.day}</td>
                  <td className="py-2 text-ink">{w.type}</td>
                  <td className="py-2 text-right tabular-nums text-ink-muted">{w.durationMin}m</td>
                  <td className="py-2 text-right tabular-nums text-ink-muted">{w.kcal}</td>
                  <td className="py-2 text-right tabular-nums text-ink-muted">{w.avgHr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Nutrition · today" icon={Flame}>
          <div className="flex items-center gap-4">
            <Gauge
              pct={(nutrition.kcal / nutrition.kcalTarget) * 100}
              color="#fb923c"
              center={nutrition.kcal}
              sub={`/ ${nutrition.kcalTarget}`}
            />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-4"><span className="text-ink-muted">Protein</span><span className="text-ink">{nutrition.protein} g</span></div>
              <div className="flex justify-between gap-4"><span className="text-ink-muted">Carbs</span><span className="text-ink">{nutrition.carbs} g</span></div>
              <div className="flex justify-between gap-4"><span className="text-ink-muted">Fat</span><span className="text-ink">{nutrition.fat} g</span></div>
              <div className="flex justify-between gap-4"><span className="text-ink-muted">Water</span><span className="text-ink">{nutrition.water}/{nutrition.waterTarget}</span></div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Health ↔ productivity" icon={TrendingUp}>
        <p className="text-sm leading-relaxed text-ink-muted">
          Once a few weeks of data accrue, this links recovery to output — e.g.{' '}
          <span className="text-ink">“nights with 7h+ sleep → 78% of your MITs done, vs 41% on short nights.”</span>{' '}
          The correlation engine activates after the Apple Watch ingest and the task data both flow.
        </p>
      </Card>
    </div>
  )
}

// Command Center widget: live readiness score from (demo) health data.
export function HealthWidget() {
  return (
    <div className="flex items-center gap-4">
      <Gauge pct={readiness.score} color={bandColor(readiness.band)} size={72} stroke={8} center={readiness.score} />
      <div>
        <BandPill band={readiness.band}>Readiness</BandPill>
        <p className="mt-1.5 text-xs text-ink-muted">{readiness.verdict}</p>
      </div>
    </div>
  )
}
