// The whole-app AI assistant. Opens as a right-side drawer; it reads a live
// snapshot of EVERY module (via useAssistantContext) so the user can just ask
// "what needs my attention?" / "how's my portfolio?" instead of clicking around.
// Answers come from the LOCAL server, which uses the user's Claude Pro plan.
import { useEffect, useRef, useState } from 'react'
import {
  Sparkles, X, ArrowUp, Loader2, Server, Mic, Square,
  ListChecks, TrendingUp, Wallet, FileText, CreditCard, Repeat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useServerHealth, useAssistantContext, askAssistant, type ChatMessage } from '@/lib/ai'

// --- Web Speech API (browser-native voice input; Chrome/Edge/Safari) -----------
// Minimal typings — the API isn't in the standard DOM lib.
interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
}
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

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
      <div key={i} className="flex gap-2"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent/70" /><p className="flex-1 leading-relaxed">{parts}</p></div>
    ) : (
      <p key={i} className="mb-1 leading-relaxed last:mb-0">{parts}</p>
    )
  })
}

const SUGGESTIONS: { icon: LucideIcon; text: string }[] = [
  { icon: ListChecks, text: 'What needs my attention today?' },
  { icon: TrendingUp, text: 'How is my portfolio doing?' },
  { icon: Wallet, text: 'What is my net worth?' },
  { icon: FileText, text: 'Which documents need renewing?' },
  { icon: CreditCard, text: 'What subscriptions are due soon?' },
  { icon: Repeat, text: 'Summarise my open loops.' },
]

// Small brand mark used in the header and beside each assistant reply.
function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'size-7' : 'size-9'
  const icon = size === 'sm' ? 15 : 18
  return (
    <div className={`grid ${dim} shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-[#2f6fbf] text-white shadow-sm`}>
      <Sparkles size={icon} />
    </div>
  )
}

// Shown when the local Pro server isn't reachable.
function ServerOffline() {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><Server size={15} /> Assistant server not running</div>
      <p className="text-xs leading-relaxed text-ink-muted">The assistant runs on your machine and uses your <b className="text-ink">Claude Pro</b> plan. Start it once:</p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-ink/95 p-3 font-mono text-[11px] leading-relaxed text-slate-100">{`# one-time setup
npm i -g @anthropic-ai/claude-code
claude setup-token        # browser login to Pro
# paste token into .env as CLAUDE_CODE_OAUTH_TOKEN=…

# then run the app + assistant together
npm run dev:all`}</pre>
      <p className="mt-3 text-[11px] text-ink-faint">This panel connects automatically once the server is up.</p>
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
  const [listening, setListening] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const baseTextRef = useRef('') // text already in the box before this dictation
  const ready = health.online
  const speechSupported = typeof window !== 'undefined' && !!getSpeechRecognition()

  // Auto-grow the textarea up to a few lines.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }, [input])

  // Toggle voice dictation. Live transcript streams into the input box; the user
  // reviews it and presses Enter/Send (or just keeps talking).
  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'en-IN'
    rec.continuous = true
    rec.interimResults = true
    baseTextRef.current = input ? input.trimEnd() + ' ' : ''
    rec.onresult = (e: any) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript
      setInput(baseTextRef.current + transcript)
    }
    rec.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed')
        setError('Microphone blocked. Allow mic access in your browser to speak.')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    setError('')
    setListening(true)
    rec.start()
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Stop listening if the drawer closes.
  useEffect(() => {
    if (!open) recognitionRef.current?.abort()
  }, [open])

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
    recognitionRef.current?.abort()
    setListening(false)
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
      ? 'Offline'
      : health.mode === 'subscription'
        ? `Online · ${health.model ?? 'sonnet'}`
        : health.mode === 'apikey'
          ? `API key · ${health.model ?? ''}`
          : 'No credentials'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm gc-fade-in" onMouseDown={onClose}>
      <div
        className="gc-slide-in flex h-full w-full max-w-[460px] flex-col border-l border-border bg-bg shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <BrandMark />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-heading text-[13px] font-extrabold tracking-[0.14em] text-ink">ASSISTANT</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
              <span className={`size-1.5 rounded-full ${health.online ? 'dot-online bg-online' : health.checking ? 'bg-warn' : 'bg-down'}`} />
              {statusLabel}
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} title="Clear conversation" className="rounded-lg px-2.5 py-1.5 font-heading text-[10px] font-bold uppercase tracking-wide text-ink-faint transition-colors hover:bg-surface-2 hover:text-danger">Clear</button>
          )}
          <button onClick={onClose} aria-label="Close assistant" className="grid size-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"><X size={18} /></button>
        </header>

        {/* Body */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {!ready ? (
            <ServerOffline />
          ) : messages.length === 0 ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center pt-4 text-center">
                <BrandMark />
                <p className="mt-3 text-[15px] font-semibold text-ink">Good to see you, Dr. Gowtham</p>
                <p className="mt-1 max-w-[280px] text-[13px] leading-relaxed text-ink-muted">Ask me anything in this dashboard.</p>
              </div>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    onClick={() => send(text)}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-sm text-ink-muted shadow-sm transition-all hover:-translate-y-px hover:border-brand-border hover:text-ink hover:shadow-md"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                      <Icon size={16} />
                    </span>
                    <span className="flex-1 font-medium">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="gc-msg-in flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-sm font-medium leading-relaxed text-white shadow-sm">{m.content}</div>
                </div>
              ) : (
                <div key={i} className="gc-msg-in flex items-start gap-2.5">
                  <BrandMark size="sm" />
                  <div className="max-w-[calc(100%-2.5rem)] rounded-2xl rounded-tl-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink-muted shadow-sm">
                    {renderMarkdown(m.content)}
                  </div>
                </div>
              ),
            )
          )}
          {loading && (
            <div className="gc-msg-in flex items-start gap-2.5">
              <BrandMark size="sm" />
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-3.5 shadow-sm">
                <span className="gc-dot size-1.5 rounded-full bg-accent" style={{ animationDelay: '0ms' }} />
                <span className="gc-dot size-1.5 rounded-full bg-accent" style={{ animationDelay: '160ms' }} />
                <span className="gc-dot size-1.5 rounded-full bg-accent" style={{ animationDelay: '320ms' }} />
              </div>
            </div>
          )}
          {error && <div className="rounded-xl border border-danger/40 bg-danger/5 px-3 py-2.5 text-xs font-medium text-danger">{error}</div>}
        </div>

        {/* Composer */}
        {ready && (
          <div className="border-t border-border bg-surface px-3 pb-3 pt-2.5">
            <div className={`flex items-end gap-1.5 rounded-2xl border bg-surface p-1.5 transition-all ${listening ? 'border-danger/60 brand-glow' : 'border-border focus-within:border-accent focus-within:brand-glow'}`}>
              {speechSupported && (
                <button
                  onClick={toggleMic}
                  disabled={loading}
                  aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                  title={listening ? 'Stop listening' : 'Speak your question'}
                  className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors disabled:opacity-40 ${
                    listening
                      ? 'animate-pulse bg-danger/10 text-danger'
                      : 'text-ink-faint hover:bg-surface-2 hover:text-accent'
                  }`}
                >
                  {listening ? <Square size={15} className="fill-current" /> : <Mic size={17} />}
                </button>
              )}
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
                }}
                placeholder={listening ? 'Listening… speak now' : 'Ask about anything in your dashboard…'}
                disabled={loading}
                className="min-w-0 flex-1 resize-none self-center bg-transparent px-1.5 py-2 text-sm text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-faint disabled:shadow-none"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={17} />}
              </button>
            </div>
            <div className="mt-2 px-1 text-center text-[11px] text-ink-faint">
              {speechSupported && <>Tap <Mic size={11} className="mb-0.5 inline" /> to speak · </>}<kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for a new line
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
