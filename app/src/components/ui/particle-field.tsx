// Particle network backdrop — floating dots joined by distance-faded lines;
// the cursor pushes particles away and whitens the lines near it. Adapted for
// Velman OS from the shared "Aether Flow" snippet: typed for strict TS, the
// canvas is transparent (the page's own backdrop shows through), colors come
// in as props, and prefers-reduced-motion renders one static frame instead of
// animating. Sits behind content; clicks pass straight through.
import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  dx: number
  dy: number
  size: number
}

export interface ParticleFieldProps {
  className?: string
  particleRgb?: string // 'r,g,b' of the dots
  lineRgb?: string // 'r,g,b' of the connection lines
  highlightRgb?: string // 'r,g,b' of lines near the cursor
  density?: number // px² of canvas per particle (smaller = more particles)
}

export default function ParticleField({
  className = '',
  particleRgb = '125,170,230',
  lineRgb = '93,140,199',
  highlightRgb = '255,255,255',
  density = 9000,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let raf = 0
    let particles: Particle[] = []
    const mouse = { x: null as number | null, y: null as number | null, radius: 200 }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const init = () => {
      particles = []
      const n = Math.floor((canvas.width * canvas.height) / density)
      for (let i = 0; i < n; i++) {
        const size = Math.random() * 2 + 1
        particles.push({
          x: Math.random() * (canvas.width - size * 4) + size * 2,
          y: Math.random() * (canvas.height - size * 4) + size * 2,
          dx: Math.random() * 0.4 - 0.2,
          dy: Math.random() * 0.4 - 0.2,
          size,
        })
      }
    }

    const step = (p: Particle) => {
      if (p.x > canvas.width || p.x < 0) p.dx = -p.dx
      if (p.y > canvas.height || p.y < 0) p.dy = -p.dy
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.hypot(dx, dy)
        if (dist < mouse.radius + p.size && dist > 0) {
          const force = (mouse.radius - dist) / mouse.radius
          p.x -= (dx / dist) * force * 5
          p.y -= (dy / dist) * force * 5
        }
      }
      p.x += p.dx
      p.y += p.dy
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${particleRgb},0.8)`
      ctx.fill()
    }

    const connect = () => {
      const reach = (canvas.width / 7) * (canvas.height / 7)
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x
          const dy = particles[a].y - particles[b].y
          const distSq = dx * dx + dy * dy
          if (distSq >= reach) continue
          const opacity = Math.max(0, 1 - distSq / 20000)
          let nearMouse = false
          if (mouse.x !== null && mouse.y !== null) {
            nearMouse = Math.hypot(particles[a].x - mouse.x, particles[a].y - mouse.y) < mouse.radius
          }
          ctx.strokeStyle = `rgba(${nearMouse ? highlightRgb : lineRgb},${opacity})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(particles[a].x, particles[a].y)
          ctx.lineTo(particles[b].x, particles[b].y)
          ctx.stroke()
        }
      }
    }

    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) step(p)
      connect()
      if (!reduced) raf = requestAnimationFrame(frame)
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      init()
      if (reduced) frame() // repaint the single static frame at the new size
    }

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    const onOut = () => {
      mouse.x = null
      mouse.y = null
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseout', onOut)
    resize()
    frame()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onOut)
      cancelAnimationFrame(raf)
    }
  }, [particleRgb, lineRgb, highlightRgb, density])

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none ${className}`} />
}
