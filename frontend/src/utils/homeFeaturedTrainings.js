/** Pick up to 3 trainings for the home “programs” grid: newest first, then highest seat capacity, then any other. */

function trainingDateMs(t) {
  const d = new Date(`${t.date ?? ''}T12:00:00`)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

/**
 * @param {Array<{ id: string, date?: string, seatsTotal?: number }>} trainings
 * @returns {typeof trainings}
 */
export function selectFeaturedTrainings(trainings) {
  if (!trainings?.length) return []

  const list = [...trainings]
  const newest = list.reduce((a, b) => (trainingDateMs(b) > trainingDateMs(a) ? b : a))

  const withoutNewest = list.filter((t) => t.id !== newest.id)
  const highestSeats =
    withoutNewest.length === 0
      ? null
      : withoutNewest.reduce((a, b) => ((b.seatsTotal ?? 0) > (a.seatsTotal ?? 0) ? b : a))

  const picked = new Set([newest.id])
  if (highestSeats) picked.add(highestSeats.id)

  const third = list.find((t) => !picked.has(t.id)) ?? null

  return [newest, highestSeats, third].filter(Boolean)
}
