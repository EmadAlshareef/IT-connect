import { TOPIC_STRUCTURED_SECTIONS } from './constants.js'

const textareaClass =
  'w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950'

function TopicStructuredSections({ sections, onSectionChange, disabled }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lesson sections</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Build a clear learning path. Use code fences (```) in examples for formatted blocks on the student view.
        </p>
      </div>
      <div className="space-y-4">
        {TOPIC_STRUCTURED_SECTIONS.map((section, index) => (
          <div
            key={section.id}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40"
          >
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor={`topic-section-${section.id}`}
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                {index + 1}. {section.label}
              </label>
            </div>
            {section.hint ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{section.hint}</p>
            ) : null}
            <textarea
              id={`topic-section-${section.id}`}
              value={sections[section.id] ?? ''}
              onChange={(event) => onSectionChange(section.id, event.target.value)}
              rows={section.id === 'examples' || section.id === 'implementation' ? 8 : 5}
              disabled={disabled}
              placeholder={section.placeholder}
              className={`${textareaClass} mt-2 ${section.id === 'examples' ? 'min-h-[10rem]' : 'min-h-[7rem]'}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopicStructuredSections
