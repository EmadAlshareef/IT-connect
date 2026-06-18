import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAdminNavSlot } from '../context/AdminNavSlotContext.jsx'
import { useAuth } from '../context/useAuth.js'
import { useMdUp } from '../hooks/useMdUp.js'
import { validatePassword } from '../utils/passwordPolicy.js'
import { useCompanyPostRequests } from '../hooks/useCompanyPostRequests.js'
import { useCompanySelectedTracks } from '../hooks/useCompanySelectedTracks.js'
import { useCompanyTrackRequests } from '../hooks/useCompanyTrackRequests.js'
import { useCompanyTrainingRequests } from '../hooks/useCompanyTrainingRequests.js'
import { useCompanyProfiles } from '../hooks/useCompanyProfiles.js'
import { useCompanyTrainers } from '../hooks/useCompanyTrainers.js'
import { syncPublishedTrainingTrainerLink } from '../utils/syncTrainingTrainerLink.js'
import { formatOverviewRelativeTime } from '../utils/formatOverviewRelativeTime.js'
import CompanyDashboardSectionNav from '../components/CompanyDashboardSectionNav.jsx'
import CompanyApplicantsPanel from '../components/company/CompanyApplicantsPanel.jsx'
import {
  companyApprovedTrackToOption,
  listenPlatformDefaultTracksChanged,
  listActiveTrainingTrackOptionsForCompany,
  listTrainingTrackOptionsForCompany,
  resolveSelectableTrack,
} from '../utils/platformDefaultTracks.js'

const companyTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Company profile' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'trainings', label: 'Trainings' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'posts', label: 'Posts' },
  { id: 'applicants', label: 'Applicants' },
]

const tabActionLabel = {
  tracks: '+ Request custom track',
  trainings: '+ Create Training',
  trainers: '+ Add Trainer',
  posts: '+ Create Post',
}

const companyProfileFieldInput =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950'

const companyProfileFieldTextarea =
  'mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950'


function companyProfileToForm(profile) {
  if (!profile) {
    return { companyName: '', industry: '', logoUrl: '', location: '', vision: '', description: '' }
  }
  return {
    companyName: String(profile.companyName ?? '').trim(),
    industry: String(profile.industry ?? '').trim(),
    logoUrl: String(profile.logoUrl ?? '').trim(),
    location: String(profile.location ?? '').trim(),
    vision: String(profile.vision ?? '').trim(),
    description: String(profile.description ?? '').trim(),
  }
}

function findCompanyProfileForAccount(profiles, accountEmail, displayName) {
  const contact = String(accountEmail ?? '').trim().toLowerCase()
  if (contact) {
    const byEmail = profiles.find((row) => String(row.contactEmail ?? '').trim().toLowerCase() === contact)
    if (byEmail) return byEmail
  }
  const name = String(displayName ?? '').trim().toLowerCase()
  if (!name) return null
  return profiles.find((row) => String(row.companyName ?? '').trim().toLowerCase() === name) ?? null
}

function companyActivityToneClass(tone) {
  switch (tone) {
    case 'success':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
    case 'pending':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
    case 'rejected':
      return 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
    default:
      return 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200'
  }
}

function portalToBody(node) {
  if (typeof document === 'undefined') return null
  return createPortal(node, document.body)
}

function CompanyDashboard() {
  const { trainerName, role, email } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') ?? ''
  const activeTab = companyTabs.some((t) => t.id === tabParam) ? tabParam : 'overview'
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false)
  const [isCreateTrainingOpen, setIsCreateTrainingOpen] = useState(false)
  const [createTrainingError, setCreateTrainingError] = useState('')
  const [trainingSubmitting, setTrainingSubmitting] = useState(false)
  const suppressTrainingBackdropCloseRef = useRef(false)
  const [trainingDocumentInputKey, setTrainingDocumentInputKey] = useState(0)
  const [trainingTrainerEditId, setTrainingTrainerEditId] = useState(null)
  const [trainingTrainerEditEmail, setTrainingTrainerEditEmail] = useState('')
  const [trainingTrainerSaveError, setTrainingTrainerSaveError] = useState('')
  const [trainingTrainerSaving, setTrainingTrainerSaving] = useState(false)
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false)
  const [trainerEditingId, setTrainerEditingId] = useState(null)
  const [trainerFormError, setTrainerFormError] = useState('')
  const [trainerForm, setTrainerForm] = useState({
    fullName: '',
    email: '',
    password: '',
    companyPosition: '',
    selectedTrackTitles: [],
  })
  const [trackForm, setTrackForm] = useState({ title: '', description: '' })
  const [trainingForm, setTrainingForm] = useState({
    title: '',
    body: '',
    trackRequestId: '',
    date: '',
    trainer: '',
    trainerEmail: '',
    seatsTotal: '20',
    status: 'active',
    documentFileName: '',
    documentDataUrl: '',
  })
  const [trackError, setTrackError] = useState('')
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [postFormError, setPostFormError] = useState('')
  const [postForm, setPostForm] = useState({
    title: '',
    body: '',
    companyTrainingRequestId: '',
    skills: '',
    deadline: '',
  })
  const [profileForm, setProfileForm] = useState({
    companyName: '',
    industry: '',
    logoUrl: '',
    location: '',
    vision: '',
    description: '',
  })
  const [profileFormError, setProfileFormError] = useState('')
  const [profileSaveMessage, setProfileSaveMessage] = useState('')
  const { requests, submitRequest } = useCompanyTrackRequests()
  const { selectedValues: selectedTrackValues, addTrack: addSelectedTrack, removeTrack: removeSelectedTrack, isSelected: isTrackSelected } =
    useCompanySelectedTracks(email)
  const {
    requests: trainingRequests,
    submitRequest: submitTrainingRequest,
    assignTrainer: assignTrainingTrainer,
    republishEligiblePending,
  } = useCompanyTrainingRequests()
  const { requests: companyPostRequests, submitRequest: submitPostRequest } = useCompanyPostRequests()
  const { trainers: companyTrainers, addTrainer, updateTrainer, removeTrainer } = useCompanyTrainers(email)
  const { companies: companyProfiles, addCompany, updateCompany } = useCompanyProfiles()
  const normalizedRole = (role ?? '').toLowerCase()

  const myCompanyProfile = useMemo(
    () => findCompanyProfileForAccount(companyProfiles, email, trainerName),
    [companyProfiles, email, trainerName],
  )

  const selectCompanyTab = useCallback(
    (tabId) => {
      const next = companyTabs.some((t) => t.id === tabId) ? tabId : 'overview'
      setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true })
    },
    [setSearchParams],
  )

  const companyDisplayName =
    String(myCompanyProfile?.companyName ?? '').trim() || String(trainerName ?? '').trim() || 'Company'
  const companyBranchId = 'cairo'
  const [platformTracksTick, setPlatformTracksTick] = useState(0)

  useEffect(() => {
    return listenPlatformDefaultTracksChanged(() => setPlatformTracksTick((n) => n + 1))
  }, [])

  const myTrackRequests = useMemo(
    () => requests.filter((r) => (r.requestedByEmail ?? '').toLowerCase() === (email ?? '').toLowerCase()),
    [requests, email],
  )
  const approvedTrackRequests = useMemo(
    () => myTrackRequests.filter((r) => String(r.status ?? '').toUpperCase() === 'APPROVED'),
    [myTrackRequests],
  )
  const approvedTrackRequestIds = useMemo(
    () => approvedTrackRequests.map((r) => r.id).join(','),
    [approvedTrackRequests],
  )

  const catalogTrackOptions = useMemo(
    () =>
      listTrainingTrackOptionsForCompany({
        branchId: companyBranchId,
        approvedCompanyRequests: approvedTrackRequests,
      }),
    [companyBranchId, platformTracksTick, approvedTrackRequests],
  )

  const trainingTrackOptions = useMemo(
    () =>
      listActiveTrainingTrackOptionsForCompany({
        branchId: companyBranchId,
        approvedCompanyRequests: approvedTrackRequests,
        selectedTrackValues,
      }),
    [companyBranchId, platformTracksTick, approvedTrackRequests, selectedTrackValues],
  )

  useEffect(() => {
    if (!email || !approvedTrackRequestIds) return
    for (const req of approvedTrackRequests) {
      addSelectedTrack(companyApprovedTrackToOption(req))
    }
  }, [email, approvedTrackRequestIds, approvedTrackRequests, addSelectedTrack])

  const activeTracksCount = trainingTrackOptions.length
  const canCreateTraining = activeTracksCount > 0
  const canAddTrainer = activeTracksCount > 0
  const myTrainingRequests = trainingRequests.filter((r) => (r.requestedByEmail ?? '').toLowerCase() === (email ?? '').toLowerCase())
  const approvedTrainingProgramsForPosts = myTrainingRequests.filter((r) => String(r.reviewStatus ?? '').toUpperCase() === 'APPROVED')
  const canCreateCompanyPost = approvedTrainingProgramsForPosts.length > 0
  const myPostRequests = companyPostRequests.filter((r) => (r.requestedByEmail ?? '').toLowerCase() === (email ?? '').toLowerCase())

  useEffect(() => {
    if (!email) return
    republishEligiblePending(email)
  }, [email, republishEligiblePending])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.getElementById('company-dashboard-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'profile') return
    setProfileForm(companyProfileToForm(myCompanyProfile))
    setProfileFormError('')
    setProfileSaveMessage('')
  }, [activeTab, myCompanyProfile])

  const companyOverviewFeed = useMemo(() => {
    const items = []

    for (const req of myTrackRequests) {
      const status = String(req.status ?? '').toUpperCase()
      const createdTs = Number(req.createdAt) || 0
      const reviewedTs = Number(req.reviewedAt) || 0
      if (status === 'APPROVED') {
        items.push({
          id: `track-approved-${req.id}`,
          ts: reviewedTs || createdTs,
          label: `Track approved · ${req.title}`,
          detail: req.description?.trim() || null,
          tab: 'tracks',
          tone: 'success',
        })
      } else if (status === 'REJECTED') {
        items.push({
          id: `track-rejected-${req.id}`,
          ts: reviewedTs || createdTs,
          label: `Track request declined · ${req.title}`,
          tab: 'tracks',
          tone: 'rejected',
        })
      } else if (status === 'PENDING') {
        items.push({
          id: `track-pending-${req.id}`,
          ts: createdTs,
          label: `Track request submitted · ${req.title}`,
          detail: 'Awaiting admin approval',
          tab: 'tracks',
          tone: 'pending',
        })
      }
    }

    for (const req of myTrainingRequests) {
      const reviewStatus = String(req.reviewStatus ?? '').toUpperCase()
      const createdTs = Number(req.createdAt) || 0
      const reviewedTs = Number(req.reviewedAt) || 0
      if (reviewStatus === 'APPROVED') {
        items.push({
          id: `training-published-${req.id}`,
          ts: reviewedTs || createdTs,
          label: `Training approved · ${req.title}`,
          detail: [
            req.trackTitle ? `Track: ${req.trackTitle}` : null,
            req.trainer ? `Trainer: ${req.trainer}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || null,
          tab: 'trainings',
          tone: 'success',
        })
      } else if (reviewStatus === 'PENDING') {
        items.push({
          id: `training-pending-${req.id}`,
          ts: createdTs,
          label: `Training submitted · ${req.title}`,
          detail: [
            req.trackTitle ? `Track: ${req.trackTitle}` : null,
            req.trainer ? `Trainer: ${req.trainer}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || null,
          tab: 'trainings',
          tone: 'pending',
        })
      }
    }

    for (const trainer of companyTrainers) {
      const ts = Date.parse(trainer.createdAt ?? '')
      const trackLine =
        Array.isArray(trainer.linkedTrackTitles) && trainer.linkedTrackTitles.length > 0
          ? `Tracks: ${trainer.linkedTrackTitles.join(', ')}`
          : null
      items.push({
        id: `trainer-added-${trainer.id}`,
        ts: Number.isNaN(ts) ? 0 : ts,
        label: `Trainer added · ${trainer.fullName}`,
        detail: trackLine || trainer.email,
        tab: 'trainers',
        tone: 'info',
      })
    }

    return items
      .filter((row) => row.ts > 0)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 25)
  }, [myTrackRequests, myTrainingRequests, companyTrainers])

  const { slot: shellNavMount } = useAdminNavSlot()
  const mdUp = useMdUp()

  if (normalizedRole === 'admin') {
    return <Navigate to="/admin" replace />
  }

  if (normalizedRole !== 'company') {
    return <Navigate to="/dashboard" replace />
  }

  const openAddTrackModal = () => {
    setTrackError('')
    setTrackForm({ title: '', description: '' })
    setIsAddTrackOpen(true)
  }

  const closeAddTrackModal = () => {
    setIsAddTrackOpen(false)
    setTrackError('')
  }

  const handleSubmitTrackRequest = async (event) => {
    event.preventDefault()
    const title = trackForm.title.trim()
    if (!title) {
      setTrackError('Track name is required.')
      return
    }
    setTrackError('')
    const result = await submitRequest({
      title,
      description: trackForm.description,
      requestedBy: trainerName || 'Company Member',
      requestedByEmail: email || '',
      branchId: 'cairo',
    })
    if (result?.ok === false) {
      setTrackError(result.message || 'Could not submit track request.')
      return
    }
    closeAddTrackModal()
  }

  const openCreateTrainingModal = () => {
    suppressTrainingBackdropCloseRef.current = true
    setCreateTrainingError('')
    const defaultTrainer = companyTrainers[0]
    setTrainingForm({
      title: '',
      body: '',
      trackRequestId:
        trainingTrackOptions.find((row) => row.source === 'company-approved')?.value ??
        trainingTrackOptions[0]?.value ??
        '',
      date: '',
      trainer: defaultTrainer?.fullName?.trim() ?? '',
      trainerEmail: defaultTrainer?.email?.trim().toLowerCase() ?? '',
      seatsTotal: '20',
      status: 'active',
      documentFileName: '',
      documentDataUrl: '',
    })
    setTrainingDocumentInputKey((k) => k + 1)
    setIsCreateTrainingOpen(true)
    window.setTimeout(() => {
      suppressTrainingBackdropCloseRef.current = false
    }, 0)
  }

  const handleTabActionClick = () => {
    if (activeTab === 'tracks') openAddTrackModal()
    else if (activeTab === 'trainings') openCreateTrainingModal()
    else if (activeTab === 'trainers') openAddTrainerModal()
    else if (activeTab === 'posts') openCreateCompanyPostModal()
  }

  const handleSaveCompanyProfile = async (event) => {
    event.preventDefault()
    setProfileFormError('')
    setProfileSaveMessage('')

    const contactEmail = (email ?? '').trim().toLowerCase()
    if (!contactEmail) {
      setProfileFormError('Sign in with your company account email to save a profile.')
      return
    }

    const companyName = profileForm.companyName.trim()
    if (!companyName) {
      setProfileFormError('Company name is required.')
      return
    }

    const payload = {
      companyName,
      industry: profileForm.industry,
      logoUrl: profileForm.logoUrl,
      location: profileForm.location,
      vision: profileForm.vision,
      contactEmail,
      description: profileForm.description,
    }

    if (myCompanyProfile?.id) {
      const updated = await updateCompany(myCompanyProfile.id, payload)
      if (!updated) {
        setProfileFormError('Could not update your company profile. Try again.')
        return
      }
      setProfileSaveMessage('Company profile updated. Changes appear on the public Companies page.')
      return
    }

    const duplicate = companyProfiles.some(
      (row) => (row.contactEmail ?? '').trim().toLowerCase() === contactEmail,
    )
    if (duplicate) {
      setProfileFormError('A profile is already linked to this email. Refresh the page or contact an admin.')
      return
    }

    const created = await addCompany(payload)
    if (!created) {
      setProfileFormError('Could not create your company profile. Try again.')
      return
    }
    setProfileSaveMessage('Company profile created. It now appears on the public Companies page.')
  }

  const closeCreateTrainingModal = () => {
    setCreateTrainingError('')
    setIsCreateTrainingOpen(false)
  }

  const handleTrainingDocumentChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setTrainingForm((prev) => ({ ...prev, documentFileName: '', documentDataUrl: '' }))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setCreateTrainingError('Document must be 2 MB or smaller.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const data = typeof reader.result === 'string' ? reader.result : ''
      setTrainingForm((prev) => ({ ...prev, documentFileName: file.name, documentDataUrl: data }))
    }
    reader.onerror = () => setCreateTrainingError('Could not read the selected file.')
    reader.readAsDataURL(file)
  }

  const handleSubmitTrainingRequest = async (event) => {
    event.preventDefault()
    if (!canCreateTraining) {
      setCreateTrainingError('Select a track before publishing a training.')
      return
    }
    const title = trainingForm.title.trim()
    const trainerEmail = trainingForm.trainerEmail.trim().toLowerCase()
    const pickedTrainer = companyTrainers.find(
      (row) => String(row.email ?? '').trim().toLowerCase() === trainerEmail,
    )
    const trainer = String(pickedTrainer?.fullName ?? trainingForm.trainer ?? '').trim()
    if (!title || !trainerEmail || !trainingForm.trackRequestId) {
      setCreateTrainingError('Title, trainer, and track are required.')
      return
    }
    if (!trainer) {
      setCreateTrainingError('Select a trainer from your company roster.')
      return
    }
    const resolved = resolveSelectableTrack(
      trainingForm.trackRequestId,
      companyBranchId,
      approvedTrackRequests,
    )
    if (!resolved?.trackTitle) {
      setCreateTrainingError('Selected track is no longer available.')
      return
    }
    const trackTitle = resolved.trackTitle
    const trackRequestId = resolved.trackRequestId
    const branchId = resolved.branchId
    setTrainingSubmitting(true)
    setCreateTrainingError('')
    try {
      const result = await submitTrainingRequest({
        title,
        body: trainingForm.body,
        trackRequestId,
        trackTitle,
        trainer,
        trainerEmail,
        date: trainingForm.date,
        seatsTotal: trainingForm.seatsTotal,
        status: trainingForm.status,
        requestedBy: trainerName || 'Company Member',
        requestedByEmail: email || '',
        branchId,
        documentFileName: trainingForm.documentFileName,
        documentDataUrl: trainingForm.documentDataUrl,
      })
      if (!result?.ok) {
        setCreateTrainingError(result?.message || 'Could not submit training. Try again.')
        return
      }
      closeCreateTrainingModal()
    } finally {
      setTrainingSubmitting(false)
    }
  }

  const handleAssignTrainingTrainer = async (requestId, trainerEmail) => {
    const emailNorm = String(trainerEmail ?? '').trim().toLowerCase()
    const picked = companyTrainers.find((row) => String(row.email ?? '').trim().toLowerCase() === emailNorm)
    if (!picked) {
      return { ok: false, message: 'Select a trainer from your company list.' }
    }
    const trainerName = String(picked.fullName ?? '').trim()
    if (!trainerName) {
      return { ok: false, message: 'Selected trainer is missing a display name.' }
    }
    const result = await assignTrainingTrainer(
      requestId,
      { trainer: trainerName, trainerEmail: String(picked.email ?? '').trim().toLowerCase() },
      email,
    )
    if (!result.ok) return result
    if (result.entry?.publishedTrainingId) {
      syncPublishedTrainingTrainerLink(result.entry)
    }
    return { ok: true }
  }

  const openEditTrainingTrainer = (req) => {
    setTrainingTrainerSaveError('')
    setTrainingTrainerEditId(req.id)
    const current = String(req.trainerEmail ?? '').trim().toLowerCase()
    const match = companyTrainers.find((row) => String(row.email ?? '').trim().toLowerCase() === current)
    setTrainingTrainerEditEmail(match ? String(match.email).trim().toLowerCase() : current)
  }

  const cancelEditTrainingTrainer = () => {
    setTrainingTrainerEditId(null)
    setTrainingTrainerEditEmail('')
    setTrainingTrainerSaveError('')
    setTrainingTrainerSaving(false)
  }

  const saveEditTrainingTrainer = async () => {
    setTrainingTrainerSaveError('')
    if (!trainingTrainerEditId || !trainingTrainerEditEmail.trim()) {
      setTrainingTrainerSaveError('Select a trainer.')
      return
    }
    setTrainingTrainerSaving(true)
    try {
      const result = await handleAssignTrainingTrainer(trainingTrainerEditId, trainingTrainerEditEmail)
      if (result.ok) {
        cancelEditTrainingTrainer()
      } else {
        setTrainingTrainerSaveError(result.message || 'Could not save trainer link.')
      }
    } finally {
      setTrainingTrainerSaving(false)
    }
  }

  const openAddTrainerModal = () => {
    setTrainerFormError('')
    setTrainerEditingId(null)
    setTrainerForm({
      fullName: '',
      email: '',
      password: '',
      companyPosition: '',
      selectedTrackTitles: trainingTrackOptions[0]?.title ? [trainingTrackOptions[0].title] : [],
    })
    setIsAddTrainerOpen(true)
  }

  const openEditTrainerModal = (row) => {
    setTrainerFormError('')
    setTrainerEditingId(row.id)
    setTrainerForm({
      fullName: row.fullName ?? '',
      email: row.email ?? '',
      password: '',
      companyPosition: row.companyPosition ?? '',
      selectedTrackTitles: Array.isArray(row.linkedTrackTitles) ? [...row.linkedTrackTitles] : [],
    })
    setIsAddTrainerOpen(true)
  }

  const closeAddTrainerModal = () => {
    setIsAddTrainerOpen(false)
    setTrainerFormError('')
    setTrainerEditingId(null)
  }

  const toggleTrainerTrackTitle = (title) => {
    const t = String(title ?? '').trim()
    if (!t) return
    setTrainerForm((prev) => {
      const has = prev.selectedTrackTitles.includes(t)
      const selectedTrackTitles = has
        ? prev.selectedTrackTitles.filter((x) => x !== t)
        : [...prev.selectedTrackTitles, t]
      return { ...prev, selectedTrackTitles }
    })
  }

  const handleSubmitTrainer = async (event) => {
    event.preventDefault()
    setTrainerFormError('')
    const name = trainerForm.fullName.trim()
    const trainerEmail = trainerForm.email.trim().toLowerCase()
    const passwordTrim = trainerForm.password.trim()
    const isEdit = trainerEditingId != null

    if (!name || !trainerEmail) {
      setTrainerFormError('Name and email are required.')
      return
    }

    if (!canAddTrainer) {
      setTrainerFormError('Add at least one track on the Tracks tab before adding a trainer.')
      return
    }

    if (trainerForm.selectedTrackTitles.length === 0) {
      setTrainerFormError('Select at least one track to link this trainer.')
      return
    }

    if (!isEdit) {
      const policyErrors = validatePassword(passwordTrim)
      if (policyErrors.length > 0) {
        setTrainerFormError(policyErrors.join(' '))
        return
      }
      const result = await addTrainer({
        fullName: name,
        email: trainerEmail,
        companyPosition: trainerForm.companyPosition,
        linkedTrackTitles: trainerForm.selectedTrackTitles,
        password: passwordTrim,
      })
      if (!result.ok) {
        setTrainerFormError(result.message ?? 'Could not add trainer.')
        return
      }
      closeAddTrainerModal()
      return
    }

    if (passwordTrim) {
      const policyErrors = validatePassword(passwordTrim)
      if (policyErrors.length > 0) {
        setTrainerFormError(policyErrors.join(' '))
        return
      }
    }

    const result = await updateTrainer(trainerEditingId, {
      fullName: name,
      email: trainerEmail,
      companyPosition: trainerForm.companyPosition,
      linkedTrackTitles: trainerForm.selectedTrackTitles,
      password: passwordTrim || undefined,
    })
    if (!result.ok) {
      setTrainerFormError(result.message ?? 'Could not update trainer.')
      return
    }

    closeAddTrainerModal()
  }

  const openCreateCompanyPostModal = () => {
    if (!canCreateCompanyPost) return
    setPostFormError('')
    const first = approvedTrainingProgramsForPosts[0]
    setPostForm({
      title: '',
      body: '',
      companyTrainingRequestId: first?.id ?? '',
      skills: '',
      deadline: '',
    })
    setIsCreatePostOpen(true)
  }

  const closeCreateCompanyPostModal = () => {
    setIsCreatePostOpen(false)
    setPostFormError('')
  }

  const handleSubmitCompanyPost = async (event) => {
    event.preventDefault()
    setPostFormError('')
    const title = postForm.title.trim()
    if (!title) {
      setPostFormError('Post title is required.')
      return
    }
    const selectedTraining = approvedTrainingProgramsForPosts.find((r) => r.id === postForm.companyTrainingRequestId)
    if (!selectedTraining) {
      setPostFormError('Choose an approved training program to link.')
      return
    }
    const row = await submitPostRequest({
      title,
      body: postForm.body,
      trainingTitle: selectedTraining.title,
      companyTrainingRequestId: selectedTraining.id,
      skillsRaw: postForm.skills,
      deadline: postForm.deadline,
      requestedBy: trainerName || 'Company Member',
      requestedByEmail: email || '',
      branchId: selectedTraining.branchId || 'cairo',
    })
    if (!row) {
      setPostFormError('Could not submit post.')
      return
    }
    closeCreateCompanyPostModal()
  }

  const companyNavInShell = Boolean(shellNavMount && mdUp)



  return (
    <main className="min-h-dvh bg-[#FFF9F2] font-display text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <section>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{companyDisplayName}</h1>
          <p className="mt-2 text-lg font-medium text-slate-700 dark:text-slate-300">
            Company workspace for tracks, trainings, and approvals
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
            Welcome back, {trainerName || 'Company Member'}. Manage tracks, trainings, trainers, and approvals from one
            place.
            {!myCompanyProfile ? (
              <span className="mt-2 block text-amber-700 dark:text-amber-300">
                Open{' '}
                <button
                  type="button"
                  onClick={() => selectCompanyTab('profile')}
                  className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
                >
                  Company profile
                </button>{' '}
                to create your public company page (linked to <strong>{email || 'your sign-in email'}</strong>).
              </span>
            ) : null}
          </p>
        </section>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
          {companyNavInShell && shellNavMount
            ? createPortal(
                <CompanyDashboardSectionNav
                  placement="shell"
                  tabs={companyTabs}
                  activeTab={activeTab}
                  onSelectTab={selectCompanyTab}
                />,
                shellNavMount,
              )
            : null}
          {!companyNavInShell ? (
            <CompanyDashboardSectionNav
              placement="inline"
              tabs={companyTabs}
              activeTab={activeTab}
              onSelectTab={selectCompanyTab}
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <section id="company-dashboard-panel" className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {companyTabs.find((tab) => tab.id === activeTab)?.label}
            </h2>
            {tabActionLabel[activeTab] ? (
              <button
                type="button"
                onClick={handleTabActionClick}
                disabled={activeTab === 'posts' && !canCreateCompanyPost}
                title={
                  activeTab === 'trainings' && !canCreateTraining
                    ? 'Add tracks on the Tracks tab first.'
                    : activeTab === 'trainers' && !canAddTrainer
                      ? 'Add tracks on the Tracks tab first.'
                      : activeTab === 'posts' && !canCreateCompanyPost
                        ? 'Publish at least one training before creating a post.'
                        : undefined
                }
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ring-white/10 transition ${
                  activeTab === 'posts' && !canCreateCompanyPost
                    ? 'cursor-not-allowed bg-slate-300 text-slate-600 shadow-none dark:bg-slate-700 dark:text-slate-300'
                    : (activeTab === 'trainings' && !canCreateTraining) || (activeTab === 'trainers' && !canAddTrainer)
                      ? 'bg-gradient-to-r from-violet-600/70 via-purple-600/70 to-fuchsia-600/70 text-white shadow-md shadow-violet-500/10 hover:from-violet-700/80 hover:via-purple-700/80 hover:to-fuchsia-700/80 dark:shadow-black/20'
                      : 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-violet-900/15 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 dark:shadow-black/30'
                }`}
              >
                {tabActionLabel[activeTab]}
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {activeTab === 'overview' && 'View a high-level summary of your company performance and activity.'}
            {activeTab === 'profile' &&
              'Edit how your organization appears on the public Companies page. Your sign-in email is always the linked contact.'}
            {activeTab === 'tracks' &&
              'Add tracks from the catalog to your company, then publish trainings on those tracks. Request custom tracks when you need something new.'}
            {activeTab === 'trainings' &&
              'Create training programs on tracks you added under Tracks, with a trainer assigned.'}
            {activeTab === 'trainers' &&
              'Add trainers linked to your active tracks. Each trainer uses the Trainer portal role—the same sign-in flow as demo trainers.'}
            {activeTab === 'posts' &&
              'Submit announcements linked to an approved training; admin reviews and publishes posts to the branch.'}
            {activeTab === 'applicants' &&
              'View all students enrolled in your company trainings and the trainers linked to your account.'}
          </p>
          {activeTab === 'overview' ? (
            <div className="mt-6 space-y-6">
              <section className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Active tracks</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{activeTracksCount}</p>
                </article>
                <article className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Training</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {approvedTrainingProgramsForPosts.length}
                  </p>
                </article>
                <article className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Company trainers</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{companyTrainers.length}</p>
                </article>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Recent activity</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    New track approvals, published trainings, and trainers appear here as your workspace updates.
                  </p>
                </div>
                {companyOverviewFeed.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400 sm:px-5">
                    No activity yet. Add tracks under Tracks, then create trainings or request a custom track.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {companyOverviewFeed.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => selectCompanyTab(item.tab)}
                          className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:px-5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.label}</p>
                            {item.detail ? (
                              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${companyActivityToneClass(item.tone)}`}
                            >
                              {item.tone === 'success' ? 'New' : item.tone === 'pending' ? 'Pending' : item.tone === 'rejected' ? 'Declined' : 'Update'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {formatOverviewRelativeTime(item.ts)}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
          {activeTab === 'profile' ? (
            <form key={myCompanyProfile?.id ?? 'new-profile'} className="mt-6 space-y-5" onSubmit={handleSaveCompanyProfile}>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Linked account
                </p>
                <p className="mt-2 font-mono text-sm text-slate-800 dark:text-slate-200">{email || '—'}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {myCompanyProfile
                    ? 'Updates apply to your existing public company profile.'
                    : 'Saving creates a new company profile linked to this email.'}
                </p>
              </div>

              {profileForm.logoUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={profileForm.logoUrl}
                    alt=""
                    className="h-16 w-16 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setProfileForm((prev) => ({ ...prev, logoUrl: '' }))}
                    className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Remove logo
                  </button>
                </div>
              ) : null}

              <div>
                <label htmlFor="company-profile-name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Company name <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="company-profile-name"
                  type="text"
                  required
                  value={profileForm.companyName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder="e.g., Nile Tech Solutions"
                  className={companyProfileFieldInput}
                />
              </div>

              <div>
                <label htmlFor="company-profile-industry" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Industry
                </label>
                <input
                  id="company-profile-industry"
                  type="text"
                  value={profileForm.industry}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., Software"
                  className={companyProfileFieldInput}
                />
              </div>

              <div>
                <label htmlFor="company-profile-logo" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Logo (upload image)
                </label>
                <input
                  id="company-profile-logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) {
                      setProfileForm((prev) => ({ ...prev, logoUrl: '' }))
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = () => {
                      const result = typeof reader.result === 'string' ? reader.result : ''
                      setProfileForm((prev) => ({ ...prev, logoUrl: result }))
                    }
                    reader.onerror = () => {
                      setProfileForm((prev) => ({ ...prev, logoUrl: '' }))
                    }
                    reader.readAsDataURL(file)
                  }}
                  className={companyProfileFieldInput}
                />
              </div>

              <div>
                <label htmlFor="company-profile-location" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Location
                </label>
                <input
                  id="company-profile-location"
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Jordan, Amman"
                  className={companyProfileFieldInput}
                />
              </div>

              <div>
                <label htmlFor="company-profile-vision" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Our vision
                </label>
                <textarea
                  id="company-profile-vision"
                  rows={3}
                  value={profileForm.vision}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, vision: e.target.value }))}
                  placeholder="Describe your company vision..."
                  className={companyProfileFieldTextarea}
                />
              </div>

              <div>
                <label
                  htmlFor="company-profile-description"
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Description
                </label>
                <textarea
                  id="company-profile-description"
                  rows={4}
                  value={profileForm.description}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short company summary..."
                  className={companyProfileFieldTextarea}
                />
              </div>

              {profileFormError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  {profileFormError}
                </p>
              ) : null}
              {profileSaveMessage ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {profileSaveMessage}
                </p>
              ) : null}

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/15 ring-1 ring-white/10 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 dark:shadow-black/30"
              >
                {myCompanyProfile ? 'Save company profile' : 'Create company profile'}
              </button>
            </form>
          ) : null}
          {activeTab === 'tracks' ? (
            <div className="mt-5 space-y-6">
              <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
                  Your tracks for trainings
                </p>
                <p className="mt-1 text-sm text-violet-900/90 dark:text-violet-200/90">
                  Only tracks listed here appear when you create trainings or assign trainers. Add tracks from the catalog below.
                </p>
                {trainingTrackOptions.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-violet-300/80 bg-white/60 px-3 py-3 text-sm text-violet-900/80 dark:border-violet-800/50 dark:bg-slate-900/40 dark:text-violet-200/90">
                    No tracks selected yet. Choose tracks from the catalog, or wait for admin approval on a custom request.
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {trainingTrackOptions.map((track) => (
                      <li
                        key={track.value}
                        className="flex items-center justify-between gap-2 rounded-lg border border-violet-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-800 dark:border-violet-800/40 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <span>{track.optionLabel ?? track.title}</span>
                        {track.source !== 'company-approved' ? (
                          <button
                            type="button"
                            onClick={() => removeSelectedTrack(track.value)}
                            className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="shrink-0 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Approved</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  Track catalog (add to your company)
                </p>
                <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-200/90">
                  Platform tracks are ready immediately. After you add one, it appears in your trainings list above.
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {catalogTrackOptions
                    .filter((track) => track.optionGroup === 'platform')
                    .map((track) => {
                      const added = isTrackSelected(track.value)
                      return (
                        <li
                          key={track.value}
                          className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-800 dark:border-emerald-800/40 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <span>{track.title}</span>
                          <button
                            type="button"
                            disabled={added}
                            onClick={() => addSelectedTrack(track)}
                            className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-default disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
                          >
                            {added ? 'Added' : 'Add'}
                          </button>
                        </li>
                      )
                    })}
                </ul>
              </section>

              <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                My custom track requests
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Need a track that is not in the catalog? Submit a request — after admin approval it is added automatically to your trainings list.
              </p>
              {myTrackRequests.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  No custom requests yet. Use + Add Track to propose a new platform track.
                </p>
              ) : (
                <ul className="space-y-2">
                  {myTrackRequests.map((req) => (
                    <li
                      key={req.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-100">{req.title}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : req.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              </section>
            </div>
          ) : null}
          {activeTab === 'trainers' ? (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Company trainers
              </p>
              {companyTrainers.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  No trainers yet. Use + Add Trainer to add someone with Trainer role (same sign-in flow as your original demo trainers).
                </p>
              ) : (
                <ul className="space-y-3">
                  {companyTrainers.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-700"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{row.fullName}</p>
                          <p className="text-slate-600 dark:text-slate-400">{row.email}</p>
                          {row.companyPosition ? (
                            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Position · {row.companyPosition}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditTrainerModal(row)}
                            className="rounded-md border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-800 transition hover:bg-violet-50 dark:border-violet-800/60 dark:text-violet-200 dark:hover:bg-violet-950/40"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTrainer(row.id)}
                            className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      {row.linkedTrackTitles?.length ? (
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Approved tracks: </span>
                          {row.linkedTrackTitles.join(', ')}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          {activeTab === 'posts' && !canCreateCompanyPost ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200">
              You can request a post only after admin approves at least one of your training programs (same rule as creating trainings).
            </p>
          ) : null}
          {activeTab === 'posts' ? (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                My post requests
              </p>
              {myPostRequests.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  No post requests yet. Use + Create Post to publish one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {myPostRequests.map((req) => (
                    <li
                      key={req.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{req.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Training: {req.trainingTitle}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          req.reviewStatus === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : req.reviewStatus === 'REJECTED'
                              ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                        }`}
                      >
                        {req.reviewStatus}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          {activeTab === 'applicants' ? (
            <CompanyApplicantsPanel
              companyEmail={email}
              trainingRequests={trainingRequests}
              companyTrainers={companyTrainers}
            />
          ) : null}
          {activeTab === 'trainings' && !canCreateTraining ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200">
              Add at least one track on the Tracks tab before creating a training.
            </p>
          ) : null}
          {activeTab === 'trainers' && !canAddTrainer ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200">
              Add at least one track on the Tracks tab before adding a trainer.
            </p>
          ) : null}
          {activeTab === 'trainings' ? (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                My trainings
              </p>
              {trainingTrainerSaveError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-sm text-rose-900 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-200">
                  {trainingTrainerSaveError}
                </p>
              ) : null}
              {myTrainingRequests.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  No trainings yet. Use + Create Training to publish a program.
                </p>
              ) : (
                <ul className="space-y-2">
                  {myTrainingRequests.map((req) => {
                    const isApproved = String(req.reviewStatus ?? '').toUpperCase() === 'APPROVED'
                    const isRejected = String(req.reviewStatus ?? '').toUpperCase() === 'REJECTED'
                    const hasTrainer = Boolean(String(req.trainer ?? '').trim() && String(req.trainerEmail ?? '').trim())
                    const isEditingTrainer = trainingTrainerEditId === req.id
                    const canManageTrainer = !isRejected && companyTrainers.length > 0
                    return (
                      <li
                        key={req.id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{req.title}</p>
                          {isEditingTrainer ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <select
                                value={trainingTrainerEditEmail}
                                onChange={(e) => setTrainingTrainerEditEmail(e.target.value)}
                                className="min-w-[12rem] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200"
                              >
                                {companyTrainers.map((row) => (
                                  <option key={row.id} value={String(row.email ?? '').trim().toLowerCase()}>
                                    {row.fullName} ({row.email})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={saveEditTrainingTrainer}
                                disabled={trainingTrainerSaving}
                                className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {trainingTrainerSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditTrainingTrainer}
                                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {req.trackTitle ? `${req.trackTitle} · ` : ''}
                              {hasTrainer ? (
                                <span>Trainer: {req.trainer}</span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-300">No trainer linked</span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {!isEditingTrainer && canManageTrainer && !hasTrainer ? (
                            <select
                              defaultValue=""
                              onChange={async (e) => {
                                const pickedEmail = e.target.value
                                if (!pickedEmail) return
                                setTrainingTrainerSaveError('')
                                const result = await handleAssignTrainingTrainer(req.id, pickedEmail)
                                if (!result.ok) {
                                  setTrainingTrainerSaveError(result.message || 'Could not link trainer.')
                                }
                                e.target.value = ''
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200"
                            >
                              <option value="" disabled>
                                Link trainer
                              </option>
                              {companyTrainers.map((row) => (
                                <option key={row.id} value={String(row.email ?? '').trim().toLowerCase()}>
                                  {row.fullName}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {!isEditingTrainer && canManageTrainer && hasTrainer ? (
                            <button
                              type="button"
                              onClick={() => openEditTrainingTrainer(req)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              Edit trainer
                            </button>
                          ) : null}
                          {!isApproved ? (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                isRejected
                                  ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
                                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                              }`}
                            >
                              {req.reviewStatus}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}

                </ul>
              )}
            </div>
          ) : null}
            </section>
          </div>
        </div>
      </div>
      {isCreatePostOpen ? (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreateCompanyPostModal()
          }}
        >
          <section
            className="max-h-[min(90vh,680px)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Post</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Submitted as pending for admin approval before it appears on the branch.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateCompanyPostModal}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmitCompanyPost} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Post title</label>
                <input
                  value={postForm.title}
                  onChange={(e) => setPostForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Linked training</label>
                <select
                  value={postForm.companyTrainingRequestId}
                  onChange={(e) => setPostForm((prev) => ({ ...prev, companyTrainingRequestId: e.target.value }))}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                >
                  {approvedTrainingProgramsForPosts.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.title}
                      {req.trackTitle ? ` · ${req.trackTitle}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Content</label>
                <textarea
                  rows={4}
                  value={postForm.body}
                  onChange={(e) => setPostForm((prev) => ({ ...prev, body: e.target.value }))}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Skills / tags
                  </label>
                  <input
                    value={postForm.skills}
                    onChange={(e) => setPostForm((prev) => ({ ...prev, skills: e.target.value }))}
                    className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Comma-separated</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Application deadline
                  </label>
                  <input
                    type="date"
                    value={postForm.deadline}
                    onChange={(e) => setPostForm((prev) => ({ ...prev, deadline: e.target.value }))}
                    className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  />
                </div>
              </div>
              {postFormError ? (
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{postFormError}</p>
              ) : null}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/15 ring-1 ring-white/10 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 dark:shadow-black/30"
                >
                  Publish training
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {isAddTrackOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddTrackModal()
          }}
        >
          <section
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Request New Track</h3>
              <button
                type="button"
                onClick={closeAddTrackModal}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Propose a track for the whole platform. After admin approval, every company can use it without waiting.
            </p>
            <form onSubmit={handleSubmitTrackRequest} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Track Name</label>
                <input
                  value={trackForm.title}
                  onChange={(e) => setTrackForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  placeholder="e.g. Cloud Engineering"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Description</label>
                <textarea
                  rows={4}
                  value={trackForm.description}
                  onChange={(e) => setTrackForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  placeholder="Why this track is needed..."
                />
              </div>
              {trackError ? <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{trackError}</p> : null}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/15 ring-1 ring-white/10 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 dark:shadow-black/30"
                >
                  Submit for Admin Approval
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {isAddTrainerOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddTrainerModal()
          }}
        >
          <section
            className="max-h-[min(90vh,680px)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {trainerEditingId ? 'Edit Trainer' : 'Add Trainer'}
              </h3>
              <button
                type="button"
                onClick={closeAddTrainerModal}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            {trainerEditingId ? (
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Updates keep this person on the{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">Trainer</span> role for portal login.
              </p>
            ) : (
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                They are registered with the{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">Trainer</span> role—the same role as your
                seeded demo trainers—so they use the standard trainer login and trainer dashboard.
              </p>
            )}
            <form onSubmit={handleSubmitTrainer} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Full name</label>
                <input
                  autoComplete="name"
                  value={trainerForm.fullName}
                  onChange={(e) => setTrainerForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  placeholder="e.g. Mona El-Sayed"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={trainerForm.email}
                  onChange={(e) => setTrainerForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  placeholder="trainer.name@company.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={trainerForm.password}
                  onChange={(e) => setTrainerForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  placeholder={
                    trainerEditingId ? 'Leave blank to keep current password' : 'Trainer sign-in password'
                  }
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {trainerEditingId
                    ? 'Optional when editing: enter a new password to replace the current one.'
                    : 'Saved in the database so the trainer can sign in from the login page. Use 12+ characters with upper, lower, number, and symbol.'}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Position in company
                </label>
                <input
                  value={trainerForm.companyPosition}
                  onChange={(e) => setTrainerForm((prev) => ({ ...prev, companyPosition: e.target.value }))}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  placeholder="e.g. Lead Technical Instructor, L&D Partner"
                />
              </div>
              {!canAddTrainer ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
                  Add tracks on the Tracks tab first.
                </p>
              ) : (
                <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Link tracks <span className="text-rose-600 dark:text-rose-400">*</span>
                  </legend>
                  <ul className="mt-2 space-y-2">
                    {trainingTrackOptions.map((track) => {
                      const checked = trainerForm.selectedTrackTitles.includes(track.title)
                      return (
                        <li key={track.value}>
                          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTrainerTrackTitle(track.title)}
                              className="mt-1 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-600"
                            />
                            <span>{track.optionLabel ?? track.title}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Only tracks you added on the Tracks tab (plus admin-approved custom tracks).
                  </p>
                </fieldset>
              )}
              {trainerFormError ? (
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{trainerFormError}</p>
              ) : null}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!canAddTrainer || trainerForm.selectedTrackTitles.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/15 ring-1 ring-white/10 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 disabled:pointer-events-none disabled:opacity-50 dark:shadow-black/30"
                >
                  {trainerEditingId ? 'Save changes' : 'Save trainer'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {isCreateTrainingOpen
        ? portalToBody(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
              role="presentation"
              onClick={(e) => {
                if (suppressTrainingBackdropCloseRef.current) return
                if (e.target === e.currentTarget) closeCreateTrainingModal()
              }}
            >
              <form
                className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmitTrainingRequest}
              >
                {!canCreateTraining ? (
                  <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
                    Add tracks on the Tracks tab first, then create a training here.
                  </p>
                ) : null}
                <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Training</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  New program for your company — assign a trainer and publish to the catalog.
                </p>
              </div>
              <button type="button" onClick={closeCreateTrainingModal} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Title</label>
                <input
                  value={trainingForm.title}
                  onChange={(e) => setTrainingForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Description</label>
                <textarea
                  rows={4}
                  value={trainingForm.body}
                  onChange={(e) => setTrainingForm((prev) => ({ ...prev, body: e.target.value }))}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Supporting document <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  PDF, Word, PowerPoint, Markdown, or text - stored in this browser (max 2 MB).
                </p>
                <input
                  key={trainingDocumentInputKey}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.md,.markdown,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/markdown,text/plain"
                  onChange={handleTrainingDocumentChange}
                  className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Track</label>
                <select
                  value={trainingForm.trackRequestId}
                  onChange={(e) => setTrainingForm((prev) => ({ ...prev, trackRequestId: e.target.value }))}
                  disabled={!canCreateTraining}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                >
                  {trainingTrackOptions.length === 0 ? (
                    <option value="">No tracks available</option>
                  ) : (
                    <>
                      {trainingTrackOptions.some((t) => t.optionGroup === 'company') ? (
                        <optgroup label="Approved for your company">
                          {trainingTrackOptions
                            .filter((t) => t.optionGroup === 'company')
                            .map((track) => (
                              <option key={track.value} value={track.value}>
                                {track.optionLabel ?? track.title}
                              </option>
                            ))}
                        </optgroup>
                      ) : null}
                      {trainingTrackOptions.some((t) => t.optionGroup === 'platform') ? (
                        <optgroup label="Your selected tracks">
                          {trainingTrackOptions
                            .filter((t) => t.optionGroup === 'platform')
                            .map((track) => (
                              <option key={track.value} value={track.value}>
                                {track.title}
                              </option>
                            ))}
                        </optgroup>
                      ) : null}
                    </>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Status</label>
                  <select
                    value={trainingForm.status}
                    onChange={(e) => setTrainingForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Date</label>
                  <input
                    type="date"
                    value={trainingForm.date}
                    onChange={(e) => setTrainingForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Seats</label>
                  <input
                    type="number"
                    min="1"
                    value={trainingForm.seatsTotal}
                    onChange={(e) => setTrainingForm((prev) => ({ ...prev, seatsTotal: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Trainer</label>
                <select
                  value={trainingForm.trainerEmail}
                  onChange={(e) => {
                    const emailNorm = String(e.target.value ?? '').trim().toLowerCase()
                    const picked = companyTrainers.find(
                      (row) => String(row.email ?? '').trim().toLowerCase() === emailNorm,
                    )
                    setTrainingForm((prev) => ({
                      ...prev,
                      trainerEmail: emailNorm,
                      trainer: picked?.fullName?.trim() ?? '',
                    }))
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                >
                  {companyTrainers.length === 0 ? (
                    <option value="">Add a trainer first</option>
                  ) : (
                    companyTrainers.map((row) => (
                      <option key={row.id} value={String(row.email ?? '').trim().toLowerCase()}>
                        {row.fullName} ({row.email})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            {createTrainingError ? <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">{createTrainingError}</p> : null}
                <button
                  type="submit"
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-900/15 ring-1 ring-white/10 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 disabled:pointer-events-none disabled:opacity-50 dark:shadow-black/30"
                  disabled={
                    trainingSubmitting ||
                    !canCreateTraining ||
                    !trainingForm.title.trim() ||
                    !trainingForm.trainerEmail.trim() ||
                    !trainingForm.trackRequestId ||
                    companyTrainers.length === 0
                  }
                >
                  {trainingSubmitting ? 'Submitting…' : 'Submit for approval'}
                </button>
              </form>
            </div>,
          )
        : null}
    </main>
  )
}

export default CompanyDashboard
