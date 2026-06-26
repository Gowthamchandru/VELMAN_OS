import { useEffect, useState } from 'react'
import { Newspaper, Lightbulb, Plus, X, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui'
import { useVerticals, newVertical, fetchNews, sampleFor, type Vertical, type NewsItem } from './newsData'

function BotSlot({ item }: { item: NewsItem }) {
  return (
    <div className="mt-2 flex items-start gap-1.5 rounded-[8px] border border-dashed border-border bg-surface-2/40 px-2 py-1.5 text-[11px] text-ink-faint">
      <Lightbulb size={12} className="mt-0.5 shrink-0 text-accent" />
      {item.relevance || 'Your assistant will flag how this helps your work.'}
    </div>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="flex flex-col rounded-xl border-2 border-border bg-surface p-3">
      {item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer" className="group flex items-start gap-1 text-sm font-medium text-ink hover:text-accent">
          <span className="min-w-0">{item.title}</span>
          <ExternalLink size={12} className="mt-1 shrink-0 opacity-0 group-hover:opacity-100" />
        </a>
      ) : (
        <span className="text-sm font-medium text-ink">{item.title}</span>
      )}
      <div className="mt-1 text-[11px] text-ink-faint">{item.source}</div>
      <BotSlot item={item} />
    </div>
  )
}

function VerticalSection({ v, items, live, onRemove }: { v: Vertical; items: NewsItem[] | undefined; live: boolean; onRemove: () => void }) {
  return (
    <Card
      title={v.name}
      action={
        <span className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: live ? '#059669' : 'var(--color-ink-faint)' }}>{items === undefined ? '…' : live ? '● live' : 'sample'}</span>
          <button onClick={onRemove} aria-label="remove field" className="text-ink-faint hover:text-danger"><X size={13} /></button>
        </span>
      }
    >
      {!items ? (
        <p className="py-2 text-sm text-ink-faint">Loading latest {v.name} news…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => <NewsCard key={it.id} item={it} />)}
        </div>
      )}
    </Card>
  )
}

export default function News() {
  const { items: verticals, add, remove } = useVerticals()
  const [news, setNews] = useState<Record<string, NewsItem[]>>({})
  const [live, setLive] = useState<Record<string, boolean>>({})
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')

  const sig = verticals.map((v) => v.id + v.query).join('|')
  useEffect(() => {
    let alive = true
    verticals.forEach((v) => {
      fetchNews(v)
        .then((items) => { if (alive) { setNews((s) => ({ ...s, [v.id]: items })); setLive((s) => ({ ...s, [v.id]: true })) } })
        .catch(() => { if (alive) { setNews((s) => ({ ...s, [v.id]: sampleFor(v) })); setLive((s) => ({ ...s, [v.id]: false })) } })
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const addVertical = () => {
    const n = name.trim()
    if (!n) return
    add(newVertical(n, query.trim() || `${n} India`))
    setName('')
    setQuery('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Newspaper size={20} /></div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">News</h1>
          <p className="text-sm text-ink-muted">Latest across your fields + tech. The assistant will rank these &amp; suggest how each helps your work.</p>
        </div>
      </div>

      {/* Add a field */}
      <Card title="Track another field">
        <div className="flex flex-wrap items-end gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addVertical()} placeholder="Field name (e.g. Real estate)" className="min-w-[10rem] flex-1 rounded-[10px] border-2 border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-accent" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addVertical()} placeholder="Search terms (optional)" className="min-w-[10rem] flex-1 rounded-[10px] border-2 border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-accent" />
          <button onClick={addVertical} className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"><Plus size={14} /> Add</button>
        </div>
      </Card>

      {verticals.map((v) => (
        <VerticalSection key={v.id} v={v} items={news[v.id]} live={!!live[v.id]} onRemove={() => remove(v.id)} />
      ))}
    </div>
  )
}
