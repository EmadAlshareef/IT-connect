/** Structured content blocks for programming topic documentation. */
export const TOPIC_STRUCTURED_SECTIONS = [
  {
    id: 'objectives',
    label: 'Learning objectives',
    placeholder: 'What students should know or be able to do after this lesson…',
    hint: 'Bullet points work well, e.g. “Understand useState” or “Build a counter component”.',
  },
  {
    id: 'concepts',
    label: 'Core concepts',
    placeholder: 'Definitions, theory, and how the pieces fit together…',
    hint: 'Explain the idea in plain language before code examples.',
  },
  {
    id: 'examples',
    label: 'Code examples',
    placeholder: 'Use ```javascript fences for syntax-highlighted samples…',
    hint: 'Wrap code in triple backticks for a formatted code block.',
  },
  {
    id: 'implementation',
    label: 'Implementation walkthrough',
    placeholder: 'Step-by-step setup, architecture, or hands-on exercise…',
    hint: 'Number steps (1, 2, 3) so trainees can follow along.',
  },
  {
    id: 'bestPractices',
    label: 'Best practices',
    placeholder: 'Recommended approaches, patterns, and conventions…',
    hint: 'Focus on what to do and what to avoid.',
  },
  {
    id: 'tips',
    label: 'Tips & troubleshooting',
    placeholder: 'Shortcuts, debugging hints, and common mistakes…',
    hint: 'Practical advice trainees will use during tasks.',
  },
  {
    id: 'notes',
    label: 'Instructor notes',
    placeholder: 'Extra context, classroom discussion points, or reminders…',
    hint: 'Optional depth for curious students.',
  },
  {
    id: 'references',
    label: 'References & links',
    placeholder: 'Official docs, articles, specs — paste full https:// links…',
    hint: 'Links are clickable for students.',
  },
]

export const TOPIC_VIDEO_ACCEPT = 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v'

export const TOPIC_DOWNLOAD_DOC_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.cs',
  '.html',
  '.css',
  '.zip',
]

export const TOPIC_DOWNLOAD_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m4v']

export const TOPIC_DOC_ACCEPTED_EXTENSIONS = [
  ...TOPIC_DOWNLOAD_DOC_EXTENSIONS,
  ...TOPIC_DOWNLOAD_VIDEO_EXTENSIONS,
]

export const TOPIC_DOC_ACCEPT_STRING = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/zip',
  'application/json',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  ...TOPIC_DOC_ACCEPTED_EXTENSIONS.map((ext) => ext.slice(1)),
].join(',')

export function createEmptyTopicSections() {
  return Object.fromEntries(TOPIC_STRUCTURED_SECTIONS.map((s) => [s.id, '']))
}

export function createEmptyTopicDraft() {
  return {
    title: '',
    explanation: '',
    videoUrl: '',
    videoCaption: '',
    videoSource: '',
    videoFileName: '',
    videoFileSize: 0,
    videoAllowDownload: true,
    sections: createEmptyTopicSections(),
    attachments: [],
  }
}
