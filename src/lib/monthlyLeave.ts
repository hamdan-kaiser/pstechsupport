import { prisma } from './prisma'

function daysOverlapInMonth(start: Date, end: Date, month: number, year: number): number {
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  const overlapStart = start > monthStart ? start : monthStart
  const overlapEnd = end < monthEnd ? end : monthEnd
  if (overlapStart > overlapEnd) return 0
  return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1
}

export interface MonthlyLeaveSummary {
  holidaysTaken: number
  sickDays: number
  earlyLeaves: number
  lateArrivals: number
}

/** Batch version: monthly Holiday/Sick/Early-Leave/Late-Arrival counts for a list of users, for one month/year. */
export async function getMonthlyLeaveSummaryForUsers(
  userIds: string[],
  month: number,
  year: number
): Promise<Record<string, MonthlyLeaveSummary>> {
  const summary: Record<string, MonthlyLeaveSummary> = {}
  for (const id of userIds) summary[id] = { holidaysTaken: 0, sickDays: 0, earlyLeaves: 0, lateArrivals: 0 }
  if (userIds.length === 0) return summary

  // Widen the request-fetch window generously around the target month so multi-day
  // requests spanning the month boundary are still included.
  const rangeStart = new Date(Date.UTC(year, month - 2, 1))
  const rangeEnd = new Date(Date.UTC(year, month + 1, 0))

  const [holidays, sicks, earlyLeaves, lateArrivals] = await Promise.all([
    prisma.holidayRequest.findMany({
      where: { userId: { in: userIds }, status: 'approved', startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } },
    }),
    prisma.sickRequest.findMany({
      where: { userId: { in: userIds }, status: 'approved', startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } },
    }),
    prisma.earlyLeaveRequest.findMany({
      where: { userId: { in: userIds }, status: 'approved', date: { gte: rangeStart, lte: rangeEnd } },
    }),
    prisma.lateArrivalRequest.findMany({
      where: { userId: { in: userIds }, status: 'approved', date: { gte: rangeStart, lte: rangeEnd } },
    }),
  ])

  for (const h of holidays) summary[h.userId].holidaysTaken += daysOverlapInMonth(h.startDate, h.endDate, month, year)
  for (const s of sicks) summary[s.userId].sickDays += daysOverlapInMonth(s.startDate, s.endDate, month, year)
  for (const e of earlyLeaves) summary[e.userId].earlyLeaves += 1
  for (const l of lateArrivals) summary[l.userId].lateArrivals += 1

  return summary
}

export async function getMonthlyLeaveSummary(userId: string, month: number, year: number): Promise<MonthlyLeaveSummary> {
  const all = await getMonthlyLeaveSummaryForUsers([userId], month, year)
  return all[userId]
}
