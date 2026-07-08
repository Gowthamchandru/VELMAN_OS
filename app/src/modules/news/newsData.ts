// News data — EDITABLE verticals (your real business fields) + live headlines per
// field from Google News (via a CORS proxy), with a sample fallback if the live
// fetch is blocked. Built BOT-READY: each item has a `relevance` slot the future
// assistant fills ("how this helps your work").
import { useEffect, useState } from 'react'
import { useCollection, uid } from '@/lib/store'
import { SERVER } from '@/lib/server'

export interface Vertical {
  id: string
  name: string
  query: string // Google News search query for this field
}

export interface NewsItem {
  id: string
  title: string
  source: string
  url?: string
  vertical: string
  relevance?: string // filled by the assistant/bot later
}

// Your fields (editable — add more from the page). Tech is included per request.
const seedVerticals: Vertical[] = [
  { id: 'v-interiors', name: 'Interiors', query: 'interior design industry India' },
  { id: 'v-restaurant', name: 'Restaurant', query: 'restaurant food industry India' },
  { id: 'v-school', name: 'School', query: 'school education sector India' },
  { id: 'v-tech', name: 'Tech', query: 'technology AI startups India' },
]

export const useVerticals = () => useCollection<Vertical>('gcos.news.verticals.v1', seedVerticals)
export const newVertical = (name: string, query: string): Vertical => ({ id: uid(), name, query })

// Fallback headlines per field (shown only if the live fetch fails).
export const SAMPLE: Record<string, { title: string; source: string }[]> = {
  Interiors: [
    { title: 'Sustainable materials reshape India’s interior design market', source: 'Architectural Digest' },
    { title: 'Modular kitchens see strong demand in tier-2 cities', source: 'ET Retail' },
    { title: '2026 interior trends: warm minimalism and natural textures', source: 'Elle Decor' },
  ],
  Restaurant: [
    { title: 'India’s QSR sector grows double digits in 2026', source: 'ET HospitalityWorld' },
    { title: 'Cloud kitchens consolidate as margins tighten', source: 'Inc42' },
    { title: 'FSSAI tightens hygiene-rating norms for restaurants', source: 'The Hindu' },
  ],
  School: [
    { title: 'NEP 2020 rollout: what changes for schools this year', source: 'Times of India' },
    { title: 'EdTech blends back into classrooms post funding reset', source: 'YourStory' },
    { title: 'CBSE updates assessment framework for secondary grades', source: 'Indian Express' },
  ],
  Tech: [
    { title: 'Anthropic ships a new Claude model with stronger reasoning', source: 'TechCrunch' },
    { title: 'India’s DPDP rules near enforcement — what builders must do', source: 'MediaNama' },
    { title: 'AI copilots move into vertical SaaS', source: 'The Verge' },
  ],
}
export function sampleFor(v: Vertical): NewsItem[] {
  const rows = SAMPLE[v.name] ?? [{ title: `Latest ${v.name} news will appear here`, source: 'Sample' }]
  return rows.map((r, i) => ({ id: `${v.id}-s${i}`, title: r.title, source: r.source, vertical: v.name }))
}

// Fetch RSS through a proxy that adds CORS headers. Order matters: the LOCAL
// assistant server is tried first (reliable, no CORS limit, runs on your
// machine). If it isn't running, fall back to free public proxies — flaky, so
// two are listed — and finally to SAMPLE data (handled by callers).
const PROXIES = [
  (u: string) => `${SERVER}/api/news?url=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
]

export async function fetchNews(v: Vertical, n = 6): Promise<NewsItem[]> {
  const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(v.query)}&hl=en-IN&gl=IN&ceid=IN:en`
  let xmlText = ''
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(rss))
      if (!res.ok) continue
      const t = await res.text()
      if (t.includes('<item')) {
        xmlText = t
        break
      }
    } catch {
      /* try next proxy */
    }
  }
  if (!xmlText) throw new Error('news unavailable')
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml')
  return [...xml.querySelectorAll('item')].slice(0, n).map((it, i) => {
    const raw = it.querySelector('title')?.textContent ?? ''
    const source = it.querySelector('source')?.textContent ?? ''
    const title = source && raw.endsWith(` - ${source}`) ? raw.slice(0, -(source.length + 3)) : raw
    return { id: `${v.id}-${i}`, title, source, url: it.querySelector('link')?.textContent ?? undefined, vertical: v.name }
  })
}

// Top story from each field — for the Command Center news ticker (above greeting).
export function useTopHeadlines(): NewsItem[] {
  const { items: verticals } = useVerticals()
  const sig = verticals.map((v) => v.id + v.query).join('|')
  const [items, setItems] = useState<NewsItem[]>([])
  useEffect(() => {
    let alive = true
    Promise.all(verticals.map((v) => fetchNews(v, 1).then((n) => n[0] ?? sampleFor(v)[0]).catch(() => sampleFor(v)[0])))
      .then((res) => { if (alive) setItems(res.filter(Boolean) as NewsItem[]) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
  return items
}
