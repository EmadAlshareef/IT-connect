import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './themeContextObject.js'
import { getInitialDarkMode, persistThemePreference } from './themeUtils.js'

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(getInitialDarkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      persistThemePreference(next)
      return next
    })
  }, [])

  /** Persist explicit choice (e.g. future settings screen). */
  const setTheme = useCallback((mode) => {
    const next = mode === 'dark'
    setDark(next)
    persistThemePreference(next)
  }, [])

  const value = useMemo(() => ({ dark, toggleTheme, setTheme }), [dark, toggleTheme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
