// Flight booking agent — client side. POSTs the natural-language request to the
// local server, which runs a Claude AGENT (on the user's Pro subscription) with
// live web search. The server streams Server-Sent Events: `step` (what the
// agent is doing right now), then `done` (structured results) or `error`.
// RESEARCH ONLY — payment always happens manually on the booking site.
import { SERVER } from '@/lib/server'

export interface ParsedTrip {
  from: string
  fromCode: string
  to: string
  toCode: string
  departDate: string
  returnDate: string | null
  cabin: string
  passengers: number
}

export interface FlightOption {
  airline: string
  flightNo: string
  depart: string
  arrive: string
  duration: string
  stops: number
  cabin: string
  priceINR: number | null
  approx?: boolean
  site: string
  bookUrl?: string
  notes?: string
}

export interface FlightCoupon {
  site: string
  code: string
  detail: string
}

export interface FlightResults {
  parsed: ParsedTrip
  options: FlightOption[]
  coupons: FlightCoupon[]
  advice?: string
  asOf?: string
  // 'live' = fares from the Amadeus feed (accurate at search time);
  // 'research' = agent-researched from the web (indicative).
  source?: 'live' | 'research'
}

export interface PriorSearch {
  request: string
  parsed: ParsedTrip
}

// "4h 15m" → minutes, for sorting. Unparseable durations sort last.
export function durationMinutes(d: string | undefined): number {
  if (!d) return Number.MAX_SAFE_INTEGER
  const h = /(\d+)\s*h/.exec(d)
  const m = /(\d+)\s*m/.exec(d)
  if (!h && !m) return Number.MAX_SAFE_INTEGER
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0)
}

export const inrFmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

// Google Flights pinned to THIS flight number + date — lands on the same
// flight with its LIVE price, so what the user sees there matches what they
// clicked (dashboard prices are estimates; fares reprice continuously).
export function exactFlightUrl(o: FlightOption, p: ParsedTrip): string {
  const firstNo = o.flightNo.split('+')[0].trim()
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(`${o.airline} ${firstNo} from ${p.fromCode} to ${p.toCode} on ${p.departDate}`)}`
}

// Reliable fallback deep links built from the parsed trip (agent bookUrls can
// occasionally 404 — these always work).
export function quickLinks(p: ParsedTrip): { label: string; url: string }[] {
  const cabin = p.cabin && p.cabin !== 'Economy' ? ` ${p.cabin.toLowerCase()}` : ''
  const gf = `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${p.fromCode} to ${p.toCode} on ${p.departDate}${cabin}`)}`
  const yymmdd = p.departDate?.slice(2).replaceAll('-', '') ?? ''
  const sky = `https://www.skyscanner.co.in/transport/flights/${p.fromCode?.toLowerCase()}/${p.toCode?.toLowerCase()}/${yymmdd}/`
  return [
    { label: 'Google Flights', url: gf },
    { label: 'Skyscanner', url: sky },
  ]
}

export async function searchFlights(
  request: string,
  prior: PriorSearch | null,
  onStep: (label: string) => void,
): Promise<FlightResults> {
  let res: Response
  try {
    res = await fetch(`${SERVER}/api/flights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request, prior }),
    })
  } catch {
    throw new Error(`Can't reach the assistant server at ${SERVER}. Start it with "npm run dev:all".`)
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `Server error (${res.status}).`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done: FlightResults | null = null
  let error: string | null = null

  while (true) {
    const { value, done: eof } = await reader.read()
    if (eof) break
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      try {
        const ev = JSON.parse(line.slice(6))
        if (ev.t === 'step') onStep(String(ev.label ?? ''))
        else if (ev.t === 'done') done = ev.data as FlightResults
        else if (ev.t === 'error') error = String(ev.message ?? 'Flight search failed.')
      } catch {
        /* skip malformed frame */
      }
    }
  }

  if (error) throw new Error(error)
  if (!done || !Array.isArray(done.options)) throw new Error('The agent stream ended without results — try again.')
  return done
}
