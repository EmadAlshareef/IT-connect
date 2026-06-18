function linkifyLine(line) {
  const urlPattern = /(https?:\/\/[^\s]+)/g
  const parts = line.split(urlPattern)
  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${index}-${part}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-violet-600 underline underline-offset-2 hover:text-violet-500 dark:text-violet-400"
        >
          {part}
        </a>
      )
    }
    return <span key={`${index}-text`}>{part}</span>
  })
}

function splitCodeBlocks(text) {
  const value = String(text ?? '')
  if (!value.includes('```')) {
    return [{ type: 'text', lang: '', value }]
  }

  const parts = []
  const regex = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0
  let match = regex.exec(value)
  while (match) {
    if (match.index > last) {
      parts.push({ type: 'text', lang: '', value: value.slice(last, match.index) })
    }
    parts.push({ type: 'code', lang: match[1] || 'code', value: match[2].trim() })
    last = match.index + match[0].length
    match = regex.exec(value)
  }
  if (last < value.length) {
    parts.push({ type: 'text', lang: '', value: value.slice(last) })
  }
  return parts.length ? parts : [{ type: 'text', lang: '', value }]
}

function TextBlock({ value }) {
  const lines = String(value ?? '').split('\n')
  return (
    <div className="space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
      {lines.map((line, index) => (
        <p key={index} className={line.trim() === '' ? 'min-h-[0.5rem]' : ''}>
          {line.trim() === '' ? '\u00a0' : linkifyLine(line)}
        </p>
      ))}
    </div>
  )
}

/** Renders topic text with paragraphs, links, and fenced code blocks. */
export function TopicRichContent({ content, className = '' }) {
  if (!String(content ?? '').trim()) return null
  const blocks = splitCodeBlocks(content)

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-emerald-100"
            >
              {block.lang ? (
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {block.lang}
                </span>
              ) : null}
              <code>{block.value}</code>
            </pre>
          )
        }
        return <TextBlock key={index} value={block.value} />
      })}
    </div>
  )
}

export default TopicRichContent
