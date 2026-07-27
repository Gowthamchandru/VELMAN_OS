// Browser-native voice input (Web Speech API — Chrome/Edge/Safari), shared by
// the Assistant drawer and the Flight Booking agent. Live transcript streams
// into the caller's input box; the user reviews and sends.
import { useRef, useState } from 'react'

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

export function useSpeechInput({ getBase, onText, onError }: {
  getBase: () => string // current input value when dictation starts
  onText: (value: string) => void // full new input value (base + transcript)
  onError?: (message: string) => void
}) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const supported = typeof window !== 'undefined' && !!getSpeechRecognition()

  const toggle = () => {
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
    const base = (() => { const b = getBase(); return b ? b.trimEnd() + ' ' : '' })()
    rec.onresult = (e: any) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript
      onText(base + transcript)
    }
    rec.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed')
        onError?.('Microphone blocked. Allow mic access in your browser to speak.')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    setListening(true)
    rec.start()
  }

  const abort = () => {
    recognitionRef.current?.abort()
    setListening(false)
  }

  return { supported, listening, toggle, abort }
}
