import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, ExternalLink, FileCode, Folder, X } from 'lucide-react'
import { getCodeReviewSample } from '../data/codeReviewSamples.js'

function FileTreeRow({ node, depth, selectedPath, onSelect, expandedIds, toggle }) {
  const pad = { paddingLeft: `${10 + depth * 14}px` }

  if (node.type === 'folder') {
    const open = expandedIds.has(node.id)
    return (
      <div key={node.id}>
        <button
          type="button"
          onClick={() => toggle(node.id)}
          style={pad}
          className="flex w-full items-center gap-1.5 py-1.5 pr-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
            aria-hidden
          />
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500/90" aria-hidden />
          <span className="truncate">{node.label}</span>
        </button>
        {open && node.children
          ? node.children.map((child) => (
              <FileTreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                expandedIds={expandedIds}
                toggle={toggle}
              />
            ))
          : null}
      </div>
    )
  }

  const active = selectedPath === node.path
  return (
    <button
      key={node.id}
      type="button"
      onClick={() => onSelect(node.path)}
      style={pad}
      className={`flex w-full items-center gap-2 py-1.5 pr-2 text-left text-xs ${
        active
          ? 'bg-violet-50 font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200'
          : 'font-normal text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80'
      }`}
    >
      <FileCode className="ml-5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <span className="truncate">{node.label}</span>
    </button>
  )
}

function collectFolderIds(tree, expandedByDefault = true) {
  const ids = new Set()
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.type === 'folder') {
        if (expandedByDefault) ids.add(n.id)
        if (n.children) walk(n.children)
      }
    }
  }
  walk(tree)
  return ids
}

export default function CodeReviewModal({ traineeName, branch, projectTag, taskTitle, onClose }) {
  const sample = useMemo(() => getCodeReviewSample(projectTag), [projectTag])
  const [selectedPath, setSelectedPath] = useState(() => getCodeReviewSample(projectTag).defaultFilePath)
  const [expandedIds, setExpandedIds] = useState(() =>
    collectFolderIds(getCodeReviewSample(projectTag).tree),
  )

  const toggleFolder = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const code = sample.files[selectedPath] ?? '// No preview for this file.'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-3 py-6 backdrop-blur-sm dark:bg-slate-950/70"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-review-title"
        className="flex max-h-[min(90vh,840px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <h2 id="code-review-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Code Review — {traineeName}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review the student&apos;s submitted code (read-only).
            </p>
            {taskTitle ? (
              <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">Task: {taskTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close code review"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 bg-slate-50/90 px-5 py-3 text-xs dark:border-slate-800 dark:bg-slate-950/40">
          <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{sample.projectDisplayName}</span>
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline" aria-hidden>
            |
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Branch: <span className="font-mono text-slate-800 dark:text-slate-200">{branch}</span>
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
            {traineeName}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Last commit: {sample.lastCommitSummary} · {sample.lastCommitDateLabel}
          </span>
          <button
            type="button"
            title="Open repository (demo)"
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-transparent p-1 text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-600 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="External repository link (demo)"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 divide-x divide-slate-200 dark:divide-slate-700">
          <aside className="w-[min(220px,32vw)] shrink-0 overflow-y-auto bg-white py-2 dark:bg-slate-900">
            {sample.tree.map((node) => (
              <FileTreeRow
                key={node.id}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                expandedIds={expandedIds}
                toggle={toggleFolder}
              />
            ))}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950/40">
            <div className="shrink-0 border-b border-slate-200 px-4 py-2 dark:border-slate-700">
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{selectedPath}</span>
            </div>
            <pre className="max-h-[min(56vh,520px)] flex-1 overflow-auto p-4 text-[11px] leading-relaxed text-slate-800 dark:text-slate-200">
              <code className="font-mono">{code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
