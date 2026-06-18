import { useCallback, useState } from 'react'

/**
 * Single-expand accordion state: one panel id active at a time, click again to collapse.
 */
export function useCollapsiblePanel(initialId = null) {
  const [activeId, setActiveId] = useState(initialId)

  const toggle = useCallback((id) => {
    setActiveId((current) => (current === id ? null : id))
  }, [])

  const collapse = useCallback(() => setActiveId(null), [])

  const isActive = useCallback((id) => activeId === id, [activeId])

  return { activeId, toggle, collapse, isActive, setActiveId }
}
