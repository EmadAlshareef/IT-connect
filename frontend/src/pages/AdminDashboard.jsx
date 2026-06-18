import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Code2,
  Database,
  Eye,
  ExternalLink,
  FileText,
  Info,
  Pencil,
  Search,
  Smartphone,
  Trash2,
  UserCircle,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import AdminDashboardSectionNav from '../components/AdminDashboardSectionNav.jsx'
import AdminSyncScrollTable from '../components/admin/AdminSyncScrollTable.jsx'
import { useAdminNavSlot } from '../context/AdminNavSlotContext.jsx'
import { useAuth } from '../context/useAuth.js'
import { adminTabs } from '../data/adminDashboard.js'
import { useAdminCompanyPosts } from '../hooks/useAdminCompanyPosts.js'
import { useAdminCreatedTracks } from '../hooks/useAdminCreatedTracks.js'
import { useAdminCreatedTrainings } from '../hooks/useAdminCreatedTrainings.js'
import { useCompanyTrackRequests } from '../hooks/useCompanyTrackRequests.js'
import { useCompanyPostRequests } from '../hooks/useCompanyPostRequests.js'
import { useCompanyTrainingRequests } from '../hooks/useCompanyTrainingRequests.js'
import {
  ADMIN_QUICK_ASSIGN_ROLES,
  getMemberRoleLabel,
  normalizeMemberRole,
  useRegisteredMembers,
} from '../hooks/useRegisteredMembers.js'
import {
  COMPANY_LOGO_MAX_BYTES,
  getCompanyPortalApiErrorMessage,
} from '../api/companyPortalApi.js'
import { fetchCatalogStudentCount } from '../api/catalogApi.js'
import { ENROLLMENT_APPLICATIONS_CHANGED_EVENT } from '../api/enrollmentApplicationApi.js'
import { useCompanyProfiles } from '../hooks/useCompanyProfiles.js'
import { parseCompanyTrainersSnapshot, updateCompanyTrainerLinkedTracks } from '../hooks/useCompanyTrainers.js'
import { useAdminTrackSkills } from '../hooks/useAdminTrackSkills.js'
import {
  adminBranches,
  getBranchAdminTrainings,
  getBranchDetailsTrainings,
  getBranchPosts,
  getBranchStats,
  getBranchTracks,
  normalizeBranchId,
} from '../data/adminDashboardData.js'
import { formatOverviewRelativeTime } from '../utils/formatOverviewRelativeTime.js'
import { catalogBranchMapHasApiRows } from '../utils/catalogApiMode.js'
import {
  listRealBranchTrainers,
  resolveTrainerTrackAssignment,
  trainerTrackAssignmentKeys,
} from '../utils/branchTrainerRoster.js'
import {
  CATALOG_ENROLLMENT_CHANGED_EVENT,
  countUniqueCatalogStudentsForBranch,
} from '../utils/trainingCatalogEnrollment.js'
import { getCatalogTrainingSeatStats } from '../utils/catalogTrainingSeats.js'
import { publishCompanyTrainingRequest } from '../utils/publishCompanyTraining.js'
import { listenCompanyPortalStore } from '../utils/companyPortalStore.js'
import { promoteTrackToPlatformDefaults } from '../utils/platformDefaultTracks.js'
import { purgeCompanyLinkedData } from '../utils/purgeCompanyLinkedData.js'
import { useMdUp } from '../hooks/useMdUp.js'

const trackIcon = {
  code: Code2,
  db: Database,
  mobile: Smartphone,
}

function statusBadgeClass(status) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-800/50'
    case 'APPROVED':
    case 'PUBLISHED':
      return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/50'
    case 'INTERVIEWED':
      return 'bg-sky-100 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/50 dark:text-violet-200 dark:ring-sky-800/50'
    case 'REJECTED':
      return 'bg-rose-100 text-rose-900 ring-1 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-800/50'
    case 'UNPUBLISHED':
      return 'bg-slate-200 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600'
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200'
  }
}

function trainingStatusPill(status) {
  const s = (status ?? '').toLowerCase()
  if (s === 'active')
    return 'bg-sky-100 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800/40'
  return 'bg-violet-100 text-violet-800 ring-1 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/40'
}

function initialsFromTrainerName(name) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '??'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

const statNumberClass =
  'mt-2 bg-gradient-to-br from-violet-600 to-violet-600 bg-clip-text text-3xl font-bold tabular-nums text-transparent dark:from-violet-400 dark:to-violet-400 sm:text-4xl'

const primaryOutlineBtn =
  'rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-800 transition hover:border-violet-200 hover:bg-violet-50/70 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-violet-500/40 dark:hover:bg-violet-950/40'

const ctaBtn =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/15 ring-1 ring-white/10 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 dark:shadow-black/30'

const accentAvatar =
  'bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white dark:from-violet-900 dark:via-violet-800 dark:to-violet-900'

const accentSoftSquare =
  'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300'

const accentProgress =
  'bg-gradient-to-r from-violet-600 via-violet-600 to-violet-600 dark:from-violet-500 dark:via-violet-600 dark:to-violet-600'

const chipActiveClass =
  'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-sm shadow-violet-900/15 ring-1 ring-white/10 dark:shadow-black/25'

const MAX_TRAINING_ATTACHMENT_BYTES = 2 * 1024 * 1024
const TRAINER_TRACK_ASSIGNMENTS_STORAGE_KEY = 'itconnect_trainer_track_assignments_v1'

function parseTrainerTrackAssignments() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(TRAINER_TRACK_ASSIGNMENTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistTrainerTrackAssignments(next) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TRAINER_TRACK_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

function memberRolePillClass(roleId) {
  switch (normalizeMemberRole(roleId)) {
    case 'student':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200'
    case 'trainer':
      return 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200'
    case 'company':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-violet-200'
    case 'employer':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
    case 'institution':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
    case 'admin':
      return 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
  }
}

const memberAssignBtnBase =
  'rounded-md px-2.5 py-1 text-[11px] font-semibold transition disabled:pointer-events-none disabled:opacity-40'

const memberAssignBtnIdle =
  'text-slate-600 hover:bg-white hover:text-violet-700 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-violet-300'

const memberAssignBtnActive =
  'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-violet-300 dark:ring-slate-600'

function initialsFromMemberName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return parts[0]?.slice(0, 2).toUpperCase() ?? '?'
}

function formatMemberRegisteredLabel(registeredAt) {
  if (!registeredAt) return '—'
  const d = new Date(registeredAt)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const addTrackModalInput =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950'

const addTrackModalTextarea =
  'mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950'

const addTrackSubmitBtn =
  'mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-900/15 ring-1 ring-white/10 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 disabled:pointer-events-none disabled:opacity-50 dark:shadow-black/30'

const modalSelectClass =
  'w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950'

/** Best-effort timestamp from admin-created training ids (`new-training-…-<epoch>`). */
function getTrainingCreationTs(training) {
  const id = String(training?.id ?? '')
  const m = id.match(/new-training-.+-(\d+)$/)
  return m ? Number(m[1]) : 0
}

/** Latest trainer task assign / feedback from section task storage (any section). */
function scanLatestTrainerTaskActivity() {
  if (typeof window === 'undefined') return null
  let bestTs = 0
  let label = ''
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith('section-tasks-')) continue
      const raw = localStorage.getItem(k)
      const tasks = JSON.parse(raw)
      if (!Array.isArray(tasks)) continue
      for (const t of tasks) {
        const id = String(t.id ?? '')
        const createMatch = id.match(/-task-(\d+)$/)
        if (createMatch) {
          const ts = Number(createMatch[1])
          if (ts > bestTs) {
            bestTs = ts
            label = 'Trainer · Task assigned'
          }
        }
        for (const log of t.feedbackLog ?? []) {
          const ts = Date.parse(log.sentAt ?? '')
          if (!Number.isNaN(ts) && ts > bestTs) {
            bestTs = ts
            label = 'Trainer · Task feedback'
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  return bestTs > 0 ? { ts: bestTs, label } : null
}

/**
 * Latest meaningful timestamp for this branch: company requests, admin approvals/creates, trainer roster & tasks.
 */
function computeBranchActivityPulse(branchId, ctx) {
  const {
    companyPostRequests,
    companyTrainingRequests,
    companyTrackRequests,
    createdPostsByBranch,
    createdTrainingsByBranch,
    createdTracksByBranch,
    registeredMembers,
  } = ctx

  const bid = normalizeBranchId(branchId)
  let bestTs = 0
  let label = ''

  const consider = (ts, lbl) => {
    if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return
    if (ts > bestTs) {
      bestTs = ts
      label = lbl
    }
  }

  const branchMatches = (v) => normalizeBranchId(v) === bid

  for (const r of companyPostRequests) {
    if (!branchMatches(r.branchId)) continue
    consider(Number(r.createdAt), 'Company · Post request')
    if (r.reviewedAt) {
      consider(
        Number(r.reviewedAt),
        String(r.reviewStatus ?? '').toUpperCase() === 'APPROVED' ? 'Admin · Post approved' : 'Admin · Post reviewed',
      )
    }
  }

  for (const r of companyTrainingRequests) {
    if (!branchMatches(r.branchId)) continue
    consider(Number(r.createdAt), 'Company · Training request')
    if (r.reviewedAt) {
      consider(
        Number(r.reviewedAt),
        String(r.reviewStatus ?? '').toUpperCase() === 'APPROVED' ? 'Admin · Training approved' : 'Admin · Training reviewed',
      )
    }
  }

  for (const r of companyTrackRequests) {
    if (!branchMatches(r.branchId)) continue
    consider(Number(r.createdAt), 'Company · Track request')
    if (r.reviewedAt) {
      consider(
        Number(r.reviewedAt),
        String(r.status ?? '').toUpperCase() === 'APPROVED' ? 'Admin · Track approved' : 'Admin · Track reviewed',
      )
    }
  }

  for (const p of createdPostsByBranch[bid] ?? []) {
    const m = String(p.id ?? '').match(/(\d+)$/)
    if (m) consider(Number(m[1]), 'Post · Published')
  }

  for (const tr of createdTrainingsByBranch[bid] ?? []) {
    const m = String(tr.id ?? '').match(/new-training-.+-(\d+)$/)
    if (m) consider(Number(m[1]), 'Admin · Training created')
  }

  for (const tr of createdTracksByBranch[bid] ?? []) {
    const m = String(tr.id ?? '').match(/uct-.+-(\d+)$/)
    if (m) consider(Number(m[1]), 'Admin · Track created')
  }

  for (const m of registeredMembers) {
    if (normalizeMemberRole(m.role) !== 'trainer') continue
    const ts = Date.parse(m.registeredAt ?? '')
    if (!Number.isNaN(ts)) consider(ts, 'Trainer · Registered')
  }

  const taskPulse = scanLatestTrainerTaskActivity()
  if (taskPulse) consider(taskPulse.ts, taskPulse.label)

  return bestTs > 0 ? { ts: bestTs, label } : null
}

function AdminDashboard() {
  const { trainerName, email } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const branchId = normalizeBranchId(searchParams.get('branch'))
  const branch = adminBranches.find((b) => b.id === branchId) ?? adminBranches[0]
  const { skillsByParent, skillCountForTrack } = useAdminTrackSkills()
  const { byBranch: createdTracksByBranch, addCreatedTrack, removeCreatedTrack } = useAdminCreatedTracks()
  const { byBranch: createdPostsByBranch, prependPost, removePost: removeCreatedPost } = useAdminCompanyPosts()
  const { requests: companyTrackRequests, setRequestStatus } = useCompanyTrackRequests()
  const { requests: companyTrainingRequests, setRequestStatus: setTrainingRequestStatus } = useCompanyTrainingRequests()
  const { requests: companyPostRequests, setRequestStatus: setPostRequestStatus } = useCompanyPostRequests()
  const { byBranch: createdTrainingsByBranch, prependTraining, removeTraining, updateTraining, refreshFromApi: refreshTrainingsFromApi } =
    useAdminCreatedTrainings()
  const {
    members: registeredMembers,
    removeMember,
    updateMemberRole,
    refreshFromApi: refreshMembersFromApi,
    isLoading: membersLoading,
    loadError: membersLoadError,
  } = useRegisteredMembers()
  const { companies, addCompany, updateCompany, removeCompany } = useCompanyProfiles()

  const tabParam = searchParams.get('tab')
  const activeTab =
    tabParam && adminTabs.some((t) => t.id === tabParam) ? tabParam : 'overview'

  useEffect(() => {
    if (activeTab === 'members') {
      void refreshMembersFromApi()
    }
  }, [activeTab, refreshMembersFromApi])

  const goToTab = (tabId) => {
    setSearchParams({ branch: branchId, tab: tabId }, { replace: true })
  }
  const [postFilter, setPostFilter] = useState('all')
  const [trainFilter, setTrainFilter] = useState('all')
  const [detailsSearch, setDetailsSearch] = useState('')
  const [expandedDetails, setExpandedDetails] = useState(() => new Set())
  const [isAddTrackModalOpen, setIsAddTrackModalOpen] = useState(false)
  const [addTrackError, setAddTrackError] = useState('')
  const [addTrackForm, setAddTrackForm] = useState({
    trackName: '',
    description: '',
  })
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false)
  /** Seed post ids removed per branch (mock data only). */
  const [deletedSeedPostIdsByBranch, setDeletedSeedPostIdsByBranch] = useState(() => ({}))
  const [createPostForm, setCreatePostForm] = useState({
    title: '',
    status: 'PUBLISHED',
    trainingId: '',
    content: '',
    skills: '',
    deadline: '',
  })
  const [isCreateTrainingModalOpen, setIsCreateTrainingModalOpen] = useState(false)
  const [selectedTrackRequest, setSelectedTrackRequest] = useState(null)
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false)
  const [editingCompanyId, setEditingCompanyId] = useState(null)
  const [addCompanyError, setAddCompanyError] = useState('')
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [addCompanyForm, setAddCompanyForm] = useState({
    companyName: '',
    industry: '',
    logoUrl: '',
    location: '',
    vision: '',
    contactEmail: '',
    description: '',
  })
  /** When set, training modal saves updates instead of creating a row. */
  const [editingTrainingId, setEditingTrainingId] = useState(null)
  /** Trainer -> selected track type (persisted). */
  const [trainerTrackById, setTrainerTrackById] = useState(parseTrainerTrackAssignments)
  /** Bumps when trainer section tasks change (same-tab localStorage writes). */
  const [sectionTasksTick, setSectionTasksTick] = useState(0)
  /** Re-read catalog enrollment counts from localStorage. */
  const [catalogEnrollmentTick, setCatalogEnrollmentTick] = useState(0)
  const [apiStudentCount, setApiStudentCount] = useState(null)
  /** Bumps when companies add/edit trainers (same-tab). */
  const [companyTrainersTick, setCompanyTrainersTick] = useState(0)
  /** Resets optional file input when reopening the modal. */
  const [trainingDocumentInputKey, setTrainingDocumentInputKey] = useState(0)
  /** Seed training ids hidden per branch (mock catalog only). */
  const [deletedSeedTrainingIdsByBranch, setDeletedSeedTrainingIdsByBranch] = useState(() => ({}))
  /** Seed track ids hidden per branch (mock catalog only). */
  const [deletedSeedTrackIdsByBranch, setDeletedSeedTrackIdsByBranch] = useState(() => ({}))
  const [createTrainingError, setCreateTrainingError] = useState('')
  const [createTrainingForm, setCreateTrainingForm] = useState({
    title: '',
    body: '',
    /** Parent track from Track Management (required when branch has tracks). */
    trackId: '',
    date: '',
    trainer: '',
    seatsTotal: '20',
    status: 'active',
    /** Optional attachment: display name + base64 data URL for opening in browser. */
    documentFileName: '',
    documentDataUrl: '',
  })

  const setBranchId = (nextId) => {
    setIsAddTrackModalOpen(false)
    setIsCreatePostModalOpen(false)
    setIsCreateTrainingModalOpen(false)
    setSelectedTrackRequest(null)
    setEditingTrainingId(null)
    setSearchParams({ branch: nextId, tab: activeTab }, { replace: true })
  }

  const stats = useMemo(() => {
    const base = getBranchStats(branchId)
    return {
      ...base,
      totalStudents: apiStudentCount ?? countUniqueCatalogStudentsForBranch(branchId),
    }
  }, [branchId, catalogEnrollmentTick, apiStudentCount])
  const tracks = useMemo(() => {
    const created = createdTracksByBranch[branchId] ?? []
    const hasApiRows = Object.values(createdTracksByBranch).some(
      (list) => Array.isArray(list) && list.length > 0,
    )
    if (hasApiRows) return created
    const seed = getBranchTracks(branchId)
    const hidden = new Set(deletedSeedTrackIdsByBranch[branchId] ?? [])
    const visibleSeed = seed.filter((tr) => !hidden.has(tr.id))
    return [...created, ...visibleSeed]
  }, [branchId, createdTracksByBranch, deletedSeedTrackIdsByBranch])
  const pendingCompanyTrackRequests = useMemo(
    () => companyTrackRequests.filter((req) => req.status === 'PENDING' && normalizeBranchId(req.branchId) === branchId),
    [companyTrackRequests, branchId],
  )
  const pendingCompanyTrainingRequests = useMemo(
    () => companyTrainingRequests.filter((req) => req.reviewStatus === 'PENDING' && normalizeBranchId(req.branchId) === branchId),
    [companyTrainingRequests, branchId],
  )
  const pendingCompanyPostRequests = useMemo(
    () => companyPostRequests.filter((req) => req.reviewStatus === 'PENDING' && normalizeBranchId(req.branchId) === branchId),
    [companyPostRequests, branchId],
  )

  const overviewActivityPulse = useMemo(
    () =>
      computeBranchActivityPulse(branchId, {
        companyPostRequests,
        companyTrainingRequests,
        companyTrackRequests,
        createdPostsByBranch,
        createdTrainingsByBranch,
        createdTracksByBranch,
        registeredMembers,
      }),
    [
      branchId,
      companyPostRequests,
      companyTrainingRequests,
      companyTrackRequests,
      createdPostsByBranch,
      createdTrainingsByBranch,
      createdTracksByBranch,
      registeredMembers,
      sectionTasksTick,
    ],
  )

  useEffect(() => {
    const bump = () => setSectionTasksTick((n) => n + 1)
    window.addEventListener('itconnect-section-tasks-updated', bump)
    return () => window.removeEventListener('itconnect-section-tasks-updated', bump)
  }, [])

  useEffect(() => {
    const bump = () => setCatalogEnrollmentTick((n) => n + 1)
    window.addEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, bump)
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, bump)
      window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, bump)
      window.removeEventListener('storage', bump)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchCatalogStudentCount(branchId)
      .then((count) => {
        if (!cancelled) setApiStudentCount(count)
      })
      .catch(() => {
        if (!cancelled) setApiStudentCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [branchId, catalogEnrollmentTick])

  useEffect(() => {
    const bump = () => setCompanyTrainersTick((n) => n + 1)
    return listenCompanyPortalStore(bump)
  }, [])

  const companyNameByContactEmail = useMemo(() => {
    const m = new Map()
    for (const c of companies) {
      const e = String(c.contactEmail ?? '').trim().toLowerCase()
      if (e) m.set(e, String(c.companyName ?? '').trim() || e)
    }
    return m
  }, [companies])

  const companyAddedTrainersPreview = useMemo(() => {
    companyTrainersTick // subscribe to updates
    const rows = parseCompanyTrainersSnapshot()
    const sorted = [...rows].sort((a, b) => {
      const tb = Date.parse(b.createdAt ?? '') || 0
      const ta = Date.parse(a.createdAt ?? '') || 0
      return tb - ta
    })
    return sorted.slice(0, 8).map((row) => {
      const ce = String(row.companyEmail ?? '').trim().toLowerCase()
      return {
        ...row,
        companyDisplayName: (companyNameByContactEmail.get(ce) ?? ce) || 'Company',
      }
    })
  }, [companyNameByContactEmail, companyTrainersTick])

  const companyAddedTrainersTotal = useMemo(() => {
    companyTrainersTick
    return parseCompanyTrainersSnapshot().length
  }, [companyTrainersTick])

  const tracksFlatOrdered = useMemo(() => {
    const sortKey = (tr) => (tr.skillsName ?? tr.title ?? '').toLowerCase()
    return [...tracks].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  }, [tracks])
  const trainerTrackOptions = useMemo(() => {
    const names = tracksFlatOrdered.map((tr) => (tr.skillsName ?? tr.title ?? '').trim()).filter(Boolean)
    return [...new Set(names)]
  }, [tracksFlatOrdered])
  const seedPosts = useMemo(() => getBranchPosts(branchId), [branchId])
  const posts = useMemo(() => {
    const api = createdPostsByBranch[branchId] ?? []
    const hasApiRows = Object.values(createdPostsByBranch).some(
      (list) => Array.isArray(list) && list.length > 0,
    )
    if (hasApiRows) return api
    const hidden = new Set(deletedSeedPostIdsByBranch[branchId] ?? [])
    const visibleSeed = seedPosts.filter((p) => !hidden.has(p.id))
    return [...api, ...visibleSeed]
  }, [branchId, seedPosts, createdPostsByBranch, deletedSeedPostIdsByBranch])
  const seedAdminTrainings = useMemo(() => getBranchAdminTrainings(branchId), [branchId])
  const adminTrainings = useMemo(() => {
    const extra = createdTrainingsByBranch[branchId] ?? []
    const hasApiRows = Object.values(createdTrainingsByBranch).some(
      (list) => Array.isArray(list) && list.length > 0,
    )
    if (hasApiRows) return extra
    const hidden = new Set(deletedSeedTrainingIdsByBranch[branchId] ?? [])
    const visibleSeed = seedAdminTrainings.filter((t) => !hidden.has(t.id))
    return [...extra, ...visibleSeed]
  }, [branchId, createdTrainingsByBranch, seedAdminTrainings, deletedSeedTrainingIdsByBranch])
  const activeTrainingsCountForOverview = useMemo(
    () => adminTrainings.filter((t) => (t.status ?? '').toLowerCase() === 'active').length,
    [adminTrainings],
  )

  const latestAddedTrainingOverview = useMemo(() => {
    if (adminTrainings.length === 0) return null
    const sorted = [...adminTrainings].sort((a, b) => {
      const d = getTrainingCreationTs(b) - getTrainingCreationTs(a)
      if (d !== 0) return d
      return String(a.title ?? '').localeCompare(String(b.title ?? ''), undefined, { sensitivity: 'base' })
    })
    const training = sorted[0]
    const tr = tracks.find((x) => x.id === training.linkedTrackId)
    const trackLabel = tr ? String(tr.skillsName ?? tr.title ?? '').trim() : ''
    return {
      training,
      ts: getTrainingCreationTs(training),
      trackLabel,
    }
  }, [adminTrainings, tracks])

  /** Active trainings only, newest created first (id suffix), capped for overview. */
  const overviewActiveTrainingRows = useMemo(() => {
    const active = adminTrainings.filter((t) => (t.status ?? '').toLowerCase() === 'active')
    const mapped = active.map((t) => {
      const stats = getCatalogTrainingSeatStats(branchId, t.id)
      const taken = stats.taken
      const total = stats.total
      const progress = Math.round((taken / total) * 100)
      const tr = tracks.find((x) => x.id === t.linkedTrackId)
      const trackPart = tr ? String(tr.skillsName ?? tr.title ?? '').trim() : ''
      const label = trackPart ? `${trackPart} · ${t.title}` : String(t.title ?? '')
      return {
        id: t.id,
        label,
        trainerLine: `Trainer · ${String(t.trainer ?? '').trim() || '—'}`,
        studentsCount: taken,
        progress,
        ts: getTrainingCreationTs(t),
      }
    })
    mapped.sort((a, b) => {
      if (b.ts !== a.ts) return b.ts - a.ts
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    })
    return mapped.slice(0, 6)
  }, [adminTrainings, tracks, branchId, catalogEnrollmentTick])

  const trainingCountsByTrackId = useMemo(() => {
    const counts = {}
    for (const t of adminTrainings) {
      if (!t.linkedTrackId) continue
      if (!counts[t.linkedTrackId]) counts[t.linkedTrackId] = { total: 0, active: 0 }
      counts[t.linkedTrackId].total += 1
      if ((t.status ?? '').toLowerCase() === 'active') counts[t.linkedTrackId].active += 1
    }
    return counts
  }, [adminTrainings])
  /** Track names added via “Create New Track” + catalog trainings — both appear under Link to Training. */
  const postTrainingChoices = useMemo(() => {
    const fromSavedSkills = []
    for (const tr of tracks) {
      for (const sk of skillsByParent[tr.id] ?? []) {
        fromSavedSkills.push({
          id: `saved-skill-${sk.id}`,
          title: sk.skillsName,
        })
      }
    }
    return [...fromSavedSkills, ...adminTrainings]
  }, [tracks, skillsByParent, adminTrainings])
  /** Group by Track Management parent: optgroup label = track name, options = trainings (and saved skills) under that track. */
  const createPostTrainingGroups = useMemo(() => {
    const trackIds = new Set(tracks.map((tr) => tr.id))
    const groups = []

    for (const track of tracks) {
      const label = String(track.skillsName ?? track.title ?? '').trim() || 'Untitled track'
      const fromTrainings = adminTrainings.filter((t) => t.linkedTrackId === track.id)
      const merged = [...fromTrainings].sort((a, b) =>
        String(a.title ?? '').localeCompare(String(b.title ?? ''), undefined, { sensitivity: 'base' }),
      )
      if (merged.length > 0) groups.push({ key: track.id, label, trainings: merged })
    }

    const unlinked = adminTrainings.filter((t) => !t.linkedTrackId || !trackIds.has(t.linkedTrackId))
    if (unlinked.length > 0) {
      const sortUnlinked = [...unlinked].sort((a, b) =>
        String(a.title ?? '').localeCompare(String(b.title ?? ''), undefined, { sensitivity: 'base' }),
      )
      const fallbackLabel = tracks.length === 0 ? 'Trainings' : 'Not linked to a track'
      groups.push({ key: '__unlinked_trainings', label: fallbackLabel, trainings: sortUnlinked })
    }

    return groups
  }, [tracks, skillsByParent, adminTrainings])
  const detailsRows = useMemo(() => getBranchDetailsTrainings(branchId), [branchId])
  const trainers = useMemo(
    () => listRealBranchTrainers(branchId, { trainings: adminTrainings }),
    [branchId, adminTrainings, companyTrainersTick, registeredMembers],
  )
  const trainerTrackSelectOptions = useMemo(() => {
    const options = new Set(trainerTrackOptions)
    for (const trainer of trainers) {
      for (const title of trainer.linkedTrackTitles ?? []) {
        const trimmed = String(title ?? '').trim()
        if (trimmed) options.add(trimmed)
      }
    }
    return [...options].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [trainerTrackOptions, trainers])
  const platformTrainers = useMemo(
    () => trainers.filter((trainer) => trainer.source !== 'company'),
    [trainers],
  )
  const companyTrainers = useMemo(
    () => trainers.filter((trainer) => trainer.source === 'company'),
    [trainers],
  )
  const companyMembers = useMemo(
    () => registeredMembers.filter((m) => normalizeMemberRole(m.role) === 'company'),
    [registeredMembers],
  )
  const companyMemberEmailOptions = useMemo(() => {
    const profileByEmail = new Map()
    for (const c of companies) {
      const e = String(c.contactEmail ?? '').trim().toLowerCase()
      if (e) profileByEmail.set(e, c)
    }
    return companyMembers
      .map((m) => {
        const email = (m.email ?? '').trim().toLowerCase()
        if (!email) return null
        const linked = profileByEmail.get(email)
        return {
          email,
          fullName: String(m.fullName ?? '').trim() || email,
          memberId: m.id,
          linkedCompanyName: linked ? String(linked.companyName ?? '').trim() || 'Company profile' : null,
          isAvailable: !linked,
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [companyMembers, companies])

  const editingCompanyContactEmail = useMemo(() => {
    if (!editingCompanyId) return ''
    const row = companies.find((c) => c.id === editingCompanyId)
    return String(row?.contactEmail ?? '').trim().toLowerCase()
  }, [companies, editingCompanyId])

  const selectableCompanyMemberEmails = useMemo(
    () =>
      companyMemberEmailOptions.filter(
        (opt) => opt.isAvailable || (editingCompanyId && opt.email === editingCompanyContactEmail),
      ),
    [companyMemberEmailOptions, editingCompanyId, editingCompanyContactEmail],
  )

  const filteredPosts = useMemo(() => {
    if (postFilter === 'all') return posts
    if (postFilter === 'published') return posts.filter((p) => p.status === 'PUBLISHED')
    if (postFilter === 'pending') return posts.filter((p) => p.status === 'PENDING')
    return posts
  }, [posts, postFilter])

  const adminTrainingsWithLiveSeats = useMemo(
    () =>
      adminTrainings.map((t) => {
        const stats = getCatalogTrainingSeatStats(branchId, t.id)
        return { ...t, seatsTaken: stats.taken, seatsTotal: stats.total }
      }),
    [adminTrainings, branchId, catalogEnrollmentTick],
  )

  const filteredAdminTrainings = useMemo(() => {
    if (trainFilter === 'all') return adminTrainingsWithLiveSeats
    return adminTrainingsWithLiveSeats.filter((t) => t.linkedTrackId === trainFilter)
  }, [adminTrainingsWithLiveSeats, trainFilter])

  const filteredDetails = useMemo(() => {
    const q = detailsSearch.trim().toLowerCase()
    if (!q) return detailsRows
    return detailsRows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.track.toLowerCase().includes(q) ||
        (r.trainer ?? '').toLowerCase().includes(q),
    )
  }, [detailsRows, detailsSearch])

  const statCards = useMemo(
    () => [
      { key: 'students', label: 'Total Students', value: stats.totalStudents, Icon: Users },
      {
        key: 'trainers',
        label: 'Trainers',
        /** Roster + company trainers + trainers assigned on branch catalog trainings. */
        value: trainers.length,
        Icon: UserCircle,
      },
      { key: 'posts', label: 'Posts', value: posts.length, Icon: FileText },
      { key: 'applications', label: 'Pending Applications', value: stats.pendingApplications, Icon: UserPlus },
    ],
    [stats.totalStudents, stats.pendingApplications, trainers.length, posts.length],
  )

  const postCounts = useMemo(() => {
    const all = posts.length
    const published = posts.filter((p) => p.status === 'PUBLISHED').length
    const pending = posts.filter((p) => p.status === 'PENDING').length
    return { all, published, pending }
  }, [posts])

  const trainingTrackFilterChips = useMemo(() => {
    const all = adminTrainings.length
    const trackChips = tracksFlatOrdered.map((tr) => {
      const name = tr.skillsName ?? tr.title
      const n = adminTrainings.filter((t) => t.linkedTrackId === tr.id).length
      return { id: tr.id, label: `${name} (${n})` }
    })
    return [{ id: 'all', label: `All (${all})` }, ...trackChips]
  }, [adminTrainings, tracksFlatOrdered])

  const toggleDetail = (id) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    const rows = getBranchDetailsTrainings(branchId)
    setExpandedDetails(new Set(rows.filter((r) => r.expandedDefault).map((r) => r.id)))
  }, [branchId])

  useEffect(() => {
    const validTrackIds = new Set(tracksFlatOrdered.map((t) => t.id))
    setTrainFilter((prev) => {
      if (prev === 'all') return 'all'
      return validTrackIds.has(prev) ? prev : 'all'
    })
  }, [branchId, tracksFlatOrdered])

  const openAddTrackModal = () => {
    setAddTrackError('')
    setAddTrackForm({ trackName: '', description: '' })
    setIsAddTrackModalOpen(true)
  }

  const closeAddTrackModal = () => {
    setAddTrackError('')
    setIsAddTrackModalOpen(false)
  }

  const openCreatePostModal = () => {
    setCreatePostForm({
      title: '',
      status: 'PUBLISHED',
      trainingId: '',
      content: '',
      skills: '',
      deadline: '',
    })
    setIsCreatePostModalOpen(true)
  }

  const closeCreatePostModal = () => setIsCreatePostModalOpen(false)

  const openCreateTrainingModal = () => {
    setCreateTrainingError('')
    setEditingTrainingId(null)
    const defaultTrackId = tracksFlatOrdered[0]?.id ?? ''
    setCreateTrainingForm({
      title: '',
      body: '',
      trackId: defaultTrackId,
      date: '',
      trainer: trainerName?.trim() ?? '',
      seatsTotal: '20',
      status: 'active',
      documentFileName: '',
      documentDataUrl: '',
    })
    setTrainingDocumentInputKey((k) => k + 1)
    setIsCreateTrainingModalOpen(true)
  }

  const openEditTrainingModal = (t) => {
    const createdList = createdTrainingsByBranch[branchId] ?? []
    if (!createdList.some((row) => row.id === t.id)) return

    setCreateTrainingError('')
    const trackId =
      t.linkedTrackId && tracks.some((tr) => tr.id === t.linkedTrackId) ? t.linkedTrackId : tracksFlatOrdered[0]?.id ?? ''

    setEditingTrainingId(t.id)
    setCreateTrainingForm({
      title: t.title ?? '',
      body: t.body ?? '',
      trackId,
      date: t.date ?? '',
      trainer: t.trainer ?? '',
      seatsTotal: String(t.seatsTotal ?? 20),
      status: t.status === 'upcoming' ? 'upcoming' : 'active',
      documentFileName: t.attachedDocumentName ?? '',
      documentDataUrl: t.attachedDocumentDataUrl ?? '',
    })
    setTrainingDocumentInputKey((k) => k + 1)
    setIsCreateTrainingModalOpen(true)
  }

  const closeCreateTrainingModal = () => {
    setIsCreateTrainingModalOpen(false)
    setEditingTrainingId(null)
    setCreateTrainingError('')
  }

  const openAddCompanyModal = () => {
    setEditingCompanyId(null)
    setAddCompanyError('')
    setAddCompanyForm({
      companyName: '',
      industry: '',
      logoUrl: '',
      location: '',
      vision: '',
      contactEmail: '',
      description: '',
    })
    setIsAddCompanyModalOpen(true)
  }

  const closeAddCompanyModal = () => {
    setEditingCompanyId(null)
    setAddCompanyError('')
    setIsSavingCompany(false)
    setIsAddCompanyModalOpen(false)
  }

  const openEditCompanyModal = (company) => {
    if (!company?.id) return
    setEditingCompanyId(company.id)
    setAddCompanyError('')
    setAddCompanyForm({
      companyName: company.companyName ?? '',
      industry: company.industry ?? '',
      logoUrl: company.logoUrl ?? '',
      location: company.location ?? '',
      vision: company.vision ?? '',
      contactEmail: company.contactEmail ?? '',
      description: company.description ?? '',
    })
    setIsAddCompanyModalOpen(true)
  }

  const openAddCompanyModalForMember = (member) => {
    const email = String(member?.email ?? '').trim().toLowerCase()
    if (!email) return
    const existing = companies.find((c) => String(c.contactEmail ?? '').trim().toLowerCase() === email)
    if (existing) {
      openEditCompanyModal(existing)
      return
    }
    setEditingCompanyId(null)
    setAddCompanyError('')
    setAddCompanyForm({
      companyName: String(member?.fullName ?? '').trim(),
      industry: '',
      logoUrl: '',
      location: '',
      vision: '',
      contactEmail: email,
      description: '',
    })
    setIsAddCompanyModalOpen(true)
  }

  const handleCompanyContactEmailChange = (event) => {
    const email = event.target.value.trim().toLowerCase()
    const member = companyMembers.find((m) => (m.email ?? '').trim().toLowerCase() === email)
    setAddCompanyForm((prev) => ({
      ...prev,
      contactEmail: email,
      companyName: member && !prev.companyName.trim() ? String(member.fullName ?? '').trim() : prev.companyName,
    }))
  }

  const deleteCompanyProfile = async (company) => {
    if (!company?.id) return
    const label = String(company.companyName ?? 'this company').trim() || 'this company'
    const contactEmail = String(company.contactEmail ?? '').trim().toLowerCase()
    if (
      !window.confirm(
        `Remove "${label}" and all trainings linked to this company account (${contactEmail || 'no email'})? They will be removed from Services and the company will no longer appear on the public Companies page.`,
      )
    ) {
      return
    }
    await purgeCompanyLinkedData(contactEmail)
    const removed = await removeCompany(company.id)
    if (!removed) return
    if (editingCompanyId === company.id) {
      closeAddCompanyModal()
    }
  }

  const handleAddCompany = async (event) => {
    event.preventDefault()
    if (isSavingCompany) return

    setAddCompanyError('')
    const companyName = addCompanyForm.companyName.trim()
    if (!companyName) {
      setAddCompanyError('Company name is required.')
      return
    }
    const normalizedContactEmail = (addCompanyForm.contactEmail ?? '').trim().toLowerCase()
    if (!normalizedContactEmail) {
      setAddCompanyError('Select a company member email to link this profile.')
      return
    }
    if (!companyMemberEmailOptions.some((opt) => opt.email === normalizedContactEmail)) {
      setAddCompanyError('Contact email must belong to a registered company member.')
      return
    }
    const duplicateProfile = companies.find(
      (c) => String(c.contactEmail ?? '').trim().toLowerCase() === normalizedContactEmail && c.id !== editingCompanyId,
    )
    if (duplicateProfile) {
      setAddCompanyError(
        `This email is already linked to “${duplicateProfile.companyName}”. Edit that profile or pick another member.`,
      )
      return
    }

    const payload = {
      companyName,
      industry: addCompanyForm.industry,
      logoUrl: addCompanyForm.logoUrl,
      location: addCompanyForm.location,
      vision: addCompanyForm.vision,
      contactEmail: normalizedContactEmail,
      description: addCompanyForm.description,
    }

    setIsSavingCompany(true)
    try {
      const created = editingCompanyId ? await updateCompany(editingCompanyId, payload) : await addCompany(payload)
      if (!created) {
        setAddCompanyError(
          editingCompanyId
            ? 'Could not update company details. Refresh the page and try again.'
            : 'Could not add company details.',
        )
        return
      }
      closeAddCompanyModal()
    } catch (error) {
      setAddCompanyError(
        getCompanyPortalApiErrorMessage(
          error,
          editingCompanyId ? 'Could not update company details.' : 'Could not add company details.',
        ),
      )
    } finally {
      setIsSavingCompany(false)
    }
  }

  const handleSaveTraining = async (event) => {
    event.preventDefault()
    setCreateTrainingError('')
    const title = createTrainingForm.title.trim()
    const trainer = createTrainingForm.trainer.trim()
    if (!title || !trainer) {
      setCreateTrainingError('Title and trainer are required.')
      return
    }

    const selectedTrack = tracks.find((tr) => tr.id === createTrainingForm.trackId)
    const hasCatalogTracks = tracksFlatOrdered.length > 0
    if (hasCatalogTracks && !selectedTrack) {
      setCreateTrainingError('Select a track for this training.')
      return
    }

    let dateStr = createTrainingForm.date.trim()
    if (!dateStr) {
      dateStr = new Date().toISOString().slice(0, 10)
    }

    const seatsTotal = Math.max(1, Number.parseInt(createTrainingForm.seatsTotal, 10) || 20)

    const attachedDocumentName = createTrainingForm.documentFileName?.trim()
    const attachedDocumentDataUrl = createTrainingForm.documentDataUrl?.trim()

    if (editingTrainingId) {
      const existing = (createdTrainingsByBranch[branchId] ?? []).find((row) => row.id === editingTrainingId)
      if (!existing) return

      const merged = {
        ...existing,
        title,
        body: createTrainingForm.body.trim() || 'No description provided.',
        date: dateStr,
        trainer,
        initials: initialsFromTrainerName(trainer),
        seatsTotal,
        status: createTrainingForm.status === 'upcoming' ? 'upcoming' : 'active',
      }

      if (selectedTrack) {
        merged.linkedTrackId = selectedTrack.id
        merged.linkedTrackTitle = selectedTrack.skillsName ?? selectedTrack.title
      } else {
        delete merged.linkedTrackId
        delete merged.linkedTrackTitle
      }

      if (attachedDocumentName && attachedDocumentDataUrl) {
        merged.attachedDocumentName = attachedDocumentName
        merged.attachedDocumentDataUrl = attachedDocumentDataUrl
      } else {
        delete merged.attachedDocumentName
        delete merged.attachedDocumentDataUrl
      }

      try {
        await updateTraining(branchId, editingTrainingId, merged)
        closeCreateTrainingModal()
      } catch {
        setCreateTrainingError('Could not save training. Sign in as admin and ensure the backend is running.')
      }
      return
    }

    const newTraining = {
      id: `new-training-${branchId}-${Date.now()}`,
      title,
      body: createTrainingForm.body.trim() || 'No description provided.',
      date: dateStr,
      startDate: dateStr,
      trainer,
      initials: initialsFromTrainerName(trainer),
      seatsTaken: 0,
      seatsTotal,
      status: createTrainingForm.status === 'upcoming' ? 'upcoming' : 'active',
      ...(selectedTrack
        ? {
            trackId: selectedTrack.id,
            linkedTrackId: selectedTrack.id,
            linkedTrackTitle: selectedTrack.skillsName ?? selectedTrack.title,
          }
        : {}),
      ...(attachedDocumentName ? { attachedDocumentName } : {}),
      ...(attachedDocumentName && attachedDocumentDataUrl ? { attachedDocumentDataUrl } : {}),
    }

    try {
      await prependTraining(branchId, newTraining)
      closeCreateTrainingModal()
    } catch {
      setCreateTrainingError('Could not save training. Sign in as admin and ensure the backend is running.')
    }
  }

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    const removed = await removeCreatedPost(branchId, postId)
    if (removed || catalogBranchMapHasApiRows(createdPostsByBranch)) return
    setDeletedSeedPostIdsByBranch((prev) => {
      const ids = prev[branchId] ?? []
      if (ids.includes(postId)) return prev
      return { ...prev, [branchId]: [...ids, postId] }
    })
  }

  const deleteTraining = async (trainingId) => {
    if (!window.confirm('Remove this training? This cannot be undone.')) return
    const removed = await removeTraining(branchId, trainingId)
    if (removed || catalogBranchMapHasApiRows(createdTrainingsByBranch)) return
    setDeletedSeedTrainingIdsByBranch((prev) => {
      const ids = prev[branchId] ?? []
      if (ids.includes(trainingId)) return prev
      return { ...prev, [branchId]: [...ids, trainingId] }
    })
  }

  const handleCreatePost = async (event) => {
    event.preventDefault()
    const title = createPostForm.title.trim()
    if (!title || !createPostForm.trainingId) return

    const training = postTrainingChoices.find((t) => t.id === createPostForm.trainingId)
    const trainingTitle = training?.title ?? 'Training'
    const tags = createPostForm.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    let deadlineLabel = createPostForm.deadline
    if (createPostForm.deadline) {
      const d = new Date(`${createPostForm.deadline}T12:00:00`)
      if (!Number.isNaN(d.getTime())) deadlineLabel = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } else {
      deadlineLabel = 'TBD'
    }

    const newPost = {
      id: `new-${branchId}-${Date.now()}`,
      title,
      status: createPostForm.status === 'PENDING' ? 'PENDING' : 'PUBLISHED',
      body: createPostForm.content.trim() || 'No description provided.',
      trainingId: createPostForm.trainingId,
      training: trainingTitle,
      deadline: deadlineLabel,
      deadlineRaw: createPostForm.deadline || null,
      applicants: 0,
      tags: tags.length ? tags : ['General'],
    }

    await prependPost(branchId, newPost)
    closeCreatePostModal()
  }

  const handleCreateTrack = async (event) => {
    event.preventDefault()
    const trackName = addTrackForm.trackName.trim()
    if (!trackName) return
    setAddTrackError('')
    const created = await addCreatedTrack(branchId, {
      title: trackName,
      description: addTrackForm.description,
    })
    promoteTrackToPlatformDefaults({
      title: trackName,
      description: addTrackForm.description,
      branchId,
      approvedTrackId: created?.id ?? '',
    })
    closeAddTrackModal()
    goToTab('tracks')
  }

  const approveCompanyTrackRequest = async (request) => {
    const created = await addCreatedTrack(branchId, {
      title: request.title,
      description: request.description,
    })
    promoteTrackToPlatformDefaults({
      title: request.title,
      description: request.description,
      branchId,
      companyRequestId: request.id,
      approvedTrackId: created?.id ?? '',
    })
    await setRequestStatus(request.id, 'APPROVED', trainerName || email || 'Admin', { approvedTrackId: created?.id ?? '' })
  }

  const rejectCompanyTrackRequest = async (requestId) => {
    await setRequestStatus(requestId, 'REJECTED', trainerName || email || 'Admin')
  }

  const approveCompanyTrainingRequest = async (request) => {
    const trainerLabel = String(request.trainer ?? '').trim()
    const trainerEmail = String(request.trainerEmail ?? '').trim().toLowerCase()
    if (!trainerLabel || !trainerEmail) {
      window.alert('This training has no linked trainer. Ask the company to assign a trainer before approval.')
      return
    }
    const publishedTrainingId = publishCompanyTrainingRequest({
      ...request,
      branchId: request.branchId || branchId,
      createdAt: request.createdAt || Date.now(),
    })
    await setTrainingRequestStatus(request.id, 'APPROVED', trainerName || email || 'Admin', { publishedTrainingId })
  }

  const rejectCompanyTrainingRequest = async (requestId) => {
    await setTrainingRequestStatus(requestId, 'REJECTED', trainerName || email || 'Admin')
  }

  const approveCompanyPostRequest = async (request) => {
    const tags = String(request.skillsRaw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    let deadlineLabel = 'TBD'
    if (request.deadline) {
      const d = new Date(`${request.deadline}T12:00:00`)
      if (!Number.isNaN(d.getTime())) {
        deadlineLabel = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      }
    }
    const reqTitle = String(request.trainingTitle ?? '').trim()
    const trainingMatch = adminTrainings.find((t) => String(t.title ?? '').trim() === reqTitle)
    const trainingTitle = trainingMatch?.title ?? reqTitle

    const newPost = {
      id: `company-post-${branchId}-${Date.now()}`,
      title: request.title,
      status: 'PUBLISHED',
      body: request.body || 'No description provided.',
      trainingId: trainingMatch?.id ?? '',
      training: trainingTitle,
      deadline: deadlineLabel,
      applicants: 0,
      tags: tags.length ? tags : ['General'],
    }

    await prependPost(branchId, { ...newPost, deadlineRaw: request.deadline ?? null })
    await setPostRequestStatus(request.id, 'APPROVED', trainerName || email || 'Admin')
    setPostFilter('published')
  }

  const rejectCompanyPostRequest = async (requestId) => {
    await setPostRequestStatus(requestId, 'REJECTED', trainerName || email || 'Admin')
  }

  const deleteTrack = async (trackId, trackName) => {
    if (!window.confirm(`Delete track "${trackName}"? This cannot be undone.`)) return
    const removed = await removeCreatedTrack(branchId, trackId)
    if (removed || catalogBranchMapHasApiRows(createdTracksByBranch)) return
    setDeletedSeedTrackIdsByBranch((prev) => {
      const ids = prev[branchId] ?? []
      if (ids.includes(trackId)) return prev
      return { ...prev, [branchId]: [...ids, trackId] }
    })
  }

  const assignTrainerTrack = (trainer, trackName) => {
    const track = String(trackName ?? '').trim()
    setTrainerTrackById((prev) => {
      const next = { ...prev }
      for (const key of trainerTrackAssignmentKeys(trainer)) {
        next[key] = track
      }
      persistTrainerTrackAssignments(next)
      return next
    })

    const companyTrainerId =
      trainer.companyTrainerId ||
      (String(trainer.id ?? '').startsWith('co-tr-') ? String(trainer.id) : '')
    if (companyTrainerId && track) {
      void updateCompanyTrainerLinkedTracks(companyTrainerId, [track])
    }
  }

  useEffect(() => {
    if (trainerTrackSelectOptions.length === 0 || trainers.length === 0) return
    const defaultTrack = trainerTrackSelectOptions[0]
    setTrainerTrackById((prev) => {
      let changed = false
      const next = { ...prev }
      for (const trainer of trainers) {
        const resolved = resolveTrainerTrackAssignment(trainer, next, trainerTrackSelectOptions)
        if (resolved) {
          for (const key of trainerTrackAssignmentKeys(trainer)) {
            if (!next[key]) {
              next[key] = resolved
              changed = true
            }
          }
          continue
        }
        for (const key of trainerTrackAssignmentKeys(trainer)) {
          if (!next[key]) {
            next[key] = defaultTrack
            changed = true
          }
        }
      }
      if (changed) persistTrainerTrackAssignments(next)
      return changed ? next : prev
    })
  }, [trainers, trainerTrackSelectOptions])

  const { slot: adminNavMount } = useAdminNavSlot()
  const mdUp = useMdUp()
  const adminNavInShell = Boolean(adminNavMount && mdUp)

  const adminSectionNav = (
    <AdminDashboardSectionNav
      placement={adminNavInShell ? 'shell' : 'inline'}
      activeTab={activeTab}
      onSelectTab={goToTab}
      trainers={trainers}
      overviewActivityPulse={overviewActivityPulse}
      latestAddedTrainingOverview={latestAddedTrainingOverview}
      adminTrainings={adminTrainings}
    />
  )

  return (
    <main className="min-h-dvh bg-[#FFF9F2] font-display text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-slate-100 pb-6 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accentSoftSquare}`}>
              <Building2 className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">Admin</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Manage tracks, trainings, posts, and applications
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ key, label, value, Icon }) => (
            <article
              key={`${branchId}-${key}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentSoftSquare}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <p className={statNumberClass}>{value}</p>
            </article>
          ))}
        </section>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
          {adminNavInShell && adminNavMount ? createPortal(adminSectionNav, adminNavMount) : null}
          {!adminNavInShell ? adminSectionNav : null}

        <div className="min-w-0 flex-1">
        {activeTab === 'overview' ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Company trainers</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Trainers companies add from their dashboard (same roster role as portal trainers)
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-700">
                  {companyAddedTrainersTotal} total
                </span>
              </div>
              {companyAddedTrainersPreview.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
                  No company-added trainers yet. Companies invite trainers from the Trainers tab on their dashboard.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {companyAddedTrainersPreview.map((row) => {
                    const tracksTxt =
                      Array.isArray(row.linkedTrackTitles) && row.linkedTrackTitles.length > 0
                        ? row.linkedTrackTitles.join(', ')
                        : null
                    const addedTs = Date.parse(row.createdAt ?? '')
                    const timeLabel = Number.isNaN(addedTs) ? '' : formatOverviewRelativeTime(addedTs)
                    const roleLine = [row.email, row.companyPosition?.trim()].filter(Boolean).join(' · ')
                    return (
                      <li key={row.id} className="flex gap-3 py-4 first:pt-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${accentAvatar}`}
                        >
                          {initialsFromTrainerName(row.fullName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{row.fullName}</p>
                          {roleLine ? (
                            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{roleLine}</p>
                          ) : null}
                          <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                            Via {row.companyDisplayName}
                          </p>
                          {tracksTxt ? (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tracks: {tracksTxt}</p>
                          ) : (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No tracks linked yet</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/40">
                              Trainer
                            </span>
                            {timeLabel ? (
                              <span className="text-xs text-slate-400 dark:text-slate-500">Added {timeLabel}</span>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <button type="button" onClick={() => goToTab('companies')} className={`mt-2 w-full ${primaryOutlineBtn}`}>
                View companies
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Trainings</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Programs running on the platform</p>
                  {latestAddedTrainingOverview?.training ? (
                    <p className="mt-2 text-xs leading-snug text-violet-800 dark:text-violet-200">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Latest added: </span>
                      {latestAddedTrainingOverview.trackLabel ? (
                        <span className="font-medium">{latestAddedTrainingOverview.trackLabel} · </span>
                      ) : null}
                      <span className="font-semibold">{latestAddedTrainingOverview.training.title}</span>
                      {latestAddedTrainingOverview.ts > 0 ? (
                        <span className="text-slate-500 dark:text-slate-400">
                          {' '}
                          · {formatOverviewRelativeTime(latestAddedTrainingOverview.ts)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-700">
                  {activeTrainingsCountForOverview} active
                </span>
              </div>
              {overviewActiveTrainingRows.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
                  No active trainings for this branch. Create one under Trainings or approve a company training request.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {overviewActiveTrainingRows.map((row, idx) => (
                    <li key={row.id} className="py-4 first:pt-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 font-semibold text-slate-900 dark:text-slate-100">{row.label}</p>
                        {idx === 0 && row.ts > 0 ? (
                          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/40">
                            Newest
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{row.trainerLine}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{row.studentsCount} students</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${accentProgress}`}
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                          {row.progress}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => goToTab('trainings')} className={`mt-2 w-full ${primaryOutlineBtn}`}>
                Manage Trainings
              </button>
            </section>
          </div>
        ) : null}

        {activeTab === 'tracks' ? (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Track Management</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Manage tracks and skills
                </p>
              </div>
              <button type="button" onClick={openAddTrackModal} className={ctaBtn}>
                + Add Track
              </button>
            </div>

            {pendingCompanyTrackRequests.length > 0 ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Pending company track requests ({pendingCompanyTrackRequests.length})
                </p>
                <ul className="mt-3 space-y-2">
                  {pendingCompanyTrackRequests.map((req) => (
                    <li
                      key={req.id}
                      className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/70 bg-white px-3 py-2 transition hover:border-amber-300 hover:bg-amber-50/40 dark:border-amber-900/40 dark:bg-slate-900 dark:hover:border-amber-700/50 dark:hover:bg-slate-800/70"
                      onClick={() => setSelectedTrackRequest(req)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedTrackRequest(req)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{req.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {req.requestedBy}
                          {req.requestedByEmail ? ` · ${req.requestedByEmail}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            approveCompanyTrackRequest(req)
                          }}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            rejectCompanyTrackRequest(req.id)
                          }}
                          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {tracksFlatOrdered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                No tracks yet.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {tracksFlatOrdered.map((tr) => {
                  const Icon = trackIcon[tr.icon] ?? Code2
                  const displayName = tr.skillsName ?? tr.title
                  const savedCount = skillCountForTrack(tr.id)
                  const skillsForTrack = skillsByParent[tr.id] ?? []
                  const linkedCounts = trainingCountsByTrackId[tr.id]
                  const trainingsTotal = linkedCounts?.total ?? tr.trainings
                  const activeTrainings = linkedCounts?.active ?? tr.active
                  const trackPageTo = `/admin/track/${tr.id}?branch=${branchId}`
                  return (
                    <Link
                      key={tr.id}
                      to={trackPageTo}
                      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-900/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentSoftSquare}`}>
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              deleteTrack(tr.id, displayName)
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            aria-label={`Delete track: ${displayName}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                          <ChevronRight
                            className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-violet-600 dark:text-slate-500 dark:group-hover:text-violet-400"
                            aria-hidden
                          />
                        </div>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{displayName}</h3>
                      {tr.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{tr.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
                          {trainingsTotal} Trainings
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {tr.students} Students
                        </span>
                        {savedCount > 0 ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
                            {savedCount} saved skill{savedCount === 1 ? '' : 's'}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{activeTrainings} Active Trainings</p>
                      {skillsForTrack.length > 0 ? (
                        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Skills in this track
                          </p>
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {skillsForTrack.map((sk) => (
                              <li
                                key={sk.id}
                                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {sk.skillsName}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === 'posts' ? (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Post Management</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create and manage training announcements</p>
              </div>
              <button type="button" onClick={openCreatePostModal} className={ctaBtn}>
                + Create Post
              </button>
            </div>
            {pendingCompanyPostRequests.length > 0 ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Pending company post requests ({pendingCompanyPostRequests.length})
                </p>
                <ul className="mt-3 space-y-2">
                  {pendingCompanyPostRequests.map((req) => (
                    <li
                      key={req.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/70 bg-white px-3 py-2 dark:border-amber-900/40 dark:bg-slate-900"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{req.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {req.requestedBy}
                          {req.requestedByEmail ? ` · ${req.requestedByEmail}` : ''} · Training: {req.trainingTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => approveCompanyPostRequest(req)}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectCompanyPostRequest(req.id)}
                          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { id: 'all', label: `All (${postCounts.all})` },
                { id: 'published', label: `Published (${postCounts.published})` },
                { id: 'pending', label: `Pending (${postCounts.pending})` },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setPostFilter(chip.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    postFilter === chip.id
                      ? chipActiveClass
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <article key={post.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 text-base font-semibold text-slate-900 dark:text-slate-100">{post.title}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(post.status)}`}>
                        {post.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        aria-label={`Delete post: ${post.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-slate-600 dark:text-slate-400">{post.body}</p>
                  <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">Linked training: {post.training}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                    Deadline: {post.deadline} · {post.applicants} applicants
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === 'trainings' ? (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Training Management</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create and manage training programs under tracks</p>
              </div>
              <button type="button" onClick={openCreateTrainingModal} className={ctaBtn}>
                + Create Training
              </button>
            </div>
            {pendingCompanyTrainingRequests.length > 0 ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Pending company training requests ({pendingCompanyTrainingRequests.length})
                </p>
                <ul className="mt-3 space-y-2">
                  {pendingCompanyTrainingRequests.map((req) => (
                    <li
                      key={req.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/70 bg-white px-3 py-2 dark:border-amber-900/40 dark:bg-slate-900"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{req.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {req.requestedBy}
                          {req.requestedByEmail ? ` · ${req.requestedByEmail}` : ''} · {req.trackTitle || 'Track'}
                          {req.trainer ? ` · Trainer: ${req.trainer}` : ' · No trainer linked'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => approveCompanyTrainingRequest(req)}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectCompanyTrainingRequest(req.id)}
                          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mb-4 flex flex-wrap gap-2">
              {trainingTrackFilterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setTrainFilter(chip.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    trainFilter === chip.id
                      ? chipActiveClass
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {filteredAdminTrainings.map((t) => {
                const pct = Math.round((t.seatsTaken / t.seatsTotal) * 100)
                const canEditTraining = (createdTrainingsByBranch[branchId] ?? []).some((row) => row.id === t.id)
                return (
                  <article key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-start justify-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${trainingStatusPill(t.status)}`}>
                        {t.status}
                      </span>
                      {canEditTraining ? (
                        <button
                          type="button"
                          onClick={() => openEditTrainingModal(t)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 dark:hover:text-violet-300"
                          aria-label={`Edit training: ${t.title}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => deleteTraining(t.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        aria-label={`Remove training: ${t.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{t.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t.body}</p>
                    {t.attachedDocumentName ? (
                      <div className="mt-3 flex flex-col gap-1.5">
                        <p className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                          <span className="truncate" title={t.attachedDocumentName}>
                            {t.attachedDocumentName}
                          </span>
                        </p>
                        {t.attachedDocumentDataUrl ? (
                          <a
                            href={t.attachedDocumentDataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={t.attachedDocumentName}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            Open document
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" aria-hidden />
                        {t.date}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${accentAvatar}`}>
                        {t.initials}
                      </span>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t.trainer}</p>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {t.seatsTaken} / {t.seatsTotal} seats
                    </p>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full ${accentProgress}`} style={{ width: `${pct}%` }} />
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {activeTab === 'details' ? (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Training Overview</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">View trainings with students, tasks, and metadata</p>
              </div>
              <div className="relative w-full max-w-xs sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  type="search"
                  value={detailsSearch}
                  onChange={(e) => setDetailsSearch(e.target.value)}
                  placeholder="Search trainings…"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-violet-400 dark:focus:ring-violet-950"
                />
              </div>
            </div>
            <ul className="space-y-3">
              {filteredDetails.map((row) => {
                const expanded = expandedDetails.has(row.id)
                return (
                  <li key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => toggleDetail(row.id)}
                      className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${trainingStatusPill(row.status)}`}>
                            {row.status}
                          </span>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{row.title}</h3>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{row.body}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" aria-hidden />
                            {row.date}
                          </span>
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 font-semibold uppercase tracking-wide text-white dark:bg-slate-700">
                            {row.track}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <span>{row.students} Students</span>
                          <span>{row.tasks} Tasks</span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition ${expanded ? 'rotate-90' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {expanded ? (
                      <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Assigned trainer</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${accentAvatar}`}>
                            {row.trainerInitial}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{row.trainer}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{row.trainerEmail}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">{row.students} enrolled</p>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {activeTab === 'trainers' ? (
          <section className="mt-8 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Trainers</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Platform mentors you manage separately from company-invited trainers.
              </p>
            </div>

            <div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your trainers</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Roster members and trainers assigned on branch catalog trainings.
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-700">
                  {platformTrainers.length} total
                </span>
              </div>
              {platformTrainers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
                  No platform trainers yet. Promote a member to Trainer or assign a trainer on a catalog training.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {platformTrainers.map((t) => (
                    <article key={t.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${accentAvatar}`}>
                        {t.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                        {t.role ? (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                        ) : null}
                        <div className="mt-2">
                          <label htmlFor={`trainer-track-${t.id}`} className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Trainer type (track)
                          </label>
                          <div className="relative mt-1">
                            <select
                              id={`trainer-track-${t.id}`}
                              value={resolveTrainerTrackAssignment(t, trainerTrackById, trainerTrackSelectOptions)}
                              onChange={(e) => assignTrainerTrack(t, e.target.value)}
                              className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                            >
                              <option value="">Select track type</option>
                              {trainerTrackSelectOptions.map((trackName) => (
                                <option key={trackName} value={trackName}>
                                  {trackName}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                              aria-hidden
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Company trainers</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Trainers invited by companies from their dashboard — you can still adjust track type here.
                  </p>
                </div>
                <span className="rounded-full bg-violet-700 px-2.5 py-1 text-xs font-semibold text-white dark:bg-violet-800">
                  {companyTrainers.length} total
                </span>
              </div>
              {companyTrainers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-violet-200 bg-violet-50/60 px-4 py-8 text-center text-sm text-violet-900/80 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-200/80">
                  No company-added trainers yet. Companies invite trainers from the Trainers tab on their dashboard.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {companyTrainers.map((t) => {
                    const companyLabel =
                      companyNameByContactEmail.get(String(t.companyEmail ?? '').trim().toLowerCase()) ||
                      t.companyEmail ||
                      'Company'
                    return (
                      <article
                        key={t.id}
                        className="flex items-center gap-4 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm dark:border-violet-900/50 dark:bg-slate-900"
                      >
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${accentAvatar}`}>
                          {t.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                          <p className="mt-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">Via {companyLabel}</p>
                          {t.email ? (
                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{t.email}</p>
                          ) : null}
                          {t.role && t.role !== 'Company trainer' ? (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                          ) : null}
                          <div className="mt-2">
                            <label htmlFor={`trainer-track-${t.id}`} className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Trainer type (track)
                            </label>
                            <div className="relative mt-1">
                              <select
                                id={`trainer-track-${t.id}`}
                                value={resolveTrainerTrackAssignment(t, trainerTrackById, trainerTrackSelectOptions)}
                                onChange={(e) => assignTrainerTrack(t, e.target.value)}
                                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                              >
                                <option value="">Select track type</option>
                                {trainerTrackSelectOptions.map((trackName) => (
                                  <option key={trackName} value={trackName}>
                                    {trackName}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                                aria-hidden
                              />
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'members' ? (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Members</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  All site accounts are loaded from the database — seed users, trainers, and new registrations.
                  Use <span className="font-medium text-slate-700 dark:text-slate-300">Set access</span> to assign Admin, Student, Trainer, or Company.
                  After a role change, the user should sign out and sign in again to refresh their access.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshMembersFromApi()}
                  disabled={membersLoading}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {membersLoading ? 'Refreshing…' : 'Refresh'}
                </button>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-700">
                  {registeredMembers.length} total
                </span>
              </div>
            </div>
            {membersLoadError ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {membersLoadError}
              </div>
            ) : null}
            {membersLoading && registeredMembers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                Loading members from the database…
              </p>
            ) : registeredMembers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                No accounts found in the database yet.
              </p>
            ) : (
              <AdminSyncScrollTable>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Member
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Role
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Email
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Registered
                    </th>
                    <th className="min-w-[220px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Set access
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {registeredMembers.map((m) => {
                    const isCurrentSignedInMember =
                      Boolean(email) &&
                      (m.email ?? '').trim().toLowerCase() === (email ?? '').trim().toLowerCase()
                    const currentRole = normalizeMemberRole(m.role)
                    return (
                      <tr
                        key={m.id}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accentAvatar}`}
                            >
                              {initialsFromMemberName(m.fullName)}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${memberRolePillClass(m.role)}`}
                          >
                            {getMemberRoleLabel(m.role)}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <span className="block max-w-[12rem] truncate text-slate-600 dark:text-slate-400 sm:max-w-xs">
                            {m.email}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 align-middle text-slate-600 dark:text-slate-400">
                          {formatMemberRegisteredLabel(m.registeredAt)}
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div
                            className="inline-flex flex-wrap gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
                            role="group"
                            aria-label={`Set role for ${m.fullName}`}
                          >
                            {ADMIN_QUICK_ASSIGN_ROLES.map((opt) => {
                              const isActive = currentRole === opt.id
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={isActive || isCurrentSignedInMember}
                                  onClick={() => updateMemberRole(m.id, opt.id)}
                                  className={`${memberAssignBtnBase} ${isActive ? memberAssignBtnActive : memberAssignBtnIdle}`}
                                >
                                  {opt.label}
                                </button>
                              )
                            })}
                          </div>
                          {isCurrentSignedInMember ? (
                            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              Locked for your signed-in account.
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Remove user "${m.fullName}" from Members?`)) return
                              await removeMember(m.id)
                              setTrainerTrackById(parseTrainerTrackAssignments())
                              setCompanyTrainersTick((tick) => tick + 1)
                              await refreshTrainingsFromApi()
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </AdminSyncScrollTable>
            )}
          </section>
        ) : null}

        {activeTab === 'companies' ? (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Companies</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Company accounts registered on the platform. Manage company access from the Members tab.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-700">
                  {companyMembers.length} members
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openAddCompanyModal()
                  }}
                  className={ctaBtn}
                >
                  + Add Company Details
                </button>
              </div>
            </div>
            {companyMembers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                No company members found yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Company member</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Registered</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
                    {companyMembers.map((m) => {
                      const memberEmail = (m.email ?? '').trim().toLowerCase()
                      const linkedProfile = companies.find(
                        (c) => String(c.contactEmail ?? '').trim().toLowerCase() === memberEmail,
                      )
                      const parts = m.fullName.trim().split(/\s+/).filter(Boolean)
                      const initials =
                        parts.length >= 2
                          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                          : (parts[0]?.slice(0, 2).toUpperCase() ?? '?')
                      let dateLabel = '—'
                      if (m.registeredAt) {
                        const d = new Date(m.registeredAt)
                        if (!Number.isNaN(d.getTime())) {
                          dateLabel = d.toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        }
                      }
                      return (
                        <tr key={m.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accentAvatar}`}>
                                {initials}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${memberRolePillClass(m.role)}`}
                            >
                              {getMemberRoleLabel(m.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{m.email}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">{dateLabel}</td>
                          <td className="px-4 py-3">
                            {linkedProfile ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                  Linked · {linkedProfile.companyName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openEditCompanyModal(linkedProfile)}
                                  className="inline-flex w-fit items-center rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/60"
                                >
                                  Edit details
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openAddCompanyModalForMember(m)}
                                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50/80 hover:text-violet-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-900/50"
                              >
                                Link details
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Added Company Details
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {companies.length} total
                </span>
              </div>
              {companies.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
                  No company details added yet.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {companies.map((company) => (
                    <li key={company.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{company.companyName}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {company.industry || 'General'}{company.contactEmail ? ` · ${company.contactEmail}` : ''}
                      </p>
                      {company.description ? <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{company.description}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCompanyModal(company)}
                          className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCompanyProfile(company)}
                          className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}
      </div>

      {isAddCompanyModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddCompanyModal()
          }}
        >
          <form
            onSubmit={handleAddCompany}
            className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl bg-slate-100 p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  {editingCompanyId ? 'Edit Company Details' : 'Add Company Details'}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {editingCompanyId
                    ? 'Update this company profile. Changes appear on the public Companies page.'
                    : 'New companies added here will appear on the public Companies page.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddCompanyModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="company-email" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Link to company member email <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Choose the login email from registered company members. This links the public company profile to that account.
                </p>
                <select
                  id="company-email"
                  required
                  value={addCompanyForm.contactEmail}
                  onChange={handleCompanyContactEmailChange}
                  className={`${modalSelectClass} mt-2`}
                >
                  <option value="">Select company member email</option>
                  {selectableCompanyMemberEmails.map((opt) => (
                    <option key={opt.email} value={opt.email}>
                      {opt.fullName} ({opt.email})
                    </option>
                  ))}
                </select>
                {companyMemberEmailOptions.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                    No members with Company role found. Assign Company role in Members first.
                  </p>
                ) : selectableCompanyMemberEmails.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                    All company member emails already have profiles. Edit an existing profile or add a new company member in
                    Members.
                  </p>
                ) : null}
                {addCompanyForm.contactEmail ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    Linked account: <span className="font-mono font-medium">{addCompanyForm.contactEmail}</span>
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="company-name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Company name
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={addCompanyForm.companyName}
                  onChange={(e) => setAddCompanyForm((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder="e.g., Nile Tech Solutions"
                  className={addTrackModalInput}
                />
              </div>
              <div>
                <label htmlFor="company-industry" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Industry
                </label>
                <input
                  id="company-industry"
                  type="text"
                  value={addCompanyForm.industry}
                  onChange={(e) => setAddCompanyForm((prev) => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., Software"
                  className={addTrackModalInput}
                />
              </div>
              <div>
                <label htmlFor="company-logo-url" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Logo (Upload image)
                </label>
                <input
                  id="company-logo-url"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) {
                      setAddCompanyForm((prev) => ({ ...prev, logoUrl: '' }))
                      return
                    }
                    if (file.size > COMPANY_LOGO_MAX_BYTES) {
                      setAddCompanyError('Logo image is too large. Choose a file under 512 KB.')
                      e.target.value = ''
                      return
                    }
                    setAddCompanyError('')
                    const reader = new FileReader()
                    reader.onload = () => {
                      const result = typeof reader.result === 'string' ? reader.result : ''
                      setAddCompanyForm((prev) => ({ ...prev, logoUrl: result }))
                    }
                    reader.onerror = () => {
                      setAddCompanyForm((prev) => ({ ...prev, logoUrl: '' }))
                      setAddCompanyError('Could not read the logo image. Try another file.')
                    }
                    reader.readAsDataURL(file)
                  }}
                  className={addTrackModalInput}
                />
              </div>
              <div>
                <label htmlFor="company-location" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Location
                </label>
                <input
                  id="company-location"
                  type="text"
                  value={addCompanyForm.location}
                  onChange={(e) => setAddCompanyForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="jordan,amman"
                  className={addTrackModalInput}
                />
              </div>
              <div>
                <label htmlFor="company-vision" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Our vision
                </label>
                <textarea
                  id="company-vision"
                  rows={3}
                  value={addCompanyForm.vision}
                  onChange={(e) => setAddCompanyForm((prev) => ({ ...prev, vision: e.target.value }))}
                  placeholder="Describe your company vision..."
                  className={addTrackModalTextarea}
                />
              </div>
              <div>
                <label htmlFor="company-description" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  id="company-description"
                  rows={4}
                  value={addCompanyForm.description}
                  onChange={(e) => setAddCompanyForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short company summary..."
                  className={addTrackModalTextarea}
                />
              </div>
            </div>

            {addCompanyError ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                {addCompanyError}
              </p>
            ) : null}

            <button type="submit" className={addTrackSubmitBtn} disabled={isSavingCompany}>
              {isSavingCompany ? 'Saving…' : editingCompanyId ? 'Update Company' : 'Save Company'}
            </button>
          </form>
        </div>
      ) : null}

        </div>
        </div>

      {isCreatePostModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreatePostModal()
          }}
        >
          <form
            onSubmit={handleCreatePost}
            className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl bg-slate-100 p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Create New Post</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Announce a training opportunity</p>
              </div>
              <button
                type="button"
                onClick={closeCreatePostModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="create-post-title" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Post Title
                </label>
                <input
                  id="create-post-title"
                  type="text"
                  value={createPostForm.title}
                  onChange={(e) => setCreatePostForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Frontend Developer Internship"
                  autoFocus
                  className="mt-2 w-full rounded-xl border-2 border-violet-400/70 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-violet-500/50 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-950"
                />
              </div>

              <div>
                <label htmlFor="create-post-status" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Post status
                </label>
                <div className="relative mt-2">
                  <select
                    id="create-post-status"
                    value={createPostForm.status}
                    onChange={(e) => setCreatePostForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-950"
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create-post-training" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Link to Training
                </label>
                <div className="relative mt-2">
                  <select
                    id="create-post-training"
                    value={createPostForm.trainingId}
                    onChange={(e) => setCreatePostForm((f) => ({ ...f, trainingId: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-950"
                  >
                    {postTrainingChoices.length === 0 ? (
                      <option value="">No trainings for this branch</option>
                    ) : (
                      <>
                        <option value="">Select a training program…</option>
                        {createPostTrainingGroups.map((group) => (
                          <optgroup key={group.key} label={group.label}>
                            {group.trainings.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </>
                    )}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="create-post-content" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Content
                  </label>
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    aria-label="Clear content"
                    onClick={() => setCreatePostForm((f) => ({ ...f, content: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  id="create-post-content"
                  value={createPostForm.content}
                  onChange={(e) => setCreatePostForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Describe the opportunity…"
                  rows={5}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-950"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-post-skills" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Required Skills
                  </label>
                  <input
                    id="create-post-skills"
                    type="text"
                    value={createPostForm.skills}
                    onChange={(e) => setCreatePostForm((f) => ({ ...f, skills: e.target.value }))}
                    placeholder="React, TypeScript, CSS"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-950"
                  />
                </div>
                <div>
                  <label htmlFor="create-post-deadline" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Application Deadline
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="create-post-deadline"
                      type="date"
                      value={createPostForm.deadline}
                      onChange={(e) => setCreatePostForm((f) => ({ ...f, deadline: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-950"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!createPostForm.title.trim() || !createPostForm.trainingId}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 ring-1 ring-white/10 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 disabled:pointer-events-none disabled:opacity-50 dark:shadow-black/30"
            >
              Create Post
            </button>
          </form>
        </div>
      ) : null}

      {isCreateTrainingModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreateTrainingModal()
          }}
        >
          <form
            onSubmit={handleSaveTraining}
            className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  {editingTrainingId ? 'Edit Training' : 'Create Training'}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {editingTrainingId ? 'Update program' : 'New program'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateTrainingModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="create-training-title" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Title
                </label>
                <input
                  id="create-training-title"
                  type="text"
                  value={createTrainingForm.title}
                  onChange={(e) => setCreateTrainingForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., React Fundamentals"
                  autoFocus
                  className={addTrackModalInput}
                />
              </div>

              <div>
                <label htmlFor="create-training-body" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  id="create-training-body"
                  value={createTrainingForm.body}
                  onChange={(e) => setCreateTrainingForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="What participants will learn…"
                  rows={3}
                  className={addTrackModalTextarea}
                />
              </div>

              <div>
                <label htmlFor="create-training-document" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Supporting document{' '}
                  <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
                </label>
                <input
                  key={trainingDocumentInputKey}
                  id="create-training-document"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.md,application/pdf"
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-800 hover:file:bg-slate-200 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) {
                      setCreateTrainingForm((f) => ({ ...f, documentFileName: '', documentDataUrl: '' }))
                      return
                    }
                    if (file.size > MAX_TRAINING_ATTACHMENT_BYTES) {
                      window.alert(`Document must be ${MAX_TRAINING_ATTACHMENT_BYTES / (1024 * 1024)} MB or smaller for browser storage.`)
                      e.target.value = ''
                      setCreateTrainingForm((f) => ({ ...f, documentFileName: '', documentDataUrl: '' }))
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = () => {
                      const result = typeof reader.result === 'string' ? reader.result : ''
                      setCreateTrainingForm((f) => ({
                        ...f,
                        documentFileName: file.name,
                        documentDataUrl: result,
                      }))
                    }
                    reader.onerror = () => {
                      e.target.value = ''
                      setCreateTrainingForm((f) => ({ ...f, documentFileName: '', documentDataUrl: '' }))
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {createTrainingForm.documentFileName
                      ? `Selected: ${createTrainingForm.documentFileName} · opens from program details`
                      : `PDF, Word, PowerPoint, Markdown, or text — stored in this browser (max ${MAX_TRAINING_ATTACHMENT_BYTES / (1024 * 1024)} MB) so learners can open it.`}
                  </p>
                  {createTrainingForm.documentFileName || createTrainingForm.documentDataUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCreateTrainingForm((f) => ({ ...f, documentFileName: '', documentDataUrl: '' }))
                        setTrainingDocumentInputKey((k) => k + 1)
                      }}
                      className="text-xs font-semibold text-rose-600 underline-offset-2 hover:underline dark:text-rose-400"
                    >
                      Remove file
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <label htmlFor="create-training-track" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Track
                </label>
                {tracksFlatOrdered.length > 0 ? (
                  <div className="relative mt-2">
                    <select
                      id="create-training-track"
                      value={createTrainingForm.trackId}
                      onChange={(e) => setCreateTrainingForm((f) => ({ ...f, trackId: e.target.value }))}
                      className={modalSelectClass}
                    >
                      {tracksFlatOrdered.map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          {tr.skillsName ?? tr.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                      aria-hidden
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    No tracks yet — you can still create a training, or add one under Track Management first.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="create-training-status" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Status
                </label>
                <div className="relative mt-2">
                  <select
                    id="create-training-status"
                    value={createTrainingForm.status}
                    onChange={(e) => setCreateTrainingForm((f) => ({ ...f, status: e.target.value }))}
                    className={modalSelectClass}
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-training-date" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                    Start date
                  </label>
                  <input
                    id="create-training-date"
                    type="date"
                    value={createTrainingForm.date}
                    onChange={(e) => setCreateTrainingForm((f) => ({ ...f, date: e.target.value }))}
                    className={addTrackModalInput}
                  />
                </div>
                <div>
                  <label htmlFor="create-training-seats" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                    Total seats
                  </label>
                  <input
                    id="create-training-seats"
                    type="number"
                    min={1}
                    value={createTrainingForm.seatsTotal}
                    onChange={(e) => setCreateTrainingForm((f) => ({ ...f, seatsTotal: e.target.value }))}
                    className={addTrackModalInput}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create-training-trainer" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Trainer
                </label>
                <input
                  id="create-training-trainer"
                  type="text"
                  value={createTrainingForm.trainer}
                  onChange={(e) => setCreateTrainingForm((f) => ({ ...f, trainer: e.target.value }))}
                  placeholder="Full name"
                  className={addTrackModalInput}
                />
              </div>
            </div>

            {createTrainingError ? (
              <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                {createTrainingError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                !createTrainingForm.title.trim() ||
                !createTrainingForm.trainer.trim() ||
                (tracksFlatOrdered.length > 0 && !createTrainingForm.trackId)
              }
              className={addTrackSubmitBtn}
            >
              {editingTrainingId ? 'Save changes' : 'Create Training'}
            </button>
          </form>
        </div>
      ) : null}

      {isAddTrackModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddTrackModal()
          }}
        >
          <form
            onSubmit={handleCreateTrack}
            className="w-full max-w-md rounded-[22px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Create New Track</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Add a new training program</p>
              </div>
              <button
                type="button"
                onClick={closeAddTrackModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-5">
              {addTrackError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                  {addTrackError}
                </p>
              ) : null}
              <div>
                <label htmlFor="add-track-name" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Track Name
                </label>
                <input
                  id="add-track-name"
                  type="text"
                  value={addTrackForm.trackName}
                  onChange={(e) => setAddTrackForm((f) => ({ ...f, trackName: e.target.value }))}
                  placeholder="e.g., Frontend Development"
                  autoFocus
                  className={addTrackModalInput}
                />
              </div>

              <div>
                <label htmlFor="add-track-desc" className="block text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  id="add-track-desc"
                  value={addTrackForm.description}
                  onChange={(e) => setAddTrackForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Technologies and skills covered..."
                  rows={4}
                  className={addTrackModalTextarea}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!addTrackForm.trackName.trim()}
              className={addTrackSubmitBtn}
            >
              Create Track
            </button>
          </form>
        </div>
      ) : null}
      {selectedTrackRequest ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedTrackRequest(null)
          }}
        >
          <section
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Track Request Details</h2>
              <button
                type="button"
                onClick={() => setSelectedTrackRequest(null)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p>
                <span className="font-semibold">Title:</span> {selectedTrackRequest.title}
              </p>
              <p>
                <span className="font-semibold">Requested by:</span> {selectedTrackRequest.requestedBy}
              </p>
              {selectedTrackRequest.requestedByEmail ? (
                <p>
                  <span className="font-semibold">Email:</span> {selectedTrackRequest.requestedByEmail}
                </p>
              ) : null}
              <p>
                <span className="font-semibold">Status:</span> {selectedTrackRequest.status}
              </p>
              <p>
                <span className="font-semibold">Result:</span>{' '}
                {selectedTrackRequest.status === 'APPROVED'
                  ? 'Approved'
                  : selectedTrackRequest.status === 'REJECTED'
                    ? 'Rejected'
                    : 'Pending review'}
              </p>
              {selectedTrackRequest.reviewedBy ? (
                <p>
                  <span className="font-semibold">Reviewed by:</span> {selectedTrackRequest.reviewedBy}
                </p>
              ) : null}
              {selectedTrackRequest.reviewedAt ? (
                <p>
                  <span className="font-semibold">Reviewed at:</span>{' '}
                  {new Date(selectedTrackRequest.reviewedAt).toLocaleString()}
                </p>
              ) : null}
              <p>
                <span className="font-semibold">Description:</span>{' '}
                {selectedTrackRequest.description?.trim() || 'No description provided.'}
              </p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  rejectCompanyTrackRequest(selectedTrackRequest.id)
                  setSelectedTrackRequest(null)
                }}
                className="rounded-md border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => {
                  approveCompanyTrackRequest(selectedTrackRequest)
                  setSelectedTrackRequest(null)
                }}
                className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                Approve
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default AdminDashboard
