// The entry mode chosen on /mode (Personal vs Professional). Lasts for the
// browser session; the shell redirects to /welcome until one is picked.
export type EntryMode = 'personal' | 'professional'
const MODE_KEY = 'gcos.entry.mode'

export function getEntryMode(): EntryMode | null {
  try {
    const v = sessionStorage.getItem(MODE_KEY)
    return v === 'personal' || v === 'professional' ? v : null
  } catch {
    return null
  }
}

export function setEntryMode(mode: EntryMode) {
  try {
    sessionStorage.setItem(MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}

// Does a module tagged with `moduleMode` belong in the current space?
// Untagged and 'both' modules show everywhere; no chosen mode shows everything.
export function inCurrentMode(moduleMode?: EntryMode | 'both'): boolean {
  const current = getEntryMode()
  if (!current || !moduleMode || moduleMode === 'both') return true
  return moduleMode === current
}
