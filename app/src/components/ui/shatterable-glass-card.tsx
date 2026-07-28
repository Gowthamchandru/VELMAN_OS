// Shatterable glass card — a tall glass-gradient card that fractures like real
// glass when clicked: one click plays a crack (Voronoi fracture lines + pluck
// note), the pane then bursts into shards that fall with gravity, revealing the
// back panel, and `onShattered` fires. Used by the entry flow's mode cards.
//
// Adapted for Velman OS from a shared snippet: typed for strict TS, content and
// colors come in as props, sound starts inside the click gesture (autoplay
// policy), and prefers-reduced-motion skips straight to `onShattered`.
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tone from 'tone'
import { Delaunay } from 'd3-delaunay'

interface Shard {
  id: number
  path: string
  vx: number
  vy: number
  vr: number
  life: number
}

type CardState = 'intact' | 'cracked' | 'shattered'

// Fracture the card into Voronoi cells radiating from the click point.
function generateShards(x: number, y: number, w: number, h: number): Shard[] {
  const points: [number, number][] = Array.from({ length: 100 }, () => [Math.random() * w, Math.random() * h])
  points.push([x, y])
  const voronoi = Delaunay.from(points).voronoi([0, 0, w, h])
  return Array.from(voronoi.cellPolygons()).map((poly, i) => {
    let sx = 0
    let sy = 0
    for (const [px, py] of poly) {
      sx += px
      sy += py
    }
    const dx = sx / poly.length - x
    const dy = sy / poly.length - y
    const angle = Math.atan2(dy, dx)
    const force = (w - Math.hypot(dx, dy)) / w
    return {
      id: i,
      path: `M${poly.join('L')}Z`,
      vx: Math.cos(angle) * (10 + Math.random() * 10) * force,
      vy: Math.sin(angle) * (10 + Math.random() * 10) - 5,
      vr: (Math.random() - 0.5) * 2,
      life: 1,
    }
  })
}

// Canvas that animates the flying shards (velocity + gravity) until they fade.
function ShardCanvas({ shards, width, height, rgb }: { shards: Shard[]; width: number; height: number; rgb: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0
    const active = shards.map((s) => ({ ...s, x: 0, y: 0, r: 0 }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const s of active) {
        if (s.life <= 0) continue
        alive = true
        s.x += s.vx
        s.y += s.vy
        s.r += s.vr
        s.vy += 0.2 // gravity
        s.life -= 0.01
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate((s.r * Math.PI) / 180)
        ctx.fillStyle = `rgba(${rgb},${Math.max(s.life, 0)})`
        ctx.fill(new Path2D(s.path))
        ctx.restore()
      }
      if (alive) raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [shards, rgb])

  return <canvas ref={canvasRef} width={width} height={height} className="pointer-events-none absolute inset-0" />
}

export interface ShatterableGlassCardProps {
  front: ReactNode // intact face
  back: ReactNode // revealed once the glass is gone
  gradientClass: string // e.g. 'bg-linear-to-br from-violet-500 to-indigo-700'
  shardRgb?: string // 'r,g,b' tint of the flying shards
  className?: string // sizing from the caller
  onShattered?: () => void // fires after the shatter lands
  label: string // accessible name for the card button
}

export default function ShatterableGlassCard({
  front,
  back,
  gradientClass,
  shardRgb = '167,139,250',
  className = '',
  onShattered,
  label,
}: ShatterableGlassCardProps) {
  const [state, setState] = useState<CardState>('intact')
  const [shards, setShards] = useState<Shard[]>([])
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const synths = useRef<{ crack?: Tone.PluckSynth; shatter?: Tone.PolySynth<Tone.MetalSynth> }>({})

  useEffect(() => {
    const crack = new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9 }).toDestination()
    const shatter = new Tone.PolySynth(Tone.MetalSynth, {
      envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination()
    crack.volume.value = -6
    shatter.volume.value = -12
    synths.current = { crack, shatter }
    const pending = timers.current
    return () => {
      crack.dispose()
      shatter.dispose()
      pending.forEach(clearTimeout)
    }
  }, [])

  // One click runs the whole sequence: crack → (380ms) shatter → (700ms) done.
  const shatterAt = (x: number, y: number) => {
    if (state !== 'intact') return
    const el = containerRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onShattered?.()
      return
    }
    const rect = el.getBoundingClientRect()
    setDims({ w: rect.width, h: rect.height })
    setShards(generateShards(x, y, rect.width, rect.height))
    setState('cracked')
    void Tone.start()
      .then(() => synths.current.crack?.triggerAttack('C6'))
      .catch(() => {})
    timers.current.push(
      window.setTimeout(() => {
        setState('shattered')
        synths.current.shatter?.triggerAttackRelease(['C4', 'E4', 'G4', 'B4'], 0.4)
        timers.current.push(window.setTimeout(() => onShattered?.(), 700))
      }, 380),
    )
  }

  const handleClick = (e: MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) shatterAt(e.clientX - rect.left, e.clientY - rect.top)
  }
  const handleKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) shatterAt(rect.width / 2, rect.height / 2)
  }

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={handleClick}
      onKeyDown={handleKey}
      className={`relative cursor-pointer select-none overflow-hidden rounded-2xl border border-white/20 shadow-2xl transition-transform duration-300 ${
        state === 'intact' ? 'hover:-translate-y-1.5 hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)]' : ''
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${gradientClass} ${className}`}
    >
      {/* Back panel sits underneath everything — the glass shatters to reveal it. */}
      <div className="absolute inset-0 bg-[#0e1a2e]">
        <AnimatePresence>
          {state === 'shattered' && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.2 } }}
            >
              {back}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The glass pane: gradient face + sheen + content, fades out on shatter. */}
      <AnimatePresence>
        {state !== 'shattered' && (
          <motion.div className={`absolute inset-0 ${gradientClass}`} exit={{ opacity: 0 }}>
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/15 via-transparent to-transparent" />
            {front}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crack lines (visible between first click and the burst) */}
      <svg
        className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${
          state === 'cracked' ? 'opacity-50' : 'opacity-0'
        }`}
        fill="none"
        stroke="white"
      >
        {shards.map((s) => (
          <path key={s.id} d={s.path} strokeWidth="0.5" />
        ))}
      </svg>

      {state === 'shattered' && <ShardCanvas shards={shards} width={dims.w} height={dims.h} rgb={shardRgb} />}
    </div>
  )
}
