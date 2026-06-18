/** localStorage key — keep in sync with the inline script in `index.html`. */
export const THEME_STORAGE_KEY = 'it-connect-theme'

/**
 * Resolve initial dark mode for hydration.
 * Order: saved preference → system `prefers-color-scheme` → light.
 */
export function getInitialDarkMode() {
  if (typeof window === 'undefined') return false
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark') return true
    if (stored === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function persistThemePreference(isDark) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')
  } catch {
    /* quota / private mode */
  }
}
