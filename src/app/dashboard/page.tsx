import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { getWeekStart } from '@/lib/utils'
import { getEffectiveTimetableForWeek } from '@/lib/timetableResolve'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id

  const [user, timetable, pendingHolidays, pendingSickCalls, pendingAdditionalShifts, pendingEarlyLeaves, recentSwaps] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, shift: true, totalHolidays: true, usedHolidays: true } }),
    prisma.timetableEntry.findFirst({ where: { userId }, orderBy: { weekStart: 'desc' } }),
    prisma.holidayRequest.findMany({ where: { userId, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.sickRequest.findMany({ where: { userId, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.additionalShiftRequest.count({ where: { userId, status: 'pending' } }),
    prisma.earlyLeaveRequest.count({ where: { userId, status: 'pending' } }),
    prisma.shiftSwap.findMany({
      where: { OR: [{ requesterId: userId }, { targetId: userId }] },
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
      pendingOtherCount={pendingAdditionalShifts + pendingEarlyLeaves}
      recentSwaps={recentSwaps}
      role={(session!.user as any).role}
      currentUserId={userId}
    />
  )
}
