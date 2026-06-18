import { useContext } from 'react'
import { ThemeContext } from './themeContextObject.js'

/**
 * Theme API (Tailwind `darkMode: 'class'` on `document.documentElement`).
 *
 * @returns {{
 *   dark: boolean,
 *   toggleTheme: () => void,
 *   setTheme: (mode: 'light' | 'dark') => void,
 * }}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider.')
  return ctx
}
