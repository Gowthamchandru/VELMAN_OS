// Glitch CTA — a cyan slab cut back at all four corners, carrying a hard white
// offset edge, that tears itself apart on hover. The overlay copy is driven by
// `data-text`, so the label lives in one place; styling and keyframes are in
// index.css (.gc-glitch-wrap / .gc-glitch-btn).
//
// The wrapper is not decoration: the button is shaped with clip-path, and
// clip-path is applied after filter, so the offset edge and the cyan bloom have
// to be cast from one level up or the corner cuts eat them. Layout props
// (className, style) ride the wrapper for the same reason — it is the element
// with the button's true visual bounds.
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export default function GlitchButton({ label, className = '', style, ...props }: Props) {
  return (
    <span className={`gc-glitch-wrap ${className}`} style={style}>
      <button {...props} data-text={label} className="gc-glitch-btn">
        {label}
      </button>
    </span>
  )
}
