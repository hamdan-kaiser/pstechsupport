import { prisma } from './prisma'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

/** Counts actual "Holiday" days in a user's timetable — the single source of truth for
 *  holidays used, since a day can be marked Holiday either via an approved HolidayRequest
 *  or a direct admin/Excel timetable edit. */
export async function getUsedHolidayDays(userId: string): Promise<number> {
  const entries = await prisma.timetableEntry.findMany({ where: { userId } })
  let count = 0
  for (const entry of entries) {
    for (const day of DAYS) {
      const value = (entry as any)[day] as string | null
      if (value && value.toLowerCase().includes('holiday')) count++
    }
  }
  return count
}

/** Batch version for a list of users, e.g. the admin Employees list. */
export async function getUsedHolidayDaysForUsers(userIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const id of userIds) counts[id] = 0
  if (userIds.length === 0) return counts

  const entries = await prisma.timetableEntry.findMany({ where: { userId: { in: userIds } } })
  for (const entry of entries) {
    for (const day of DAYS) {
      const value = (entry as any)[day] as string | null
      if (value && value.toLowerCase().includes('holiday')) counts[entry.userId] = (counts[entry.userId] ?? 0) + 1
    }
  }
  return counts
}
