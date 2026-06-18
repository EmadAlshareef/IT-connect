import {
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Lightbulb,
  ListChecks,
  Sparkles,
} from 'lucide-react'
import { TOPIC_STRUCTURED_SECTIONS } from './constants.js'
import TopicMediaDownloadCard from './TopicMediaDownloadCard.jsx'
import TopicRichContent from './TopicRichContent.jsx'
import { TopicVideoEmbed } from './TopicVideoField.jsx'
import { canDownloadTopicVideo, parseTopicVideoUrl } from '../../../utils/topicVideo.js'
import { formatTopicFileSize } from '../../../utils/topicFileUtils.js'

const SECTION_ICONS = {
  objectives: ListChecks,
  concepts: Lightbulb,
  examples: Sparkles,
  implementation: BookOpen,
  bestPractices: CheckCircle2,
  tips: Sparkles,
  notes: FileText,
  references: FileText,
}

function countFilledSections(sections) {
  return TOPIC_STRUCTURED_SECTIONS.filter((s) => String(sections?.[s.id] ?? '').trim()).length
}

function TopicContentViewer({ topic }) {
  if (!topic) return null

  const hasVideo = parseTopicVideoUrl(topic.videoUrl).valid
  const sectionCount = countFilledSections(topic.sections)
  const filledSections = TOPIC_STRUCTURED_SECTIONS.filter((s) =>
    String(topic.sections?.[s.id] ?? '').trim(),
  )
  const showLessonVideoDownload = canDownloadTopicVideo(topic)
  const downloadableAttachments = (topic.attachments ?? []).filter(
    (f) => f.dataUrl || f.url,
  )
  const hasDownloads = showLessonVideoDownload || downloadableAttachments.length > 0

  const lessonVideoFile = showLessonVideoDownload
    ? {
        name: topic.videoFileName || 'فيديو الدرس',
        size: topic.videoFileSize,
        type: 'video/mp4',
        kind: 'video',
        dataUrl: topic.videoUrl,
      }
    : null

  return (
    <article className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-gradient-to-r from-violet-600 via-violet-600 to-fuchsia-600 px-6 py-8 text-white dark:border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">
          {topic.trainingTitle || 'برنامج التدريب'}
        </p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{topic.title}</h2>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          {hasVideo ? (
            <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20">يتضمن فيديو</span>
          ) : null}
          {sectionCount > 0 ? (
            <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20">
              {sectionCount} قسم{sectionCount === 1 ? '' : 'ات'} تعليمية
            </span>
          ) : null}
          {hasDownloads ? (
            <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20">
              {(showLessonVideoDownload ? 1 : 0) + downloadableAttachments.length} ملف للتنزيل
            </span>
          ) : null}
        </div>
      </header>

      <div className="space-y-8 px-6 py-8">
        {hasVideo ? (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              فيديو الدرس
            </h3>
            <TopicVideoEmbed videoUrl={topic.videoUrl} caption={topic.videoCaption} />
          </section>
        ) : null}

        {topic.explanation?.trim() ? (
          <section className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5 dark:border-violet-900/40 dark:bg-violet-950/20">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
              نظرة عامة
            </h3>
            <div className="mt-3">
              <TopicRichContent content={topic.explanation} />
            </div>
          </section>
        ) : null}

        {filledSections.length > 0 ? (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              محتوى الدرس
            </h3>
            <div className="space-y-4">
              {filledSections.map((section, index) => {
                const Icon = SECTION_ICONS[section.id] ?? BookOpen
                return (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-950/40"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-violet-400 dark:ring-slate-700">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          الخطوة {index + 1}
                        </p>
                        <h4 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                          {section.label}
                        </h4>
                        <div className="mt-3">
                          <TopicRichContent content={topic.sections[section.id]} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {hasDownloads ? (
          <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-5 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Download className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">التنزيلات والموارد</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  حمّل الملفات والفيديوهات المتاحة لهذا الدرس.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {lessonVideoFile ? (
                <TopicMediaDownloadCard file={lessonVideoFile} />
              ) : null}
              {downloadableAttachments.map((file) => (
                <TopicMediaDownloadCard key={file.id} file={file} />
              ))}
            </div>
          </section>
        ) : topic.attachments?.length > 0 ? (
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              مراجع (بدون تنزيل)
            </h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {topic.attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <FileText className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatTopicFileSize(file.size)} — اسم مرجعي فقط
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          نُشر {new Date(topic.publishedAt ?? topic.updatedAt).toLocaleString()}
        </p>
      </div>
    </article>
  )
}

export default TopicContentViewer
