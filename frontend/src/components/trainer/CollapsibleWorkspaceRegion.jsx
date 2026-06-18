/**
 * Renders panel content only while expanded (not mounted underneath other sections).
 */
function CollapsibleWorkspaceRegion({ panelId, activeId, title, children }) {
  if (activeId !== panelId) return null

  return (
    <div
      id={`workspace-panel-${panelId}`}
      role="region"
      aria-labelledby={`workspace-toggle-${panelId}`}
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {title ? (
        <h2 className="sr-only" id={`workspace-panel-heading-${panelId}`}>
          {title}
        </h2>
      ) : null}
      {children}
    </div>
  )
}

export default CollapsibleWorkspaceRegion
