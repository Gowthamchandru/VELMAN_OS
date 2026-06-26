// Realistic demo health data. Stands in until the Apple Watch ingest endpoint
// (Health Auto Export → local webhook) is wired in the sync phase. Shapes mirror
// the planned Health module entities so swapping live data in is mechanical.

export interface DayValue {
  day: string // Mon..Sun
  value: number
}

export const readiness = {
  score: 78,
  verdict: 'Good — push on strategic work today',
  band: 'green' as 'green' | 'amber' | 'red',
  contributors: [
    { label: 'Sleep', detail: '7h 12m', delta: +6 },
    { label: 'HRV', detail: '58 ms vs 52 baseline', delta: +9 },
    { label: 'Resting HR', detail: '54 bpm vs 56 baseline', delta: +4 },
    { label: 'Prior-day strain', detail: 'Moderate', delta: -2 },
  ],
}

export const sleepLastNight = {
  asleepMin: 432, // 7h 12m
  inBedMin: 468,
  stages: { deep: 78, rem: 102, core: 240, awake: 36 }, // minutes
}

export const sleep7d: DayValue[] = [
  { day: 'Mon', value: 6.8 },
  { day: 'Tue', value: 7.5 },
  { day: 'Wed', value: 6.2 },
  { day: 'Thu', value: 7.9 },
  { day: 'Fri', value: 7.2 },
  { day: 'Sat', value: 8.1 },
  { day: 'Sun', value: 7.2 },
]

export const activity = {
  move: { value: 540, goal: 650, unit: 'kcal' },
  exercise: { value: 38, goal: 30, unit: 'min' },
  stand: { value: 10, goal: 12, unit: 'hr' },
  steps: 9240,
  stepsGoal: 10000,
}

export const heart = {
  restingHr: 54,
  hrv: 58,
  hrv7d: [
    { day: 'Mon', value: 49 },
    { day: 'Tue', value: 53 },
    { day: 'Wed', value: 47 },
    { day: 'Thu', value: 55 },
    { day: 'Fri', value: 56 },
    { day: 'Sat', value: 61 },
    { day: 'Sun', value: 58 },
  ] as DayValue[],
  restingHr7d: [
    { day: 'Mon', value: 57 },
    { day: 'Tue', value: 55 },
    { day: 'Wed', value: 58 },
    { day: 'Thu', value: 55 },
    { day: 'Fri', value: 54 },
    { day: 'Sat', value: 53 },
    { day: 'Sun', value: 54 },
  ] as DayValue[],
}

// Asian-Indian BMI cut-offs: normal 18–22.9, overweight 23–24.9, obese ≥25.
export function bmiCategoryIndia(bmi: number): { label: string; band: 'green' | 'amber' | 'red' } {
  if (bmi < 18.5) return { label: 'Underweight', band: 'amber' }
  if (bmi < 23) return { label: 'Normal', band: 'green' }
  if (bmi < 25) return { label: 'Overweight (Asian-Indian)', band: 'amber' }
  return { label: 'Obese (Asian-Indian)', band: 'red' }
}

export const body = {
  heightM: 1.75,
  weightKg: 74.2,
  bodyFatPct: 19.8,
  waistCm: 86,
  goalWeightKg: 70,
  weight30d: [
    { day: 'W1', value: 76.1 },
    { day: 'W2', value: 75.4 },
    { day: 'W3', value: 74.9 },
    { day: 'W4', value: 74.2 },
  ] as DayValue[],
}
export const bmi = +(body.weightKg / (body.heightM * body.heightM)).toFixed(1)

// AHA categories.
export function bpCategory(sys: number, dia: number): { label: string; band: 'green' | 'amber' | 'red' } {
  if (sys < 120 && dia < 80) return { label: 'Normal', band: 'green' }
  if (sys < 130 && dia < 80) return { label: 'Elevated', band: 'amber' }
  if (sys < 140 || dia < 90) return { label: 'Stage 1', band: 'amber' }
  return { label: 'Stage 2', band: 'red' }
}
export const bp = { systolic: 124, diastolic: 79, pulse: 56 }

export const workouts = [
  { day: 'Mon', type: 'Walking', durationMin: 42, kcal: 210, avgHr: 108 },
  { day: 'Tue', type: 'Running', durationMin: 28, kcal: 320, avgHr: 148 },
  { day: 'Thu', type: 'Strength', durationMin: 45, kcal: 280, avgHr: 122 },
  { day: 'Sat', type: 'Running', durationMin: 35, kcal: 390, avgHr: 151 },
  { day: 'Sun', type: 'Yoga', durationMin: 30, kcal: 120, avgHr: 92 },
]

export const nutrition = {
  kcal: 1820,
  kcalTarget: 2200,
  protein: 96, // g
  carbs: 210,
  fat: 58,
  water: 6,
  waterTarget: 8,
}
