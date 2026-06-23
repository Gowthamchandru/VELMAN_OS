// The whole-app AI assistant. Opens as a right-side drawer; it reads a live
// snapshot of EVERY module (via useAssistantContext) so the user can just ask
// "what needs my attention?" / "how's my portfolio?" instead of clicking around.
// Answers come from the LOCAL server, which uses the user's Claude Pro plan.
import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, Loader2, Server } from 'lucide-react'
import { useServerHealth, useAssistantContext, askAssistant, type ChatMessage } from '@/lib/ai'

// Tiny markdown: **bold**, `code`, and "- "/"• " bullets, line by line.
function renderMarkdown(text: string) {
  return text.split('\n').filter((l) => l.trim() !== '').map((line, i) => {
    const bullet = /^\s*[-•]\s+/.test(line)
    const body = line.replace(/^\s*[-•]\s+/, '')
    const parts = body.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={j} className="font-semibold text-ink">{p.slice(2, -2)}</strong>
      if (p.startsWith('`') && p.endsWith('`')) return <code key={j} className="rounded bg-surface-2 px-1 font-mono text-[12px] text-ink">{p.slice(1, -1)}</code>
      return <span key={j}>{p}</span>
    })
    return bullet ? (
      <div key={i} className="flex gap-2"><span className="mt-1.5 shrink-0 text-accent">•</span><p className="flex-1 leading-relaxed">{parts}</p></div>
    ) : (
      <p key={i} className="mb-1 leading-relaxed">{parts}</p>
    )
  })
}

const SUGGESTIONS = [
  'What needs my attention today?',
  'How is my portfolio doing?',
  'What is my net worth?',
  'Which documents need renewing?',
  'What subscriptions are due soon?',
  'Summarise my open loops.',
]

// Shown when the local Pro server isn't reachable.
function ServerOffline() {
  return (
    <div className="rounded-xl border-2 border-dashed border-border p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink"><Server size={15} /> Assistant server not running</div>
      <p className="text-xs text-ink-muted">The assistant runs on your machine and uses your <b className="text-ink">Claude Pro</b> plan. Start it once:</p>
      <pre className="mt-2 overflow-x-auto rounded-[10px] bg-surface-2 p-2.5 font-mono text-[11px] leading-relaxed text-ink">{`# one-time setup
npm i -g @anthropic-ai/claude-code
claude setup-token        # browser login to Pro
# paste token into app/.env as CLAUDE_CODE_OAUTH_TOKEN=…

# then run the app + assistant together
npm run dev:all`}</pre>
      <p className="mt-2 text-[11px] text-ink-faint">This panel connects automatically once the server is up.</p>
    </div>
  )
}

export default function Assistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const health = useServerHealth()
  const context = useAssistantContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ready = health.online

  useEffect(() => {
    if (open && ready) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open, ready])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || loading || !ready) return
    setError('')
    setInput('')
    const history = messages
    setMessages([...history, { role: 'user', content: q }])
    setLoading(true)
    try {
      const answer = await askAssistant(context, history, q)
      setMessages((m) => [...m, { role: 'assistant', content: answer }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed — is the assistant server running?')
      setMessages((m) => m.slice(0, -1)) // drop the unanswered user turn
      setInput(q)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const statusLabel = health.checking
    ? 'Connecting…'
    : !health.online
      ? 'Server offline'
      : health.mode === 'subscription'
        ? `Claude Pro · ${health.model ?? 'sonnet'}`
        : health.mode === 'apikey'
          ? `API key · ${health.model ?? ''}`
          : 'No credentials'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onMouseDown={onClose}>
      <div
        className="flex h-full w-full max-w-[440px] flex-col border-l-2 border-border bg-surface shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b-2 border-border px-4 py-3">
          <div className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent"><Sparkles size={18} /></div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-heading text-[12px] font-extrabold tracking-[0.12em] text-ink">ASSISTANT</div>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className={`size-1.5 rounded-full ${health.online ? 'dot-online bg-online' : health.checking ? 'bg-warn' : 'bg-down'}`} />
              {statusLabel}
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} title="Clear chat" className="grid h-7 place-items-center rounded-[10px] px-2 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-faint hover:text-danger">Clear</button>
          )}
          <button onClick={onClose} aria-label="close" className="grid size-7 place-items-center rounded-[10px] text-ink-faint hover:text-ink"><X size={17} /></button>
        </header>

        {/* Body */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {!ready ? (
            <ServerOffline />
          ) : messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-muted">Hi Dr. Gowtham — I can see your whole dashboard. Try one of these:</p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-[10px] border-2 border-border bg-surface px-3 py-2 text-left text-sm text-ink-muted hover:border-accent hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-white">{m.content}</div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink-muted">
                    {renderMarkdown(m.content)}
                  </div>
                </div>
              ),
            )
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-ink-faint"><Loader2 size={14} className="animate-spin" /> Reading your dashboard…</div>
          )}
          {error && <div className="rounded-[10px] border-2 border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</div>}
        </div>

        {/* Composer */}
        {ready && (
          <div className="border-t-2 border-border p-3">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                placeholder="Ask about anything in your dashboard…"
                disabled={loading}
                className="min-w-0 flex-1 rounded-[10px] border-2 border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:brand-glow disabled:opacity-60"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label="send"
                className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <div className="mt-1.5 text-[11px] text-ink-faint">
              <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Esc</kbd> to close · answered on your Claude Pro plan
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
