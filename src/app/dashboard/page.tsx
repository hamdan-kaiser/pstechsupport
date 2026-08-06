import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { getWeekStart } from '@/lib/utils'
import { getEffectiveTimetableForWeek } from '@/lib/timetableResolve'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role

  // Admins don't submit their own leave requests, so scoping these to the viewer's own userId
  // (as if they were an employee) always came back empty for admin — the panels looked "broken"
  // when really they were just showing an admin's non-existent personal requests. Admins need to
  // see requests awaiting THEIR action across the whole team; employees still only see their own.
  const isAdmin = role === 'admin'
  const pendingWhere = isAdmin ? { status: 'pending' } : { userId, status: 'pending' }
  const swapWhere = isAdmin ? {} : { OR: [{ requesterId: userId }, { targetId: userId }] }

  const [
    user, timetable, pendingHolidays, pendingSickCalls, pendingHolidaysCount, pendingSickCount,
    pendingAdditionalShifts, pendingEarlyLeaves, pendingLateArrivals, recentSwaps,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, shift: true, totalHolidays: true, usedHolidays: true } }),
    prisma.timetableEntry.findFirst({ where: { userId }, orderBy: { weekStart: 'desc' } }),
    prisma.holidayRequest.findMany({ where: pendingWhere, include: isAdmin ? { user: { select: { name: true } } } : undefined, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.sickRequest.findMany({ where: pendingWhere, include: isAdmin ? { user: { select: { name: true } } } : undefined, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.holidayRequest.count({ where: pendingWhere }),
    prisma.sickRequest.count({ where: pendingWhere }),
    prisma.additionalShiftRequest.count({ where: pendingWhere }),
    prisma.earlyLeaveRequest.count({ where: pendingWhere }),
    prisma.lateArrivalRequest.count({ where: pendingWhere }),
    prisma.shiftSwap.findMany({
      where: swapWhere,
      include: { requester: { select: { name: true } }, target: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ])

  // Everyone sees the full team's timetable for the current week
  const weekStart = getWeekStart()
  const allTimetables = await getEffectiveTimetableForWeek(weekStart)

  return (
    <DashboardClient
      user={user}
      timetable={timetable}
      allTimetables={allTimetables}
      pendingHolidays={pendingHolidays}
      pendingSickCalls={pendingSickCalls}
      pendingRequestsTotal={pendingHolidaysCount + pendingSickCount + pendingAdditionalShifts + pendingEarlyLeaves + pendingLateArrivals}
      recentSwaps={recentSwaps}
      role={role}
      currentUserId={userId}
    />
  )
}
