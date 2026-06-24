import { useLocalValue, useEphemeral } from '@/lib/store'

// Per-module PIN lock. PIN persists in localStorage; unlock state is session-only (resets on page reload).
export function useLock(id: string) {
  const [pin, setPin] = useLocalValue(`gcos.lock.pin.${id}`, '1234')
  const [unlocked, setUnlocked] = useEphemeral(`gcos.lock.open.${id}`, false)

  const tryUnlock = (attempt: string): boolean => {
    if (attempt === pin) { setUnlocked(true); return true }
    return false
  }

  return { pin, setPin, unlocked, tryUnlock, lock: () => setUnlocked(false) }
}
