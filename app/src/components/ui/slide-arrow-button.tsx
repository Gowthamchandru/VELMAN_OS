// Pill CTA with a sliding icon puck — a white circle rides the right end and
// glides across to the left edge on hover while the arrow rotates 45° to keep
// pointing forward; the label shifts to make room. Adapted for Velman OS from
// a shared shadcn snippet: self-contained (no shadcn Button/cva/Slot — those
// need theme tokens this app doesn't define), brand accent + Orbitron label.
import type { ButtonHTMLAttributes } from 'react'
import { ArrowUpRight } from 'lucide-react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Glass treatment — for sitting over a photograph rather than flat colour. */
  glass?: boolean
}

export default function SlideArrowButton({ className = '', glass = false, children, ...props }: Props) {
  const shell = glass
    ? 'border border-white/25 bg-white/10 text-white backdrop-blur-md hover:border-accent/70 hover:bg-white/15 hover:shadow-[0_0_34px_rgba(0,217,255,0.5)]'
    : 'bg-accent text-white hover:shadow-[0_0_30px_rgba(0,217,255,0.55)]'
  return (
    <button
      {...props}
      className={`group relative h-14 w-fit cursor-pointer overflow-hidden rounded-full p-1 ps-8 pe-16 font-heading text-[13px] font-bold uppercase tracking-[0.2em] transition-all duration-500 hover:ps-16 hover:pe-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${shell} ${className}`}
    >
      <span className="relative z-10 transition-all duration-500 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">{children}</span>
      <span
        aria-hidden="true"
        className="absolute right-1 top-1 grid size-12 place-items-center rounded-full bg-accent text-[#04070e] shadow-[0_0_20px_rgba(0,217,255,0.65)] transition-all duration-500 group-hover:right-[calc(100%-52px)] group-hover:rotate-45"
      >
        <ArrowUpRight size={18} />
      </span>
    </button>
  )
}
