import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { getWeekStart } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id

  const [user, timetable, pendingHolidays, recentSwaps] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, shift: true, totalHolidays: true, usedHolidays: true } }),
    prisma.timetableEntry.findFirst({ where: { userId }, orderBy: { weekStart: 'desc' } }),
    prisma.holidayRequest.findMany({ where: { userId, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.shiftSwap.findMany({
      where: { OR: [{ requesterId: userId }, { targetId: userId }] },
      include: { requester: { select: { name: true } }, target: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ])

  // For admin: get all timetable entries for current week
  let allTimetables: any[] = []
  if ((session!.user as any).role === 'admin') {
    const weekStart = getWeekStart()
    allTimetables = await prisma.timetableEntry.findMany({
      where: { weekStart },
      include: { user: { select: { name: true, shift: true } } },
    })
  } else {
    // Employee sees their own timetable
    const weekStart = getWeekStart()
    const entry = await prisma.timetableEntry.findFirst({ where: { userId, weekStart } })
    if (entry) allTimetables = [{ ...entry, user: { name: user?.name, shift: user?.shift } }]
  }

  return (
    <DashboardClient
      user={user}
      timetable={timetable}
      allTimetables={allTimetables}
      pendingHolidays={pendingHolidays}
      recentSwaps={recentSwaps}
      role={(session!.user as any).role}
    />
  )
}
