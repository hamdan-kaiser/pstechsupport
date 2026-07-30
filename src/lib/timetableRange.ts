import { prisma } from './prisma'
import { getWeekStart, getDayKey } from './utils'

function eachDate(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const cur = new Date(startDate)
  const end = new Date(endDate)
  while (cur <= end) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

/** Snapshot of each affected day's timetable value, keyed by ISO date ("YYYY-MM-DD"), taken
 *  before a leave request overwrites it — so it can be restored if later un-approved. */
export async function snapshotTimetableRange(userId: string, startDate: Date, endDate: Date): Promise<Record<string, string | null>> {
  const snapshot: Record<string, string | null> = {}
  for (const date of eachDate(startDate, endDate)) {
    const weekStart = getWeekStart(date)
    const dayKey = getDayKey(date)
    const entry = await prisma.timetableEntry.findUnique({ where: { userId_weekStart: { userId, weekStart } } })
    snapshot[date.toISOString().slice(0, 10)] = entry ? (((entry as any)[dayKey] as string | null) ?? null) : null
  }
  return snapshot
}

/** Overwrites every day in the range with `value` (e.g. "Holiday", "Sick Off"). */
export async function markTimetableRange(userId: string, startDate: Date, endDate: Date, value: string) {
  const updates = eachDate(startDate, endDate).map(date => {
    const weekStart = getWeekStart(date)
    const dayKey = getDayKey(date)
    return prisma.timetableEntry.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: { [dayKey]: value },
      create: { userId, weekStart, [dayKey]: value },
    })
  })
  await Promise.all(updates)
}

/** Restores a previously taken snapshot — used when an approved leave request is reversed. */
export async function restoreTimetableSnapshot(userId: string, snapshot: unknown) {
  if (!snapshot || typeof snapshot !== 'object') return
  const entries = Object.entries(snapshot as Record<string, string | null>)
  const updates = entries.map(([iso, value]) => {
    const date = new Date(`${iso}T00:00:00.000Z`)
    const weekStart = getWeekStart(date)
    const dayKey = getDayKey(date)
    return prisma.timetableEntry.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: { [dayKey]: value },
      create: { userId, weekStart, [dayKey]: value },
    })
  })
  await Promise.all(updates)
}
