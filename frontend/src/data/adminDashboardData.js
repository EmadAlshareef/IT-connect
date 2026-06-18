/** @typedef {'cairo'} BranchId */

export const DEFAULT_BRANCH_ID = 'cairo'

export const adminBranches = [
  { id: 'cairo', name: 'Platform', region: '' },
]

/** User-facing label for the default catalog scope (no city/country names). */
export const PLATFORM_SCOPE_LABEL = 'Training Sphere'

const statsByBranch = {
  cairo: { totalStudents: 124, activeTrainings: 8, openPosts: 15, pendingApplications: 42 },
  alexandria: { totalStudents: 86, activeTrainings: 5, openPosts: 11, pendingApplications: 28 },
  giza: { totalStudents: 52, activeTrainings: 4, openPosts: 9, pendingApplications: 19 },
}

/** @param {string} branchId */
export function getBranchStats(branchId) {
  return statsByBranch[branchId] ?? statsByBranch.cairo
}

/** Recent applications list per branch (subset for overview). */
const applicationsByBranch = {
  cairo: [
    { id: 'c1', branchId: 'cairo', initial: 'M', name: 'Mohamed Ali', roleLine: 'Frontend Developer · React', status: 'PENDING', timeLabel: '2 hours ago' },
    { id: 'c2', branchId: 'cairo', initial: 'S', name: 'Sara Ahmed', roleLine: 'UI/UX Designer · Figma', status: 'APPROVED', timeLabel: '1 day ago' },
    { id: 'c3', branchId: 'cairo', initial: 'H', name: 'Hassan Ibrahim', roleLine: 'Backend Developer · Node.js', status: 'INTERVIEWED', timeLabel: '3 days ago' },
    { id: 'c4', branchId: 'cairo', initial: 'F', name: 'Fatima Zahra', roleLine: 'Data Analyst · Python', status: 'REJECTED', timeLabel: '5 days ago' },
  ],
  alexandria: [
    { id: 'a1', branchId: 'alexandria', initial: 'N', name: 'Nour Khaled', roleLine: 'Mobile Developer · Flutter', status: 'PENDING', timeLabel: '4 hours ago' },
    { id: 'a2', branchId: 'alexandria', initial: 'A', name: 'Ali Mostafa', roleLine: 'Backend Intern · Java', status: 'APPROVED', timeLabel: '2 days ago' },
    { id: 'a3', branchId: 'alexandria', initial: 'Y', name: 'Yousef Adel', roleLine: 'Data Science · Python', status: 'INTERVIEWED', timeLabel: '1 week ago' },
  ],
  giza: [
    { id: 'g1', branchId: 'giza', initial: 'M', name: 'Mohamed Ali', roleLine: 'Full stack · MERN', status: 'PENDING', timeLabel: '1 hour ago' },
    { id: 'g2', branchId: 'giza', initial: 'S', name: 'Sara Ahmed', roleLine: 'Product design · UX', status: 'PENDING', timeLabel: '6 hours ago' },
  ],
}

/** @param {string} branchId */
export function getBranchApplications(branchId) {
  return applicationsByBranch[branchId] ?? applicationsByBranch.cairo
}

const trainingRowsByBranch = {
  cairo: [
    { id: 'ct1', label: 'Frontend: Web Development Bootcamp', trainerLine: 'Trainer · TechCorp', studentsCount: 12, progress: 72 },
    { id: 'ct2', label: 'Mobile: Mobile App Development', trainerLine: 'Trainer · AppFactory', studentsCount: 8, progress: 58 },
  ],
  alexandria: [
    { id: 'at1', label: 'Backend: API Engineering Lab', trainerLine: 'Trainer · SeaSoft', studentsCount: 10, progress: 45 },
  ],
  giza: [
    { id: 'gt1', label: 'Data: Analytics Intensive', trainerLine: 'Trainer · DataWorks', studentsCount: 15, progress: 81 },
    { id: 'gt2', label: 'Frontend: UI Systems', trainerLine: 'Trainer · TechCorp', studentsCount: 6, progress: 34 },
  ],
}

/** @param {string} branchId */
export function getBranchTrainingRows(branchId) {
  return trainingRowsByBranch[branchId] ?? trainingRowsByBranch.cairo
}

/** Track cards (Track Management tab). */
const tracksByBranch = {
  cairo: [
    { id: 'tr-fe', title: 'Frontend Development', trainings: 2, students: 27, active: 1, icon: 'code' },
    { id: 'tr-be', title: 'Backend Development', trainings: 2, students: 28, active: 1, icon: 'db' },
    { id: 'tr-mo', title: 'Mobile Development', trainings: 1, students: 14, active: 1, icon: 'mobile' },
    { id: 'tr-ds', title: 'Data & AI', trainings: 1, students: 18, active: 1, icon: 'db' },
    { id: 'tr-do', title: 'DevOps & Cloud', trainings: 1, students: 12, active: 1, icon: 'db' },
    { id: 'tr-ux', title: 'UI/UX Design', trainings: 1, students: 10, active: 1, icon: 'code' },
    { id: 'tr-cs', title: 'Cybersecurity', trainings: 1, students: 9, active: 1, icon: 'db' },
    { id: 'tr-qa', title: 'QA & Test Automation', trainings: 1, students: 11, active: 1, icon: 'code' },
  ],
  alexandria: [
    { id: 'atr-fe', title: 'Frontend Development', trainings: 1, students: 18, active: 1, icon: 'code' },
    { id: 'atr-be', title: 'Backend Development', trainings: 2, students: 22, active: 1, icon: 'db' },
  ],
  giza: [
    { id: 'gtr-ds', title: 'Data & AI', trainings: 2, students: 20, active: 1, icon: 'db' },
    { id: 'gtr-fe', title: 'Frontend Development', trainings: 1, students: 16, active: 1, icon: 'code' },
  ],
}

/** @param {string} branchId */
export function getBranchTracks(branchId) {
  return tracksByBranch[branchId] ?? tracksByBranch.cairo
}

/** Posts (Post Management tab). */
const postsByBranch = {
  cairo: [],
  alexandria: [
    { id: 'ap1', title: 'Cloud Intern — AWS', status: 'PUBLISHED', body: 'Hands-on cloud foundations and deployments.', training: 'Cloud Fundamentals', deadline: '2024-06-10', applicants: 14, tags: ['AWS', 'Linux', 'CI/CD'] },
    { id: 'ap2', title: 'Java Backend Trainee', status: 'PENDING', body: 'Spring ecosystem and REST services.', training: 'Java Enterprise', deadline: '2024-06-18', applicants: 9, tags: ['Java', 'Spring', 'SQL'] },
  ],
  giza: [
    { id: 'gp1', title: 'UX Research Assistant', status: 'PUBLISHED', body: 'Support product discovery and usability studies.', training: 'UX Studio', deadline: '2024-07-01', applicants: 11, tags: ['Figma', 'Research', 'Prototyping'] },
  ],
}

/** @param {string} branchId */
export function getBranchPosts(branchId) {
  return postsByBranch[branchId] ?? postsByBranch.cairo
}

/** Trainings grid (Training Management tab). */
const adminTrainingsByBranch = {
  cairo: [
    { id: 'crt1', linkedTrackId: 'tr-fe', category: 'FRONTEND', title: 'React Fundamentals 2024', body: 'Learn React from scratch with hooks, context, and state management.', date: '2024-06-01', location: '', trainer: 'Trainer User', trainerEmail: 'trainer2003@gmail.com', initials: 'AH', seatsTaken: 15, seatsTotal: 20, status: 'active', filter: 'frontend' },
    { id: 'crt2', linkedTrackId: 'tr-be', category: 'BACKEND', title: 'Node.js Advanced Patterns', body: 'Deep dive into APIs, auth, and scalable services.', date: '2024-07-01', location: '', trainer: 'Trainer User', trainerEmail: 'trainer2003@gmail.com', initials: 'ME', seatsTaken: 12, seatsTotal: 18, status: 'active', filter: 'backend' },
    { id: 'crt3', linkedTrackId: 'tr-mo', category: 'MOBILE', title: 'Flutter Mobile Development', body: 'Cross-platform apps with Flutter and Firebase.', date: '2024-08-01', location: '', trainer: 'Trainer User', trainerEmail: 'trainer2003@gmail.com', initials: 'OH', seatsTaken: 8, seatsTotal: 16, status: 'upcoming', filter: 'mobile' },
  ],
  alexandria: [
    { id: 'art1', linkedTrackId: 'atr-be', category: 'BACKEND', title: 'Java Enterprise Lab', body: 'Spring Boot services and integration tests.', date: '2024-09-01', location: '', trainer: 'Layla Kamal', initials: 'LK', seatsTaken: 10, seatsTotal: 14, status: 'active', filter: 'backend' },
    { id: 'art2', linkedTrackId: 'atr-fe', category: 'FRONTEND', title: 'Vue.js Intensive', body: 'Composition API and enterprise patterns.', date: '2024-09-15', location: '', trainer: 'Ahmed Hassan', initials: 'AH', seatsTaken: 6, seatsTotal: 12, status: 'upcoming', filter: 'frontend' },
  ],
  giza: [
    { id: 'grt1', linkedTrackId: 'gtr-ds', category: 'DATA', title: 'Python for Analytics', body: 'Pandas, visualization, and reporting pipelines.', date: '2024-10-01', location: '', trainer: 'Yousef Adel', initials: 'YA', seatsTaken: 14, seatsTotal: 20, status: 'active', filter: 'backend' },
  ],
}

/** @param {string} branchId */
export function getBranchAdminTrainings(branchId) {
  return adminTrainingsByBranch[branchId] ?? adminTrainingsByBranch.cairo
}

/** Applicants table rows. */
const applicantsTableByBranch = {
  cairo: [
    { id: 't1', initial: 'H', name: 'Hassan Ibrahim', email: 'hassan@example.com', training: 'Backend Developer Position…', status: 'INTERVIEWED', date: '2024-04-12' },
    { id: 't2', initial: 'F', name: 'Fatima Zahra', email: 'fatima@example.com', training: 'Data Analyst Track…', status: 'REJECTED', date: '2024-04-10' },
    { id: 't3', initial: 'M', name: 'Mohamed Ali', email: 'mohamed.ali@example.com', training: 'Frontend Developer Internship…', status: 'PENDING', date: '2024-04-14' },
    { id: 't4', initial: 'S', name: 'Sara Ahmed', email: 'sara.ahmed@example.com', training: 'UI/UX Designer…', status: 'PENDING', date: '2024-04-13' },
    { id: 't5', initial: 'N', name: 'Nour Khaled', email: 'nour@example.com', training: 'Mobile Developer Intern…', status: 'APPROVED', date: '2024-04-08' },
  ],
  alexandria: [
    { id: 'at1', initial: 'A', name: 'Ali Mostafa', email: 'ali@example.com', training: 'Java Backend Trainee', status: 'PENDING', date: '2024-05-02' },
    { id: 'at2', initial: 'Y', name: 'Yousef Adel', email: 'yousef@example.com', training: 'Data Science · Python', status: 'INTERVIEWED', date: '2024-05-01' },
  ],
  giza: [
    { id: 'gt1', initial: 'M', name: 'Mohamed Ali', email: 'mohamed.ali@example.com', training: 'MERN Stack Bootcamp', status: 'PENDING', date: '2024-05-20' },
    { id: 'gt2', initial: 'S', name: 'Sara Ahmed', email: 'sara.ahmed@example.com', training: 'UX Research Assistant', status: 'APPROVED', date: '2024-05-18' },
  ],
}

/** @param {string} branchId */
export function getBranchApplicantsTable(branchId) {
  return applicantsTableByBranch[branchId] ?? applicantsTableByBranch.cairo
}

/** @param {string} branchId */
export function countApplicantsByStatus(branchId) {
  const rows = getBranchApplicantsTable(branchId)
  const counts = { PENDING: 0, INTERVIEWED: 0, APPROVED: 0, REJECTED: 0 }
  rows.forEach((r) => {
    counts[r.status] = (counts[r.status] ?? 0) + 1
  })
  return { total: rows.length, ...counts }
}

/** Details tab — expandable training overview rows. */
const detailsTrainingsByBranch = {
  cairo: [
    { id: 'd1', title: 'React Fundamentals 2024', status: 'active', body: 'Learn React from scratch with modern best practices including hooks, context, and state management.', date: '2024-06-01', location: '', track: 'FRONTEND DEVELOPMENT', students: 4, tasks: 3, trainer: 'Ahmed Hassan', trainerEmail: 'ahmed.hassan@example.com', trainerInitial: 'A', expandedDefault: true },
    { id: 'd2', title: 'Node.js Advanced Patterns', status: 'active', body: 'APIs, caching, and production-grade Node services.', date: '2024-07-01', location: '', track: 'BACKEND DEVELOPMENT', students: 3, tasks: 2, trainer: 'Mona El-Sayed', trainerEmail: 'mona@example.com', trainerInitial: 'M', expandedDefault: false },
    { id: 'd3', title: 'Flutter Mobile Development', status: 'upcoming', body: 'Widgets, state, and deployment to stores.', date: '2024-08-01', location: '', track: 'MOBILE DEVELOPMENT', students: 2, tasks: 1, trainer: 'Omar Hani', trainerEmail: 'omar@example.com', trainerInitial: 'O', expandedDefault: false },
  ],
  alexandria: [
    { id: 'ad1', title: 'Java Enterprise Lab', status: 'active', body: 'Spring ecosystem in a team setting.', date: '2024-09-01', location: '', track: 'BACKEND DEVELOPMENT', students: 10, tasks: 4, trainer: 'Layla Kamal', trainerEmail: 'layla@example.com', trainerInitial: 'L', expandedDefault: true },
  ],
  giza: [
    { id: 'gd1', title: 'Python for Analytics', status: 'active', body: 'From notebooks to dashboards.', date: '2024-10-01', location: '', track: 'DATA', students: 14, tasks: 5, trainer: 'Yousef Adel', trainerEmail: 'yousef@example.com', trainerInitial: 'Y', expandedDefault: true },
  ],
}

/** @param {string} branchId */
export function getBranchDetailsTrainings(branchId) {
  return detailsTrainingsByBranch[branchId] ?? detailsTrainingsByBranch.cairo
}

const trainersByBranch = {
  cairo: [
    { id: 'tr1', name: 'Ahmed Hassan', role: 'Lead Trainer · Frontend', initials: 'AH' },
    { id: 'tr2', name: 'Mona El-Sayed', role: 'Senior Trainer · Backend', initials: 'ME' },
    { id: 'tr3', name: 'Omar Hani', role: 'Trainer · Mobile', initials: 'OH' },
  ],
  alexandria: [
    { id: 'atr1', name: 'Layla Kamal', role: 'Branch Lead', initials: 'LK' },
  ],
  giza: [
    { id: 'gtr1', name: 'Yousef Adel', role: 'Data programs', initials: 'YA' },
    { id: 'gtr2', name: 'Sara Ahmed', role: 'UX mentor', initials: 'SA' },
  ],
}

/** @param {string} branchId */
export function getBranchTrainers(branchId) {
  return trainersByBranch[branchId] ?? trainersByBranch.cairo
}

/** Resolve branch id from URL param; fallback to default. */
export function normalizeBranchId(branchParam) {
  const id = (branchParam ?? '').toLowerCase()
  if (adminBranches.some((b) => b.id === id)) return id
  return DEFAULT_BRANCH_ID
}
