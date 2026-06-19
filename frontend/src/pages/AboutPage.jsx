import {
  BarChart3,
  BookOpenCheck,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LogIn,
  MessageSquareText,
  MousePointerClick,
  Route,
  Search,
  ShieldCheck,
} from 'lucide-react'
import HomeFooter from '../components/home/HomeFooter.jsx'
import {
  accentAt,
  cardPlayful,
  homePageShell,
  sectionEyebrow,
  sectionSubtitle,
  sectionTitle,
} from '../components/home/homeTheme.js'

const platformSteps = [
  {
    title: 'Companies publish opportunities',
    body: 'Companies create training requests, attach program details, select tracks, and follow enrolled students.',
    icon: Building2,
  },
  {
    title: 'Admins organize the catalog',
    body: 'Admins approve tracks, publish trainings, and keep the service catalog connected to real programs.',
    icon: Route,
  },
  {
    title: 'Trainers guide learners',
    body: 'Trainers accept students, publish tasks and topics, review submissions, and send feedback.',
    icon: BookOpenCheck,
  },
  {
    title: 'Students learn in one workspace',
    body: 'Students apply, access course material, submit work, chat, use AI Tutor, and track feedback.',
    icon: GraduationCap,
  },
]

const featureCards = [
  {
    label: 'Learning',
    title: 'Tasks, topics, submissions',
    body: 'A structured course workspace keeps every learner focused on the training they joined.',
    icon: BookOpenCheck,
  },
  {
    label: 'Communication',
    title: 'Messages and notifications',
    body: 'Students and trainers stay connected through course-aware updates, inboxes, and reminders.',
    icon: MessageSquareText,
  },
  {
    label: 'AI Support',
    title: 'AI Tutor per course',
    body: 'The assistant answers questions in context and saves each conversation per student and course.',
    icon: Bot,
  },
  {
    label: 'Insight',
    title: 'Dashboards and reports',
    body: 'Admins, companies, and trainers see the numbers that matter for enrollment and progress.',
    icon: BarChart3,
  },
]

const userJourneySteps = [
  {
    title: 'Create your account',
    body: 'The student starts by signing up or logging in, then opens the training catalog.',
    icon: LogIn,
  },
  {
    title: 'Browse trainings',
    body: 'They explore services, companies, and available programs until they find the right training.',
    icon: Search,
  },
  {
    title: 'Open training details',
    body: 'The student reviews seats, trainer, company details, and program description before applying.',
    icon: MousePointerClick,
  },
  {
    title: 'Send enrollment request',
    body: 'They submit the application form with their study details and CV for trainer review.',
    icon: ClipboardCheck,
  },
  {
    title: 'Wait for trainer approval',
    body: 'The trainer receives the request, reviews it, and approves or rejects the enrollment.',
    icon: CheckCircle2,
  },
  {
    title: 'Start learning',
    body: 'After approval, the student sees tasks, topics, AI Tutor, messages, submissions, and feedback.',
    icon: GraduationCap,
  },
]

function FlowNode({ index, title, body, Icon }) {
  const accent = accentAt(index)
  return (
    <article className={`${cardPlayful} relative overflow-hidden p-5`}>
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent.bg} ${accent.text} ${accent.darkBg} ${accent.darkText}`}>
        <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
      </div>
      <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">{body}</p>
      <span className="absolute right-5 top-5 text-4xl font-black text-violet-100 dark:text-slate-800">
        {String(index + 1).padStart(2, '0')}
      </span>
    </article>
  )
}

function JourneyStep({ step, index }) {
  const accent = accentAt(index)
  const Icon = step.icon
  return (
    <article className="relative flex gap-4 rounded-[1.75rem] border-2 border-violet-100 bg-white/85 p-5 dark:border-slate-700 dark:bg-slate-900/70">
      <div className="relative shrink-0">
        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent.bg} ${accent.text} ${accent.darkBg} ${accent.darkText}`}>
          <Icon className="h-7 w-7" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-violet-700 text-xs font-black text-white">
          {index + 1}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{step.title}</h3>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">{step.body}</p>
      </div>
    </article>
  )
}

function AboutPage() {
  return (
    <div className={`${homePageShell} min-h-full font-display`}>
      <main className="px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <section className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className={sectionEyebrow}>About Training Sphere</p>
            <h1 className={`mt-3 ${sectionTitle}`}>One platform connecting companies, trainers, and students.</h1>
            <p className={`${sectionSubtitle} mx-0 mt-5 max-w-2xl text-left`}>
              Training Sphere organizes the full training journey: company programs, student enrollment, trainer workspaces,
              tasks, learning topics, AI guidance, submissions, and feedback.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {['Company programs', 'Trainer dashboards', 'Student workspaces', 'AI Tutor'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto h-[360px] w-full max-w-md">
            <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border-[18px] border-violet-100 bg-white dark:border-violet-950 dark:bg-slate-900" />
            <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              <ShieldCheck className="h-12 w-12" strokeWidth={1.7} aria-hidden />
            </div>
            {platformSteps.map((step, index) => {
              const positions = [
                'left-0 top-3',
                'right-0 top-12',
                'bottom-10 left-3',
                'bottom-0 right-8',
              ]
              const Icon = step.icon
              const accent = accentAt(index)
              return (
                <div
                  key={step.title}
                  className={`absolute ${positions[index]} flex h-24 w-24 items-center justify-center rounded-[1.6rem] border-2 border-white ${accent.bg} ${accent.text} dark:border-slate-800 ${accent.darkBg} ${accent.darkText}`}
                >
                  <Icon className="h-9 w-9" strokeWidth={1.7} aria-hidden />
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl">
          <header className="mx-auto max-w-3xl text-center">
            <p className={sectionEyebrow}>Student journey</p>
            <h2 className={`mt-3 ${sectionTitle}`}>How a user joins a training step by step.</h2>
            <p className={sectionSubtitle}>
              This path helps new students understand exactly what to do from the first visit until they start learning.
            </p>
          </header>

          <div className="relative mt-10">
            <div className="absolute left-1/2 top-0 hidden h-full w-1 -translate-x-1/2 rounded-full bg-violet-100 dark:bg-slate-800 lg:block" />
            <div className="grid gap-5 lg:grid-cols-2">
              {userJourneySteps.map((step, index) => (
                <div
                  key={step.title}
                  className={`relative ${index % 2 === 0 ? 'lg:pr-10' : 'lg:col-start-2 lg:pl-10'}`}
                >
                  <span className="absolute top-7 hidden h-4 w-4 rounded-full border-4 border-white bg-violet-600 dark:border-slate-950 lg:block" style={{ [index % 2 === 0 ? 'right' : 'left']: '-0.5rem' }} />
                  <JourneyStep step={step} index={index} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl">
          <header className="max-w-3xl">
            <p className={sectionEyebrow}>How it works</p>
            <h2 className={`mt-3 ${sectionTitle}`}>A clear path from training request to student success.</h2>
          </header>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {platformSteps.map((step, index) => (
              <FlowNode key={step.title} index={index} title={step.title} body={step.body} Icon={step.icon} />
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl">
          <header className="max-w-3xl">
            <p className={sectionEyebrow}>What the platform provides</p>
            <h2 className={`mt-3 ${sectionTitle}`}>Everything needed to manage training in one place.</h2>
          </header>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {featureCards.map((feature, index) => {
              const accent = accentAt(index)
              const Icon = feature.icon
              return (
                <article key={feature.title} className={`${cardPlayful} p-6`}>
                  <div className="flex items-start gap-4">
                    <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent.bg} ${accent.text} ${accent.darkBg} ${accent.darkText}`}>
                      <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">{feature.label}</p>
                      <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-50">{feature.title}</h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">{feature.body}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  )
}

export default AboutPage
