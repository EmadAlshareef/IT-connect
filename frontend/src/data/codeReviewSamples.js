/** Mock read-only “submission” trees for the trainer code review modal */

const HEADER_TSX = `import React from 'react'

export interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-blue-800 text-white">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-lg opacity-90">{subtitle}</p>
        ) : null}
      </div>
    </header>
  )
}
`

const APP_TSX = `import { Header } from './components/Header'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Welcome" subtitle="Landing page draft" />
      <main className="container mx-auto px-4 py-10">
        <p className="text-slate-700">Project content goes here.</p>
      </main>
    </div>
  )
}
`

const INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light dark;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
}
`

const PACKAGE_JSON = `{
  "name": "landing-page-project",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
`

const README = `# Landing Page Project

Student submission for the landing page module.

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`
`

const landingPageTree = [
  {
    id: 'folder-src',
    label: 'src',
    type: 'folder',
    children: [
      {
        id: 'folder-components',
        label: 'components',
        type: 'folder',
        children: [
          {
            id: 'file-header',
            label: 'Header.tsx',
            type: 'file',
            path: 'src/components/Header.tsx',
          },
        ],
      },
      { id: 'file-app', label: 'App.tsx', type: 'file', path: 'src/App.tsx' },
      { id: 'file-index-css', label: 'index.css', type: 'file', path: 'src/index.css' },
    ],
  },
  { id: 'file-pkg', label: 'package.json', type: 'file', path: 'package.json' },
  { id: 'file-readme', label: 'README.md', type: 'file', path: 'README.md' },
]

const landingPageFiles = {
  'src/components/Header.tsx': HEADER_TSX,
  'src/App.tsx': APP_TSX,
  'src/index.css': INDEX_CSS,
  'package.json': PACKAGE_JSON,
  'README.md': README,
}

function genericTree() {
  return [
    {
      id: 'folder-src',
      label: 'src',
      type: 'folder',
      children: [
        {
          id: 'file-main',
          label: 'main.tsx',
          type: 'file',
          path: 'src/main.tsx',
        },
      ],
    },
    { id: 'file-pkg', label: 'package.json', type: 'file', path: 'package.json' },
  ]
}

const GENERIC_MAIN = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`

function genericFiles(projectSlug) {
  return {
    'src/main.tsx': GENERIC_MAIN,
    'package.json': JSON.stringify(
      {
        name: projectSlug,
        private: true,
        version: '0.0.0',
        type: 'module',
      },
      null,
      2,
    ),
  }
}

/**
 * @param {string} projectTag — usually matches task.tag (e.g. landing-page-project)
 */
export function getCodeReviewSample(projectTag) {
  const slug = projectTag?.trim() || 'submission'

  if (slug === 'landing-page-project') {
    return {
      projectDisplayName: 'landing-page-project',
      defaultFilePath: 'src/components/Header.tsx',
      lastCommitSummary: 'feat: add responsive navigation',
      lastCommitDateLabel: '3/10/2024',
      tree: landingPageTree,
      files: landingPageFiles,
    }
  }

  const files = genericFiles(slug)
  return {
    projectDisplayName: slug,
    defaultFilePath: 'src/main.tsx',
    lastCommitSummary: 'chore: submit task',
    lastCommitDateLabel: new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date()),
    tree: genericTree(),
    files,
  }
}
