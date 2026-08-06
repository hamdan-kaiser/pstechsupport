import { prisma } from './prisma'

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

/** Checks whether a user already has a pending or approved Holiday, Sick, or Additional Shift
 *  request covering any day in [startDate, endDate] — used to stop someone from double-booking
 *  the same day across request types (or overlapping requests of the same type). Pass
 *  `excludeId` when checking an edit/re-check of a request against itself. */
export async function findLeaveConflict(
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string
): Promise<string | null> {
  const [holidays, sicks, additionalShifts, lateArrivals] = await Promise.all([
    prisma.holidayRequest.findMany({ where: { userId, status: { in: ['pending', 'approved'] } } }),
    prisma.sickRequest.findMany({ where: { userId, status: { in: ['pending', 'approved'] } } }),
    prisma.additionalShiftRequest.findMany({ where: { userId, status: { in: ['pending', 'approved'] } } }),
    prisma.lateArrivalRequest.findMany({ where: { userId, status: { in: ['pending', 'approved'] } } }),
  ])

  for (const h of holidays) {
    if (h.id === excludeId) continue
    if (rangesOverlap(startDate, endDate, h.startDate, h.endDate)) {
      return `You already have a ${h.status} holiday request covering this date.`
    }
  }
  for (const s of sicks) {
    if (s.id === excludeId) continue
    if (rangesOverlap(startDate, endDate, s.startDate, s.endDate)) {
      return `You already have a ${s.status} sick call covering this date.`
    }
  }
  for (const a of additionalShifts) {
    if (a.id === excludeId) continue
    if (rangesOverlap(startDate, endDate, a.date, a.date)) {
      return `You already have a ${a.status} additional shift request for this date.`
    }
  }
  for (const l of lateArrivals) {
    if (l.id === excludeId) continue
    if (rangesOverlap(startDate, endDate, l.date, l.date)) {
      return `You already have a ${l.status} late arrival request for this date.`
    }
  }
  return null
}
