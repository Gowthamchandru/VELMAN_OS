// Pill CTA with a sliding icon puck — a white circle rides the right end and
// glides across to the left edge on hover while the arrow rotates 45° to keep
// pointing forward; the label shifts to make room. Adapted for Velman OS from
// a shared shadcn snippet: self-contained (no shadcn Button/cva/Slot — those
// need theme tokens this app doesn't define), brand accent + Orbitron label.
import type { ButtonHTMLAttributes } from 'react'
import { ArrowUpRight } from 'lucide-react'

export default function SlideArrowButton({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`group relative h-14 w-fit cursor-pointer overflow-hidden rounded-full bg-accent p-1 ps-8 pe-16 font-heading text-[13px] font-bold uppercase tracking-[0.2em] text-white transition-all duration-500 hover:ps-16 hover:pe-8 hover:shadow-[0_0_30px_rgba(28,77,140,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
    >
      <span className="relative z-10 transition-all duration-500">{children}</span>
      <span
        aria-hidden="true"
        className="absolute right-1 top-1 grid size-12 place-items-center rounded-full bg-white text-accent transition-all duration-500 group-hover:right-[calc(100%-52px)] group-hover:rotate-45"
      >
        <ArrowUpRight size={18} />
      </span>
    </button>
  )
}
