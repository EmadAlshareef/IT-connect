/** Static marketing copy and lists for the IT Connect home page. */

export const featureCards = [
  {
    title: 'Internship Management',
    body: 'Structured postings, approvals, and placements with clear milestones from day one to completion.',
    icon: 'briefcase',
  },
  {
    title: 'Trainer Collaboration',
    body: 'Co-deliver programs with shared rubrics, session notes, and aligned feedback for every cohort.',
    icon: 'users',
  },
  {
    title: 'Student Progress Tracking',
    body: 'Tasks, deadlines, and competencies visible to learners, mentors, and program administrators.',
    icon: 'chart',
  },
  {
    title: 'Performance Analytics',
    body: 'Dashboards for completion rates, evaluation trends, and cohort readiness—without spreadsheet chaos.',
    icon: 'analytics',
  },
  {
    title: 'Communication Tools',
    body: 'Secure messaging and announcements that stay tied to programs and internship workflows.',
    icon: 'chat',
  },
  {
    title: 'Certificate Management',
    body: 'Issue verified credentials when evaluations pass—ready for transcripts and employer verification.',
    icon: 'award',
  },
]

export const platformHighlights = [
  {
    key: 'catalog',
    title: 'Training catalog',
    body: 'Browse published programs by track and branch, check live seat availability, and enroll in the pathway that fits your goals.',
    icon: 'book',
  },
  {
    key: 'company',
    title: 'Company programs',
    body: 'Partners publish trainings, assign in-house trainers, manage members, and keep internship tracks aligned with hiring needs.',
    icon: 'building',
  },
  {
    key: 'applications',
    title: 'Enrollment applications',
    body: 'Students apply with structured forms; trainers and companies review, approve, and reserve seats in one workflow.',
    icon: 'clipboard',
  },
  {
    key: 'tasks',
    title: 'Tasks & evaluations',
    body: 'Trainers publish briefs and deadlines, review submissions, and give rubric-based feedback learners can act on.',
    icon: 'checklist',
  },
  {
    key: 'dashboards',
    title: 'Role-based workspaces',
    body: 'Dedicated dashboards for students, trainers, companies, and admins—each with the tools and data for their role.',
    icon: 'layout',
  },
  {
    key: 'credentials',
    title: 'Progress & credentials',
    body: 'Track completion and competency milestones, then issue verified certificates when program requirements are met.',
    icon: 'award',
  },
]

export const journeySteps = [
  { n: '1', title: 'Register', body: 'Create your profile and verify your role—student, trainer, or partner.' },
  { n: '2', title: 'Join a Training Program', body: 'Enroll in a pathway aligned with your degree or internship track.' },
  { n: '3', title: 'Complete Tasks', body: 'Submit work through guided checkpoints with mentor visibility.' },
  { n: '4', title: 'Receive Evaluation', body: 'Get rubric-based feedback and actionable next steps.' },
  { n: '5', title: 'Earn Certification', body: 'Unlock a verified certificate when requirements are met.' },
]

export const audienceCards = [
  {
    key: 'students',
    title: 'Students',
    body: 'Navigate internships, coursework support, and credentials in one trusted academic workspace.',
    icon: 'student',
  },
  {
    key: 'trainers',
    title: 'Trainers',
    body: 'Coordinate cohorts, evaluations, and feedback at scale while staying aligned with institution standards.',
    icon: 'trainer',
  },
  {
    key: 'universities',
    title: 'Universities',
    body: 'Govern programs, partnerships, and outcomes with audit-ready records and shared analytics.',
    icon: 'university',
  },
  {
    key: 'companies',
    title: 'Companies',
    body: 'Publish internship tracks, mentor learners, and strengthen your university hiring pipelines.',
    icon: 'company',
  },
]

/** Featured program tracks on the home page (mirrors admin Track Management catalog). */
export const programTracks = [
  {
    key: 'frontend-dev',
    title: 'Frontend Development',
    description: 'Responsive interfaces, component architecture, and mentor-led code reviews.',
    bucket: 'frontend',
    icon: 'code',
    trainings: 2,
    students: 27,
    active: 1,
    skills: ['React', 'TypeScript', 'CSS'],
  },
  {
    key: 'backend-dev',
    title: 'Backend Development',
    description: 'APIs, data modeling, authentication, and services built for real internship workloads.',
    bucket: 'backend',
    icon: 'db',
    trainings: 2,
    students: 28,
    active: 1,
    skills: ['REST', 'SQL', 'Security basics'],
  },
  {
    key: 'mobile-dev',
    title: 'Mobile Development',
    description: 'Cross-platform apps with milestones from prototype to polished releases.',
    bucket: 'mobile',
    icon: 'mobile',
    trainings: 1,
    students: 14,
    active: 1,
    skills: ['Flutter', 'Firebase', 'UX patterns'],
  },
]

/** Role-based platform capabilities shown on the home page (replaces generic testimonials). */
export const platformRoleCards = [
  {
    key: 'students',
    title: 'Students',
    body: 'Discover published trainings, apply with structured forms, and follow your program from enrollment to certificate.',
    type: 'student',
    highlights: ['Browse catalog & reserve seats', 'Submit tasks and track progress', 'Receive evaluations & credentials'],
  },
  {
    key: 'trainers',
    title: 'Trainers',
    body: 'See only company-assigned programs, publish task briefs, review submissions, and manage enrollment requests.',
    type: 'trainer',
    highlights: ['Company-assigned training workspace', 'Task briefs & rubric feedback', 'Enrollment review inbox'],
  },
  {
    key: 'companies',
    title: 'Companies',
    body: 'Publish internship tracks, assign in-house trainers, manage team members, and review applicants in one dashboard.',
    type: 'company',
    highlights: ['Create & submit training programs', 'Assign trainers to tracks', 'Member roster & applicants'],
  },
  {
    key: 'admins',
    title: 'Administrators',
    body: 'Govern branches, tracks, and the public catalog—with live seat counts, trainer rosters, and company approval flows.',
    type: 'admin',
    highlights: ['Track & catalog management', 'Approve company training requests', 'Live enrollment & seat stats'],
  },
]
