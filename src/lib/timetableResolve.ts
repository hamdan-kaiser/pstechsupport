import { prisma } from './prisma'
import { DAYS, getWeekStart } from './utils'

export interface ResolvedTimetableEntry {
  id: string
  userId: string
  weekStart: Date
  monday: string | null
  tuesday: string | null
  wednesday: string | null
  thursday: string | null
  friday: string | null
  saturday: string | null
  sunday: string | null
  user?: { name: string; shift: string }
}

function overrideDaysOf(entry: { overrideDays?: unknown }): string[] {
  return Array.isArray(entry.overrideDays) ? (entry.overrideDays as string[]) : []
}

/**
 * Resolves the effective timetable for a given week, per user per day-of-week: if a day wasn't
 * explicitly set for the requested week, carries forward the most recent prior week where that
 * same day-of-week was set as part of a genuine recurring-schedule upload — so a recurring
 * schedule doesn't need to be re-uploaded every week, and only actually changes when a new
 * upload (or approval) overrides a specific day.
 *
 * One-off overrides (an approved Holiday/Sick/Additional-Shift day, tagged via `overrideDays`)
 * apply only to the week they were made for — they're a specific date's fact, not a change to
 * the recurring pattern, so they're skipped when looking for a carry-forward value for a
 * *different* week.
 */
export async function getEffectiveTimetableForWeek(
  weekStart: Date,
  opts?: { userId?: string; userIds?: string[] }
): Promise<ResolvedTimetableEntry[]> {
  const userWhere = opts?.userId
    ? { id: opts.userId }
    : opts?.userIds
    ? { id: { in: opts.userIds } }
    : {}
  const users = await prisma.user.findMany({ where: userWhere, select: { id: true, name: true, shift: true } })
  if (users.length === 0) return []

  const allHistory = await prisma.timetableEntry.findMany({
    where: { userId: { in: users.map(u => u.id) }, weekStart: { lte: weekStart } },
    orderBy: { weekStart: 'desc' },
  })

  const historyByUser = new Map<string, typeof allHistory>()
  for (const h of allHistory) {
    if (!historyByUser.has(h.userId)) historyByUser.set(h.userId, [])
    historyByUser.get(h.userId)!.push(h)
  }

  const results: ResolvedTimetableEntry[] = []
  for (const user of users) {
    const history = historyByUser.get(user.id)
    if (!history || history.length === 0) continue

    const exact = history[0].weekStart.getTime() === weekStart.getTime() ? history[0] : null
    const resolved: ResolvedTimetableEntry = {
      id: exact?.id ?? `carried-${user.id}-${weekStart.toISOString()}`,
      userId: user.id,
      weekStart,
      monday: null, tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null, sunday: null,
      user: { name: user.name, shift: user.shift },
    }

    let hasAny = false
    for (const day of DAYS) {
      let value: string | null = null
      for (const h of history) {
        const v = (h as any)[day] as string | null
        if (!v) continue
        const isExactWeek = h.weekStart.getTime() === weekStart.getTime()
        if (!isExactWeek && overrideDaysOf(h).includes(day)) continue // one-off override, not a recurring value
        value = v
        break
      }
      ;(resolved as any)[day] = value
      if (value) hasAny = true
    }
    if (hasAny) results.push(resolved)
  }

  return results.sort((a, b) => (a.user?.name ?? '').localeCompare(b.user?.name ?? ''))
}

/** Resolves a single user's effective value for one specific day-of-week field, carrying
 *  forward from the most recent prior week's recurring value if the requested week didn't
 *  explicitly set it (see getEffectiveTimetableForWeek for the override-skip rule). */
export async function getEffectiveDayValue(userId: string, date: Date, dayKey: typeof DAYS[number]): Promise<string | null> {
  const weekStart = getWeekStart(date)
  const history = await prisma.timetableEntry.findMany({
    where: { userId, weekStart: { lte: weekStart } },
    orderBy: { weekStart: 'desc' },
  })
  for (const h of history) {
    const v = (h as any)[dayKey] as string | null
    if (!v) continue
    const isExactWeek = h.weekStart.getTime() === weekStart.getTime()
    if (!isExactWeek && overrideDaysOf(h).includes(dayKey)) continue
    return v
  }
  return null
}
