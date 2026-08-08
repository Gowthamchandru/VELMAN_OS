// Glitch CTA — a magenta slab with a cyan hard-shadow that tears itself apart
// on hover. The overlay copy is driven by `data-text`, so the label lives in
// one place; styling and keyframes are in index.css (.gc-glitch-btn).
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export default function GlitchButton({ label, className = '', ...props }: Props) {
  return (
    <button {...props} data-text={label} className={`gc-glitch-btn ${className}`}>
      {label}
    </button>
  )
}
