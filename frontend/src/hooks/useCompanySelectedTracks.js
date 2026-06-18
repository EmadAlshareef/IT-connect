import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addCompanySelectedTrack,
  listCompanySelectedTrackValues,
  listenCompanySelectedTracksChanged,
  refreshCompanySelectedTracksFromApi,
  removeCompanySelectedTrack,
} from '../utils/companySelectedTracks.js'

export function useCompanySelectedTracks(companyEmail) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    void refreshCompanySelectedTracksFromApi(companyEmail).then(() => setTick((n) => n + 1))
    return listenCompanySelectedTracksChanged(() => setTick((n) => n + 1))
  }, [companyEmail])

  const selectedValues = useMemo(
    () => listCompanySelectedTrackValues(companyEmail),
    [companyEmail, tick],
  )

  const addTrack = useCallback(
    async (option) => {
      if (!option?.value) return false
      const ok = await addCompanySelectedTrack(companyEmail, {
        trackValue: option.value,
        title: option.title ?? '',
      })
      if (ok) setTick((n) => n + 1)
      return ok
    },
    [companyEmail],
  )

  const removeTrack = useCallback(
    async (trackValue) => {
      const ok = await removeCompanySelectedTrack(companyEmail, trackValue)
      if (ok) setTick((n) => n + 1)
      return ok
    },
    [companyEmail],
  )

  const isSelected = useCallback(
    (trackValue) => selectedValues.includes(String(trackValue ?? '').trim()),
    [selectedValues],
  )

  return { selectedValues, addTrack, removeTrack, isSelected }
}
