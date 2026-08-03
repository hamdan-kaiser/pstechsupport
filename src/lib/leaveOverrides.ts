import { prisma } from './prisma'
import { DAYS } from './utils'

/** For a given user/week, returns which days must show "Holiday" or "Sick Off" because of an
 *  approved request covering that date — used to stop a timetable re-upload from silently
 *  erasing approved leave that was already written to the timetable. */
export async function getLeaveOverridesForWeek(userId: string, weekStart: Date): Promise<Partial<Record<typeof DAYS[number], string>>> {
  const [holidays, sicks] = await Promise.all([
    prisma.holidayRequest.findMany({ where: { userId, status: 'approved' } }),
    prisma.sickRequest.findMany({ where: { userId, status: 'approved' } }),
  ])
  if (holidays.length === 0 && sicks.length === 0) return {}

  const overrides: Partial<Record<typeof DAYS[number], string>> = {}
  const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end

  DAYS.forEach((dayKey, i) => {
    const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)
    if (sicks.some(s => inRange(date, s.startDate, s.endDate))) overrides[dayKey] = 'Sick Off'
    else if (holidays.some(h => inRange(date, h.startDate, h.endDate))) overrides[dayKey] = 'Holiday'
  })
  return overrides
}
