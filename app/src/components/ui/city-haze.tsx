// City haze — soft motes of light drifting up through the frame, as if dust
// and moisture in the air were catching the neon below. Replaces the earlier
// particle-network: no connecting lines, nothing geometric, just atmosphere
// that belongs to the photograph behind it.
//
// Sits behind content and never takes pointer events. Under reduced motion it
// paints a single static frame instead of animating.
import { useEffect, useRef } from 'react'

interface Mote {
  x: number
  y: number
  r: number
  drift: number
  rise: number
  alpha: number
  hue: string
  phase: number
}

export interface CityHazeProps {
  className?: string
  /** px² of canvas per mote — larger means sparser. */
  density?: number
}

// Pulled from the backdrop's own palette: cyan tower light, magenta signage,
// and a little plain white for depth.
const HUES = ['0,217,255', '0,217,255', '255,46,99', '255,255,255']

export default function CityHaze({ className = '', density = 26000 }: CityHazeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let raf = 0
    let motes: Mote[] = []
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const seed = () => {
      const n = Math.floor((canvas.width * canvas.height) / density)
      motes = Array.from({ length: n }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.2 + 0.8,
        drift: (Math.random() - 0.5) * 0.16,
        rise: Math.random() * 0.22 + 0.05,
        alpha: Math.random() * 0.4 + 0.12,
        hue: HUES[Math.floor(Math.random() * HUES.length)],
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const paint = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const m of motes) {
        // Slow sway on top of the rise, so they don't travel in straight lines.
        const sway = Math.sin(t / 2600 + m.phase) * 0.5
        m.x += m.drift + sway * 0.25
        m.y -= m.rise
        if (m.y < -12) {
          m.y = canvas.height + 12
          m.x = Math.random() * canvas.width
        }
        if (m.x < -12) m.x = canvas.width + 12
        else if (m.x > canvas.width + 12) m.x = -12

        // Gentle twinkle keeps them from reading as flat dots.
        const a = m.alpha * (0.65 + 0.35 * Math.sin(t / 1400 + m.phase))
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4)
        g.addColorStop(0, `rgba(${m.hue},${a})`)
        g.addColorStop(1, `rgba(${m.hue},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const frame = (t: number) => {
      paint(t)
      raf = requestAnimationFrame(frame)
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      seed()
      if (reduced) paint(0)
    }

    window.addEventListener('resize', resize)
    resize()
    if (!reduced) raf = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [density])

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none ${className}`} />
}
