import { useState, type ReactNode } from 'react'
import { Lock, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useLock } from '@/lib/lockStore'
import HoloInput from '@/components/ui/holo-input'

export function LockScreen({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const { setPin, unlocked, tryUnlock } = useLock(id)
  const [input, setInput] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [pinSaved, setPinSaved] = useState(false)

  const submit = () => {
    if (tryUnlock(input)) { setErr(false); setInput('') }
    else { setErr(true) }
  }

  const savePin = () => {
    if (newPin.length < 4) { setPinErr('PIN must be at least 4 characters.'); return }
    if (newPin !== confirmPin) { setPinErr('PINs do not match.'); return }
    setPin(newPin)
    setNewPin('')
    setConfirmPin('')
    setPinErr('')
    setPinSaved(true)
    setChangingPin(false)
    setTimeout(() => setPinSaved(false), 2500)
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Lock size={30} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-ink">{label}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">Enter your PIN to continue.</p>
          </div>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <HoloInput
            label="Access code"
            type={show ? 'text' : 'password'}
            value={input}
            onChange={(e) => { setInput(e.target.value); setErr(false) }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            invalid={err}
            autoFocus
            trailing={
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide PIN' : 'Show PIN'}
                className="hover:text-accent"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          {err && <p className="text-xs text-danger">Incorrect PIN. Try again.</p>}
          <button
            onClick={submit}
            className="rounded-[10px] bg-accent py-2 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"
          >
            Unlock
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {children}

      {/* Change PIN section */}
      <div className="mt-6 border-t-2 border-border pt-4">
        {!changingPin ? (
          <button
            onClick={() => setChangingPin(true)}
            className="flex items-center gap-2 text-xs text-ink-faint hover:text-accent"
          >
            <KeyRound size={13} /> Change PIN
          </button>
        ) : (
          <div className="flex flex-wrap items-end gap-3 pt-6">
            <HoloInput
              label="New PIN"
              type="password"
              value={newPin}
              onChange={(e) => { setNewPin(e.target.value); setPinErr('') }}
              invalid={!!pinErr}
              wrapperClassName="w-44"
            />
            <HoloInput
              label="Confirm"
              type="password"
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value); setPinErr('') }}
              onKeyDown={(e) => e.key === 'Enter' && savePin()}
              invalid={!!pinErr}
              wrapperClassName="w-44"
            />
            <button onClick={savePin} className="rounded-[10px] bg-accent px-3 py-2 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90">
              Save
            </button>
            <button onClick={() => { setChangingPin(false); setNewPin(''); setConfirmPin(''); setPinErr('') }} className="text-xs text-ink-faint hover:text-ink">
              Cancel
            </button>
            {pinErr && <p className="w-full text-xs text-danger">{pinErr}</p>}
          </div>
        )}
        {pinSaved && <p className="mt-1 text-xs text-[#00ffa3]">PIN updated successfully.</p>}
      </div>
    </div>
  )
}
