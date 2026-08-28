import { prisma } from '@/lib/prisma'
import { getWeekStart, getDayKey } from '@/lib/utils'
import { getEffectiveDayValue } from './timetableResolve'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function eachDate(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  // Plain UTC millisecond steps — immune to local-timezone getDate/setDate quirks (DST, etc.)
  for (let t = startDate.getTime(); t <= endDate.getTime(); t += ONE_DAY_MS) {
    dates.push(new Date(t))
  }
  return dates
}

function toOverrideArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : []
}

/** Snapshot of each affected day's EFFECTIVE timetable value (accounting for carry-forward from
 *  an earlier week if this week never explicitly set it), keyed by ISO date, taken before a
 *  leave request overwrites it — so it can be restored if later un-approved. */
export async function snapshotTimetableRange(userId: string, startDate: Date, endDate: Date): Promise<Record<string, string | null>> {
  const snapshot: Record<string, string | null> = {}
  for (const date of eachDate(startDate, endDate)) {
    const dayKey = getDayKey(date)
    snapshot[date.toISOString().slice(0, 10)] = await getEffectiveDayValue(userId, date, dayKey)
  }
  return snapshot
}

/** Overwrites every day in the range with `value` (e.g. "Holiday", "Sick Off") and flags each
 *  touched day as a one-off override — so it applies to this week only and never gets carried
 *  forward into later weeks the way a genuine recurring schedule upload does. */
export async function markTimetableRange(userId: string, startDate: Date, endDate: Date, value: string) {
  const byWeek = new Map<string, { weekStart: Date; dayKeys: string[] }>()
  for (const date of eachDate(startDate, endDate)) {
    const weekStart = getWeekStart(date)
    const mapKey = weekStart.toISOString()
    if (!byWeek.has(mapKey)) byWeek.set(mapKey, { weekStart, dayKeys: [] })
    byWeek.get(mapKey)!.dayKeys.push(getDayKey(date))
  }

  for (const { weekStart, dayKeys } of Array.from(byWeek.values())) {
    const existing = await prisma.timetableEntry.findUnique({ where: { userId_weekStart: { userId, weekStart } } })
    const mergedOverrides = Array.from(new Set([...toOverrideArray(existing?.overrideDays), ...dayKeys]))
    const dayUpdates: Record<string, string> = {}
    for (const dayKey of dayKeys) dayUpdates[dayKey] = value
    await prisma.timetableEntry.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: { ...dayUpdates, overrideDays: mergedOverrides },
      create: { userId, weekStart, ...dayUpdates, overrideDays: mergedOverrides },
    })
  }
}

/** Restores a previously taken snapshot and clears the override flag on those days — used when
 *  an approved leave request is reversed. */
export async function restoreTimetableSnapshot(userId: string, snapshot: unknown) {
  if (!snapshot || typeof snapshot !== 'object') return

  const byWeek = new Map<string, { weekStart: Date; days: Record<string, string | null> }>()
  for (const [iso, value] of Object.entries(snapshot as Record<string, string | null>)) {
    const date = new Date(`${iso}T00:00:00.000Z`)
    const weekStart = getWeekStart(date)
    const mapKey = weekStart.toISOString()
    if (!byWeek.has(mapKey)) byWeek.set(mapKey, { weekStart, days: {} })
    byWeek.get(mapKey)!.days[getDayKey(date)] = value
  }

  for (const { weekStart, days } of Array.from(byWeek.values())) {
    const existing = await prisma.timetableEntry.findUnique({ where: { userId_weekStart: { userId, weekStart } } })
    const restoredKeys = Object.keys(days)
    const remainingOverrides = toOverrideArray(existing?.overrideDays).filter(d => !restoredKeys.includes(d))
    await prisma.timetableEntry.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: { ...days, overrideDays: remainingOverrides },
      create: { userId, weekStart, ...days, overrideDays: remainingOverrides },
    })
  }
}
