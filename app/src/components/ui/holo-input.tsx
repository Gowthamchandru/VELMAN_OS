// Holographic input — the field every PIN and password in the app uses, so
// Vault, Financial, Business and the Company Vault all unlock through the same
// control. Chrome (corners, border, scanline, glow, data stream) is decorative
// and pointer-transparent; styling lives in index.css under .gc-holo-*.
//
// The label floats using :placeholder-shown, so the input MUST keep a
// whitespace placeholder — an empty string would leave the label sitting over
// typed text.
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string
  /** Renders inside the field, clear of the decorative layers (e.g. a reveal toggle). */
  trailing?: ReactNode
  invalid?: boolean
  wrapperClassName?: string
}

const BARS = Array.from({ length: 10 }, (_, i) => i)

export default function HoloInput({ label, trailing, invalid = false, wrapperClassName = '', className = '', ...props }: Props) {
  const id = useId()
  return (
    <div className={`gc-holo ${invalid ? 'is-invalid' : ''} ${wrapperClassName}`}>
      <input
        {...props}
        id={id}
        placeholder=" "
        className={`gc-holo-input ${trailing ? 'has-trailing' : ''} ${className}`}
      />
      <label htmlFor={id} data-text={label} className="gc-holo-label">{label}</label>

      <span className="gc-holo-border" aria-hidden="true" />
      <span className="gc-holo-scanline" aria-hidden="true" />
      <span className="gc-holo-glow" aria-hidden="true" />
      <span className="gc-holo-stream" aria-hidden="true">
        {BARS.map((i) => (
          <span key={i} className="gc-holo-bar" style={{ ['--i' as string]: i }} />
        ))}
      </span>
      <span className="gc-holo-corners" aria-hidden="true">
        <span className="gc-holo-corner tl" />
        <span className="gc-holo-corner tr" />
        <span className="gc-holo-corner bl" />
        <span className="gc-holo-corner br" />
      </span>

      {trailing && <span className="gc-holo-trailing">{trailing}</span>}
    </div>
  )
}
