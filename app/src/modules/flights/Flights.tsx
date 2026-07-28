// Flight Booking — an AGENT-driven module. The user asks in natural language
// ("book a ticket from Chennai to Dubai on 21 July, business class"); a Claude
// agent on the LOCAL server (user's Pro subscription — no API keys) live-searches
// booking sites + coupon codes and returns structured options. Booking ends at a
// MANUAL payment gate: we hand the user to the booking site — the agent never pays.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plane, Mic, Square, ArrowRight, Ticket, BadgePercent, ExternalLink,
  ShieldCheck, Loader2, Sparkles, Clock, Server, Copy, Check, X,
  Hotel as HotelIcon, UtensilsCrossed, MapPin, Star,
} from 'lucide-react'
import { Card, Empty, Pill } from '@/components/ui'
import { useCollection, uid, useEphemeral } from '@/lib/store'
import { useServerHealth } from '@/lib/ai'
import { useSpeechInput } from '@/lib/speech'
import {
  searchFlights, searchBookings, quickLinks, exactFlightUrl, durationMinutes, inrFmt,
  type FlightResults, type FlightOption, type FlightCoupon, type ParsedTrip, type PriorSearch,
  type BookingKind, type BookingResults, type StayOption, type DineOption, type PriorBooking,
} from './flightsApi'

const EXAMPLES = [
  'Book a ticket from Chennai to Dubai on 21 July, business class',
  'Cheapest Mumbai to Singapore flight next Friday',
  'Delhi to London return, 10–20 August, 2 passengers',
]

interface RecentSearch { id: string; text: string; at: number }

type SortKey = 'price' | 'duration' | 'depart'

const couponFor = (coupons: FlightCoupon[], site: string) => {
  const s = site.toLowerCase()
  return coupons.find((c) => { const cs = c.site.toLowerCase(); return cs.includes(s) || s.includes(cs) })
}

function OfflineCard() {
  return (
    <Card title="AGENT OFFLINE" icon={Server}>
      <p className="text-sm text-ink-muted">
        The booking agent runs on your local server (your <b className="text-ink">Claude</b> subscription — no API keys).
        Start it with <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">npm run dev:all</code> — this page connects automatically.
      </p>
    </Card>
  )
}

// Live log of what the agent is doing right now (streamed from the server).
function AgentActivity({ steps, elapsed }: { steps: string[]; elapsed: number }) {
  const shown = steps.slice(-8)
  return (
    <Card title="AGENT ACTIVITY" icon={Sparkles} action={<span className="font-mono text-[11px] tabular-nums text-ink-faint">{elapsed}s</span>}>
      <div className="space-y-2">
        {steps.length > 8 && <div className="text-[11px] text-ink-faint">…{steps.length - 8} earlier steps</div>}
        {shown.map((s, i) => {
          const last = i === shown.length - 1
          return (
            <div key={`${i}-${s}`} className="flex items-center gap-2.5 text-sm">
              <span className={`size-1.5 shrink-0 rounded-full ${last ? 'gc-dot bg-accent' : 'bg-online'}`} />
              <span className={last ? 'text-ink' : 'text-ink-faint'}>{s}</span>
            </div>
          )
        })}
        <p className="pt-1 text-[11px] text-ink-faint">Searching booking sites live over your Claude plan — this can take a minute or two.</p>
      </div>
    </Card>
  )
}

function CouponChip({ coupon }: { coupon: FlightCoupon }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(coupon.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }
  return (
    <div className="flex items-start gap-2.5 rounded-xl border-2 border-dashed border-brand-border bg-accent-soft/50 px-3 py-2.5">
      <BadgePercent size={15} className="mt-0.5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1 text-xs text-ink-muted">
        <span className="font-semibold text-ink">{coupon.site}</span> · <code className="rounded bg-surface px-1.5 py-0.5 font-mono font-semibold text-accent">{coupon.code}</code>
        <div className="mt-0.5 leading-relaxed">{coupon.detail}</div>
      </div>
      <button onClick={copy} title="Copy code" className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-surface hover:text-accent">
        {copied ? <Check size={14} className="text-online" /> : <Copy size={14} />}
      </button>
    </div>
  )
}

function OptionCard({ o, parsed, coupon, onBook }: { o: FlightOption; parsed: ParsedTrip; coupon?: FlightCoupon; onBook: () => void }) {
  return (
    <div className="rounded-xl border-2 border-border bg-surface p-3.5 transition-colors hover:border-brand-border">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink">
            {o.airline} <span className="ml-1 font-mono text-[11px] font-medium text-ink-faint">{o.flightNo}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm tabular-nums text-ink">
            <b>{o.depart}</b>
            <span className="text-[11px] text-ink-faint">{parsed.fromCode}</span>
            <span className="text-[11px] text-ink-faint">— {o.duration} · {o.stops === 0 ? 'non-stop' : `${o.stops} stop${o.stops > 1 ? 's' : ''}`} →</span>
            <b>{o.arrive}</b>
            <span className="text-[11px] text-ink-faint">{parsed.toCode}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill>{o.cabin}</Pill>
            <Pill color="#1c4d8c">{o.site}</Pill>
            {o.notes && <span className="text-[11px] text-ink-faint">{o.notes}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-lg font-semibold tabular-nums text-ink">
            {o.priceINR != null ? `${o.approx ? '~' : ''}${inrFmt(o.priceINR)}` : 'see site'}
          </div>
          {o.priceINR != null && (o.approx
            ? <div className="text-[10px] text-ink-faint">indicative</div>
            : <div className="text-[10px] font-semibold text-online">live fare</div>)}
          <button
            onClick={onBook}
            className="mt-2 inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Book <ExternalLink size={12} />
          </button>
        </div>
      </div>
      {coupon && (
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-dashed border-border pt-2 text-[11px] text-ink-muted">
          <BadgePercent size={12} className="shrink-0 text-accent" />
          Coupon for {coupon.site}: <code className="font-mono font-semibold text-accent">{coupon.code}</code> — {coupon.detail}
        </div>
      )}
    </div>
  )
}

// The payment point. Always MANUAL: we open the booking site; the user reviews
// the live fare and pays there. The agent never touches payment.
function PaymentGate({ option, parsed, coupon, onClose }: { option: FlightOption; parsed: ParsedTrip; coupon?: FlightCoupon; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prefer landing on the EXACT flight with its live price (Google Flights
  // pinned to flight number + date) so the site matches what was clicked.
  const exact = exactFlightUrl(option, parsed)
  const url = option.bookUrl || exact
  const destination = option.bookUrl ? option.site : 'Google Flights'
  const proceed = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm gc-fade-in" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl border-2 border-border bg-surface p-5 shadow-2xl gc-msg-in" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><ShieldCheck size={18} /></div>
          <div className="flex-1">
            <h3 className="text-[12px]">Manual payment</h3>
            <div className="text-[11px] text-ink-faint">The agent never pays automatically</div>
          </div>
          <button onClick={onClose} aria-label="close" className="grid size-7 place-items-center rounded-lg text-ink-faint hover:bg-surface-2 hover:text-ink"><X size={16} /></button>
        </div>

        <div className="mt-4 rounded-xl border-2 border-border bg-surface-2/50 p-3 text-sm text-ink">
          <div className="font-bold">{option.airline} <span className="font-mono text-[11px] font-medium text-ink-faint">{option.flightNo}</span></div>
          <div className="mt-1 font-mono text-sm tabular-nums">
            {option.depart} {parsed.fromCode} → {option.arrive} {parsed.toCode}
          </div>
          <div className="mt-1 text-xs text-ink-muted">{parsed.departDate} · {option.cabin} · {parsed.passengers} pax</div>
          <div className="mt-2 font-mono text-lg font-semibold tabular-nums">
            {option.priceINR != null ? `${option.approx ? '~' : ''}${inrFmt(option.priceINR)}` : 'fare on site'}
            {option.priceINR != null && (
              <span className="ml-1.5 text-[10px] font-medium text-ink-faint">
                {option.approx ? 'indicative — fares reprice by the minute; the site shows the live fare' : 'live fare at search time — confirm on site'}
              </span>
            )}
          </div>
        </div>

        {coupon && <div className="mt-3"><CouponChip coupon={coupon} /></div>}

        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          You'll continue to <b className="text-ink">{destination}</b> to review the live fare and complete payment <b className="text-ink">yourself</b>. The agent researches only — it never enters card details or confirms a booking.
        </p>
        {option.bookUrl && (
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Landed somewhere generic? Open this exact flight live:{' '}
            <a href={exact} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">Google Flights ↗</a>
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[10px] border-2 border-border px-3.5 py-2 text-sm font-semibold text-ink-muted hover:border-brand-border hover:text-ink">Cancel</button>
          <button onClick={proceed} className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90">
            Continue to {destination} <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Stable initial for useEphemeral (a fresh [] per render would break
// useSyncExternalStore's snapshot caching).
const NO_STEPS: string[] = []

function FlightAgent() {
  const health = useServerHealth()
  // Search state lives in the module-level ephemeral store, NOT component
  // state: navigating to another pillar and back keeps the results, and an
  // in-flight search keeps streaming into the store even while unmounted.
  const [request, setRequest] = useEphemeral('gcos.flights.request', '')
  const [phase, setPhase] = useEphemeral<'idle' | 'searching' | 'results'>('gcos.flights.phase', 'idle')
  const [steps, setSteps] = useEphemeral<string[]>('gcos.flights.steps', NO_STEPS)
  const [startedAt, setStartedAt] = useEphemeral('gcos.flights.startedAt', 0)
  const [results, setResults] = useEphemeral<FlightResults | null>('gcos.flights.results', null)
  const [error, setError] = useEphemeral('gcos.flights.error', '')
  const [prior, setPrior] = useEphemeral<PriorSearch | null>('gcos.flights.prior', null)
  const [elapsed, setElapsed] = useState(0)
  const [sort, setSort] = useState<SortKey>('price')
  const [nonstopOnly, setNonstopOnly] = useState(false)
  const [paying, setPaying] = useState<FlightOption | null>(null)
  const recent = useCollection<RecentSearch>('gcos.flights.recent.v1')
  const inputRef = useRef<HTMLInputElement>(null)
  const speech = useSpeechInput({ getBase: () => request, onText: setRequest, onError: setError })
  const ready = health.online

  // Elapsed-seconds ticker while the agent works — anchored to the search's
  // start time so it stays correct after navigating away and back.
  useEffect(() => {
    if (phase !== 'searching') return
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - startedAt) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, startedAt])

  const search = async (text: string) => {
    const q = text.trim()
    if (!q || phase === 'searching' || !ready) return
    speech.abort()
    setError('')
    setRequest(q)
    setSteps(NO_STEPS)
    setStartedAt(Date.now())
    setPhase('searching')
    // Steps accumulate in a local array (the ephemeral setter takes a value,
    // not an updater) — and keep flowing to the store even if unmounted.
    const stepLog: string[] = []
    try {
      const r = await searchFlights(q, prior, (label) => { stepLog.push(label); setSteps([...stepLog]) })
      setPrior({ request: q, parsed: r.parsed })
      setResults(r)
      setPhase('results')
      // Remember the search (dedupe by text, keep the latest 6).
      const dupe = recent.items.find((s) => s.text === q)
      if (dupe) recent.remove(dupe.id)
      else if (recent.items.length >= 6) {
        const oldest = [...recent.items].sort((a, b) => a.at - b.at)[0]
        if (oldest) recent.remove(oldest.id)
      }
      recent.add({ id: uid(), text: q, at: Date.now() })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Flight search failed — try again.')
      setPhase(results ? 'results' : 'idle')
    }
  }

  const toggleMic = () => {
    if (!speech.listening) setError('')
    speech.toggle()
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const visibleOptions = useMemo(() => {
    const arr = (results?.options ?? []).filter((o) => !nonstopOnly || o.stops === 0)
    const byPrice = (a: FlightOption, b: FlightOption) =>
      (a.priceINR ?? Number.MAX_SAFE_INTEGER) - (b.priceINR ?? Number.MAX_SAFE_INTEGER)
    if (sort === 'price') return [...arr].sort(byPrice)
    if (sort === 'duration') return [...arr].sort((a, b) => durationMinutes(a.duration) - durationMinutes(b.duration))
    return [...arr].sort((a, b) => a.depart.localeCompare(b.depart))
  }, [results, sort, nonstopOnly])

  const payingCoupon = paying && results ? couponFor(results.coupons ?? [], paying.site) : undefined

  return (
    <div className="space-y-4">
      {/* Composer — talk to the booking agent */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-[#2f6fbf] text-white shadow-sm"><Plane size={19} /></div>
          <div className="min-w-0 flex-1 leading-tight">
            <h3 className="text-[12px]">Flight booking agent</h3>
          </div>
        </div>

        {ready ? (
          <>
            <div className={`mt-4 flex items-end gap-1.5 rounded-2xl border-2 p-1.5 transition-all ${speech.listening ? 'border-danger/60 brand-glow' : 'border-border focus-within:border-accent focus-within:brand-glow'}`}>
              {speech.supported && (
                <button
                  onClick={toggleMic}
                  disabled={phase === 'searching'}
                  aria-label={speech.listening ? 'Stop voice input' : 'Start voice input'}
                  className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors disabled:opacity-40 ${speech.listening ? 'animate-pulse bg-danger/10 text-danger' : 'text-ink-faint hover:bg-surface-2 hover:text-accent'}`}
                >
                  {speech.listening ? <Square size={15} className="fill-current" /> : <Mic size={17} />}
                </button>
              )}
              <input
                ref={inputRef}
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search(request)}
                placeholder={speech.listening ? 'Listening… speak your trip' : 'e.g. "Book a ticket from Chennai to Dubai on 21 July, business class"'}
                disabled={phase === 'searching'}
                className="min-w-0 flex-1 self-center bg-transparent px-1.5 py-2 text-sm text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
              />
              <button
                onClick={() => search(request)}
                disabled={phase === 'searching' || !request.trim()}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-faint disabled:shadow-none"
              >
                {phase === 'searching' ? <Loader2 size={15} className="animate-spin" /> : <>Search <ArrowRight size={14} /></>}
              </button>
            </div>

            {phase === 'idle' && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => search(ex)} className="rounded-[10px] border-2 border-border px-2.5 py-1.5 text-xs text-ink-muted hover:border-brand-border hover:text-ink">
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {recent.items.length > 0 && phase !== 'searching' && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Clock size={12} className="text-ink-faint" />
                {[...recent.items].sort((a, b) => b.at - a.at).slice(0, 4).map((r) => (
                  <button key={r.id} onClick={() => search(r.text)} title={r.text} className="max-w-[240px] truncate rounded-[10px] bg-surface-2 px-2.5 py-1 text-[11px] text-ink-muted hover:text-ink">
                    {r.text}
                  </button>
                ))}
              </div>
            )}

          </>
        ) : !health.checking ? (
          <div className="mt-4"><OfflineCard /></div>
        ) : null}
      </Card>

      {error && <div className="rounded-xl border-2 border-danger/40 bg-danger/5 px-3 py-2.5 text-xs font-medium text-danger">{error}</div>}

      {phase === 'searching' && <AgentActivity steps={steps} elapsed={elapsed} />}

      {phase === 'results' && results && (
        <>
          {/* The agent's understanding of the trip */}
          <Card
            title="ROUTE"
            icon={Plane}
            action={
              <span className="flex items-center gap-2">
                {results.source === 'live' && <Pill color="#059669">LIVE FARES</Pill>}
                {results.asOf && <span className="text-[11px] text-ink-faint">{results.asOf}</span>}
              </span>
            }
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="font-mono text-lg font-semibold tabular-nums text-ink">
                {results.parsed.fromCode} <span className="text-ink-faint">→</span> {results.parsed.toCode}
              </div>
              <div className="text-sm text-ink-muted">{results.parsed.from} to {results.parsed.to}</div>
              <div className="flex flex-wrap gap-1.5">
                <Pill>{results.parsed.departDate}{results.parsed.returnDate ? ` – ${results.parsed.returnDate}` : ''}</Pill>
                <Pill>{results.parsed.cabin}</Pill>
                <Pill>{results.parsed.passengers} pax</Pill>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">Not right? Just ask again — e.g. "make it business class" or "only non-stop".</p>
          </Card>

          {/* Options */}
          <Card
            title={`OPTIONS · ${visibleOptions.length}`}
            icon={Ticket}
            action={
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
                  <input type="checkbox" checked={nonstopOnly} onChange={(e) => setNonstopOnly(e.target.checked)} className="accent-[#1c4d8c]" />
                  Non-stop
                </label>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-[8px] border-2 border-border bg-surface px-1.5 py-1 text-[11px] font-semibold text-ink-muted outline-none focus:border-accent">
                  <option value="price">Price</option>
                  <option value="duration">Duration</option>
                  <option value="depart">Departure</option>
                </select>
              </div>
            }
          >
            {visibleOptions.length === 0 ? (
              <Empty>No options matched — try relaxing the filters or rephrasing the request.</Empty>
            ) : (
              <div className="space-y-2.5">
                {visibleOptions.map((o, i) => (
                  <OptionCard key={`${o.flightNo}-${o.site}-${i}`} o={o} parsed={results.parsed} coupon={couponFor(results.coupons ?? [], o.site)} onBook={() => setPaying(o)} />
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-ink-faint">
              Verify live fares:
              {quickLinks(results.parsed).map((l) => (
                <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-[8px] border border-border px-2 py-1 font-semibold text-ink-muted hover:border-brand-border hover:text-accent">
                  {l.label} <ExternalLink size={10} />
                </a>
              ))}
              <span className="ml-auto">
                {results.source === 'live'
                  ? 'Live fares at search time — the booking site confirms the final price.'
                  : 'Web-researched estimates — for exact live fares, add free Amadeus keys (see .env.example).'}
              </span>
            </div>
          </Card>

          {/* Coupons */}
          {(results.coupons?.length ?? 0) > 0 && (
            <Card title="COUPONS & OFFERS" icon={BadgePercent}>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {results.coupons.map((c, i) => <CouponChip key={`${c.site}-${c.code}-${i}`} coupon={c} />)}
              </div>
            </Card>
          )}

          {/* The agent's recommendation */}
          {results.advice && (
            <Card title="AGENT'S TAKE" icon={Sparkles}>
              <p className="text-sm leading-relaxed text-ink-muted">{results.advice}</p>
            </Card>
          )}
        </>
      )}

      {paying && results && <PaymentGate option={paying} parsed={results.parsed} coupon={payingCoupon} onClose={() => setPaying(null)} />}
    </div>
  )
}

// ─── Hotel & restaurant agents (generic research flow) ───────────────────────

const KIND_META = {
  hotel: {
    icon: HotelIcon,
    title: 'Hotel booking agent',
    placeholder: 'e.g. "Hotel in Dubai Marina, 21–24 July, 2 adults, under ₹15k a night"',
    examples: [
      'Hotel in Dubai Marina, 21–24 July, 2 adults, under ₹15k a night',
      '5-star stay in Goa this weekend for 2',
      'Business hotel near BKC Mumbai next Tuesday, 1 night',
    ],
  },
  restaurant: {
    icon: UtensilsCrossed,
    title: 'Restaurant agent',
    placeholder: 'e.g. "Rooftop dinner for 4 in Chennai tomorrow night"',
    examples: [
      'Rooftop dinner for 4 in Chennai tomorrow night',
      'Best biryani places in Hyderabad tonight',
      'Anniversary fine dining in Mumbai this Saturday, vegetarian',
    ],
  },
} as const

// One suggestion row for either kind — hotels show ₹/night, dining ₹ for two.
function SuggestionRow({ kind, o, city }: { kind: BookingKind; o: StayOption | DineOption; city: string }) {
  const price =
    kind === 'hotel'
      ? (o as StayOption).priceINR != null
        ? `${(o as StayOption).approx ? '~' : ''}${inrFmt((o as StayOption).priceINR as number)}/night`
        : 'see site'
      : (o as DineOption).priceForTwoINR != null
        ? `${inrFmt((o as DineOption).priceForTwoINR as number)} for two`
        : ''
  const meta = [kind === 'restaurant' ? (o as DineOption).cuisine : null, o.area].filter(Boolean).join(' · ')
  const url = o.bookUrl || `https://www.google.com/search?q=${encodeURIComponent(`${o.name} ${city} ${kind === 'hotel' ? 'booking' : ''}`.trim())}`
  return (
    <div className="rounded-xl border-2 border-border bg-surface p-3.5 transition-colors hover:border-brand-border">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink">{o.name}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            {o.rating && (
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <Star size={12} className="fill-current text-warn" /> {o.rating}
              </span>
            )}
            {meta && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} className="text-ink-faint" /> {meta}
              </span>
            )}
            <Pill color="#1c4d8c">{o.site}</Pill>
          </div>
          {o.notes && <div className="mt-1.5 text-[11px] text-ink-faint">{o.notes}</div>}
        </div>
        <div className="shrink-0 text-right">
          {price && <div className="font-mono text-sm font-semibold tabular-nums text-ink">{price}</div>}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            View <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}

function BookingAgent({ kind }: { kind: BookingKind }) {
  const meta = KIND_META[kind]
  const health = useServerHealth()
  const [request, setRequest] = useEphemeral(`gcos.book.${kind}.request`, '')
  const [phase, setPhase] = useEphemeral<'idle' | 'searching' | 'results'>(`gcos.book.${kind}.phase`, 'idle')
  const [steps, setSteps] = useEphemeral<string[]>(`gcos.book.${kind}.steps`, NO_STEPS)
  const [startedAt, setStartedAt] = useEphemeral(`gcos.book.${kind}.startedAt`, 0)
  const [results, setResults] = useEphemeral<BookingResults<StayOption | DineOption> | null>(`gcos.book.${kind}.results`, null)
  const [error, setError] = useEphemeral(`gcos.book.${kind}.error`, '')
  const [prior, setPrior] = useEphemeral<PriorBooking | null>(`gcos.book.${kind}.prior`, null)
  const [elapsed, setElapsed] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const speech = useSpeechInput({ getBase: () => request, onText: setRequest, onError: setError })
  const ready = health.online

  useEffect(() => {
    if (phase !== 'searching') return
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - startedAt) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, startedAt])

  const search = async (text: string) => {
    const q = text.trim()
    if (!q || phase === 'searching' || !ready) return
    speech.abort()
    setError('')
    setRequest(q)
    setSteps(NO_STEPS)
    setStartedAt(Date.now())
    setPhase('searching')
    const stepLog: string[] = []
    try {
      const r = await searchBookings<StayOption | DineOption>(kind, q, prior, (label) => {
        stepLog.push(label)
        setSteps([...stepLog])
      })
      setPrior({ request: q, parsed: r.parsed })
      setResults(r)
      setPhase('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed — try again.')
      setPhase(results ? 'results' : 'idle')
    }
  }

  const toggleMic = () => {
    if (!speech.listening) setError('')
    speech.toggle()
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const city = String(results?.parsed?.city ?? '')
  const parsedPills = Object.entries(results?.parsed ?? {})
    .filter(([, v]) => v !== null && v !== '' && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-[#2f6fbf] text-white shadow-sm">
            <meta.icon size={19} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <h3 className="text-[12px]">{meta.title}</h3>
          </div>
        </div>

        {ready ? (
          <>
            <div className={`mt-4 flex items-end gap-1.5 rounded-2xl border-2 p-1.5 transition-all ${speech.listening ? 'border-danger/60 brand-glow' : 'border-border focus-within:border-accent focus-within:brand-glow'}`}>
              {speech.supported && (
                <button
                  onClick={toggleMic}
                  disabled={phase === 'searching'}
                  aria-label={speech.listening ? 'Stop voice input' : 'Start voice input'}
                  className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors disabled:opacity-40 ${speech.listening ? 'animate-pulse bg-danger/10 text-danger' : 'text-ink-faint hover:bg-surface-2 hover:text-accent'}`}
                >
                  {speech.listening ? <Square size={15} className="fill-current" /> : <Mic size={17} />}
                </button>
              )}
              <input
                ref={inputRef}
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search(request)}
                placeholder={speech.listening ? 'Listening…' : meta.placeholder}
                disabled={phase === 'searching'}
                className="min-w-0 flex-1 self-center bg-transparent px-1.5 py-2 text-sm text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
              />
              <button
                onClick={() => search(request)}
                disabled={phase === 'searching' || !request.trim()}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-faint disabled:shadow-none"
              >
                {phase === 'searching' ? <Loader2 size={15} className="animate-spin" /> : <>Search <ArrowRight size={14} /></>}
              </button>
            </div>

            {phase === 'idle' && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {meta.examples.map((ex) => (
                  <button key={ex} onClick={() => search(ex)} className="rounded-[10px] border-2 border-border px-2.5 py-1.5 text-xs text-ink-muted hover:border-brand-border hover:text-ink">
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : !health.checking ? (
          <div className="mt-4"><OfflineCard /></div>
        ) : null}
      </Card>

      {error && <div className="rounded-xl border-2 border-danger/40 bg-danger/5 px-3 py-2.5 text-xs font-medium text-danger">{error}</div>}

      {phase === 'searching' && <AgentActivity steps={steps} elapsed={elapsed} />}

      {phase === 'results' && results && (
        <>
          <Card
            title="UNDERSTOOD AS"
            icon={meta.icon}
            action={results.asOf ? <span className="text-[11px] text-ink-faint">{results.asOf}</span> : undefined}
          >
            <div className="flex flex-wrap gap-1.5">
              {parsedPills.map((p) => <Pill key={p}>{p}</Pill>)}
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">Not right? Just ask again — e.g. "cheaper" or "closer to the airport".</p>
          </Card>

          <Card title={`SUGGESTIONS · ${results.options.length}`} icon={Sparkles}>
            {results.options.length === 0 ? (
              <Empty>Nothing matched — try rephrasing the request.</Empty>
            ) : (
              <div className="space-y-2.5">
                {results.options.map((o, i) => (
                  <SuggestionRow key={`${o.name}-${i}`} kind={kind} o={o} city={city} />
                ))}
              </div>
            )}
            <p className="mt-3 border-t border-border pt-3 text-[11px] text-ink-faint">
              Research only — prices and availability are indicative; confirm and {kind === 'hotel' ? 'book' : 'reserve'} on the site.
            </p>
          </Card>

          {results.advice && (
            <Card title="AGENT'S TAKE" icon={Sparkles}>
              <p className="text-sm leading-relaxed text-ink-muted">{results.advice}</p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ─── The Booking page: three tiles, one agent each ───────────────────────────

const TILES: { id: 'flight' | BookingKind; label: string; blurb: string; icon: typeof Plane }[] = [
  { id: 'flight', label: 'Flight', blurb: 'Fares, routes & coupons', icon: Plane },
  { id: 'hotel', label: 'Hotel', blurb: 'Stays & nightly rates', icon: HotelIcon },
  { id: 'restaurant', label: 'Restaurant', blurb: 'Tables worth booking', icon: UtensilsCrossed },
]

export default function Flights() {
  const [kind, setKind] = useEphemeral<'flight' | BookingKind>('gcos.book.kind', 'flight')
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TILES.map((t) => {
          const active = kind === t.id
          return (
            <button
              key={t.id}
              onClick={() => setKind(t.id)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                active ? 'border-accent bg-accent-soft brand-glow' : 'border-border bg-surface hover:border-brand-border'
              }`}
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${active ? 'bg-accent text-white' : 'bg-surface-2 text-ink-muted'}`}>
                <t.icon size={20} />
              </span>
              <span className="min-w-0">
                <span className={`block font-heading text-[12px] font-bold uppercase tracking-[0.14em] ${active ? 'text-accent' : 'text-ink'}`}>
                  {t.label}
                </span>
                <span className="block text-xs text-ink-muted">{t.blurb}</span>
              </span>
            </button>
          )
        })}
      </div>

      {kind === 'flight' ? <FlightAgent /> : <BookingAgent key={kind} kind={kind} />}
    </div>
  )
}
