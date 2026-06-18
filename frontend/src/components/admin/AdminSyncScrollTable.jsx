import { useEffect, useRef, useState } from 'react'

/**
 * Wide admin table with a synced top horizontal scrollbar and sticky header.
 */
export default function AdminSyncScrollTable({ children, maxHeightClass = 'max-h-[min(70vh,42rem)]' }) {
  const topRef = useRef(null)
  const bodyRef = useRef(null)
  const tableRef = useRef(null)
  const syncing = useRef(false)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [clientWidth, setClientWidth] = useState(0)

  useEffect(() => {
    const table = tableRef.current
    const body = bodyRef.current
    if (!table || !body) return undefined

    const update = () => {
      setScrollWidth(table.scrollWidth)
      setClientWidth(body.clientWidth)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(table)
    ro.observe(body)
    window.addEventListener('resize', update)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [children])

  useEffect(() => {
    const top = topRef.current
    const body = bodyRef.current
    if (!top || !body) return undefined

    const syncFromTop = () => {
      if (syncing.current) return
      syncing.current = true
      body.scrollLeft = top.scrollLeft
      syncing.current = false
    }

    const syncFromBody = () => {
      if (syncing.current) return
      syncing.current = true
      top.scrollLeft = body.scrollLeft
      syncing.current = false
    }

    top.addEventListener('scroll', syncFromTop)
    body.addEventListener('scroll', syncFromBody)
    return () => {
      top.removeEventListener('scroll', syncFromTop)
      body.removeEventListener('scroll', syncFromBody)
    }
  }, [scrollWidth, clientWidth])

  const showTopBar = scrollWidth > clientWidth + 1

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {showTopBar ? (
        <div
          ref={topRef}
          className="overflow-x-auto overflow-y-hidden border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/80"
          style={{ height: 14 }}
          aria-label="Horizontal scroll"
          title="Scroll table horizontally"
        >
          <div style={{ width: scrollWidth, height: 1 }} aria-hidden />
        </div>
      ) : null}
      <div ref={bodyRef} className={`overflow-x-auto overflow-y-auto ${maxHeightClass}`}>
        <table ref={tableRef} className="min-w-[720px] w-full text-left text-sm">
          {children}
        </table>
      </div>
    </div>
  )
}
