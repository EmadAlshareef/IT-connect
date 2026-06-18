import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { ACTIVE_TRAINER_ACCOUNTS_COUNT } from '../api/authApi.js'
import { useAuth } from '../context/useAuth.js'
import HomeHero from '../components/home/HomeHero.jsx'
import HomeFeatures from '../components/home/HomeFeatures.jsx'
import HomeHowItWorks from '../components/home/HomeHowItWorks.jsx'
import HomeStatistics from '../components/home/HomeStatistics.jsx'
import HomeForWho from '../components/home/HomeForWho.jsx'
import HomeTestimonials from '../components/home/HomeTestimonials.jsx'
import HomeCta from '../components/home/HomeCta.jsx'
import HomeFooter from '../components/home/HomeFooter.jsx'
import { homePageShell } from '../components/home/homeTheme.js'
import { trainingSections } from '../data/sessions.js'

function countUniqueLearners(sections) {
  const ids = new Set()
  sections.forEach((s) => {
    s.students?.forEach((st) => ids.add(st.id))
  })
  return ids.size
}

/**
 * Training Sphere — playful kids-learning inspired marketing home.
 * Sections are modular under `components/home/` for maintainability.
 */
function HomePage() {
  const { isAuthenticated, role } = useAuth()
  const heroStats = useMemo(
    () => ({
      students: countUniqueLearners(trainingSections),
      trainers: ACTIVE_TRAINER_ACCOUNTS_COUNT,
      companies: 42,
    }),
    [],
  )

  const impactStats = useMemo(
    () => ({
      students: countUniqueLearners(trainingSections),
      trainers: ACTIVE_TRAINER_ACCOUNTS_COUNT,
      companies: 42,
      internshipsCompleted: 128,
      successRate: '94%',
    }),
    [],
  )

  const isCompanyUser = isAuthenticated && String(role ?? '').toLowerCase() === 'company'

  if (isCompanyUser) {
    return <Navigate to="/company/dashboard" replace />
  }

  return (
    <div className={homePageShell}>
      <HomeHero stats={heroStats} />
      <HomeFeatures />
      <HomeHowItWorks />
      <HomeStatistics metrics={impactStats} />
      <HomeForWho />
      <HomeTestimonials />
      <HomeCta />
      <HomeFooter />
    </div>
  )
}

export default HomePage
