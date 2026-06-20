// Demo founder-cockpit data. Company-agnostic placeholders until real KPIs,
// people, and verticals are entered. RAG = red/amber/green health.

export type RAG = 'green' | 'amber' | 'red'

export const northStar = {
  label: 'Monthly recurring revenue',
  value: '₹42.6 L',
  delta: +8.4,
  target: '₹50 L',
}

export const kpis = [
  { label: 'New customers', value: '128', delta: +12, band: 'green' as RAG },
  { label: 'Churn', value: '3.1%', delta: +0.4, band: 'amber' as RAG },
  { label: 'Cash runway', value: '4.8 mo', delta: -0.3, band: 'amber' as RAG },
  { label: 'NPS', value: '61', delta: +5, band: 'green' as RAG },
]

export interface Vertical {
  name: string
  owner: string
  band: RAG
  progress: number
  kpi: string
  note: string
}
export const verticals: Vertical[] = [
  { name: 'Core product', owner: 'Aarav', band: 'green', progress: 72, kpi: 'Activation 54%', note: 'On track for Q3 milestone' },
  { name: 'Enterprise sales', owner: 'Meera', band: 'amber', progress: 48, kpi: '3 / 6 deals', note: 'Two deals slipped a week' },
  { name: 'Marketing', owner: 'Kabir', band: 'green', progress: 65, kpi: 'CAC ₹1,850', note: 'Paid channel improving' },
  { name: 'Operations', owner: 'Diya', band: 'red', progress: 30, kpi: 'SLA 88%', note: 'Support backlog — needs you' },
]

export interface Delegated {
  task: string
  owner: string
  due: string
  status: 'on-track' | 'waiting' | 'overdue'
}
export const delegated: Delegated[] = [
  { task: 'Finalise Q3 hiring plan', owner: 'Meera', due: '3 Jul', status: 'on-track' },
  { task: 'Vendor contract review', owner: 'Legal', due: '28 Jun', status: 'overdue' },
  { task: 'New pricing page copy', owner: 'Kabir', due: '5 Jul', status: 'waiting' },
  { task: 'Investor update draft', owner: 'Aarav', due: '1 Jul', status: 'on-track' },
  { task: 'Support backlog plan', owner: 'Diya', due: '27 Jun', status: 'overdue' },
]

export const capacity = [
  { person: 'Aarav', role: 'Product', load: 85 },
  { person: 'Meera', role: 'Sales', load: 110 },
  { person: 'Kabir', role: 'Marketing', load: 70 },
  { person: 'Diya', role: 'Ops', load: 120 },
  { person: 'Rohan', role: 'Eng', load: 60 },
]

export const priorities = [
  { text: 'Close 2 enterprise deals', done: false },
  { text: 'Unblock the ops support backlog', done: false },
  { text: 'Ship pricing v2', done: true },
  { text: 'Send investor update', done: false },
]

export interface Initiative {
  name: string
  quarter: string
  pace: 'ahead' | 'on' | 'behind'
  progress: number
}
export const roadmap: Initiative[] = [
  { name: 'Self-serve onboarding', quarter: 'Q3', pace: 'on', progress: 60 },
  { name: 'Enterprise tier launch', quarter: 'Q3', pace: 'behind', progress: 35 },
  { name: 'South India expansion', quarter: 'Q4', pace: 'ahead', progress: 20 },
]

export const expansion = {
  scenario: 'Open Bengaluru office + 3 hires',
  monthlyCost: 680000, // ₹6.8 L/mo loaded
  newRunwayMonths: 3.6,
  breakEvenMonths: 9,
}
