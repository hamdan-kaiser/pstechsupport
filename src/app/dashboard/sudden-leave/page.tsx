import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SuddenLeaveClient } from '@/components/suddenleave/SuddenLeaveClient'
import { getWeekStart, getDayKey, getShiftEndTime } from '@/lib/utils'

export default async function SuddenLeavePage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role

  const requests = await prisma.earlyLeaveRequest.findMany({
    where: role === 'admin' || role === 'viewer' ? {} : { userId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = getWeekStart(today)
  const dayKey = getDayKey(today)
  const entry = await prisma.timetableEntry.findUnique({ where: { userId_weekStart: { userId, weekStart } } })
  const todayShift = entry ? ((entry as any)[dayKey] as string | null) : null
  const shiftEnd = getShiftEndTime(todayShift)

  return <SuddenLeaveClient requests={requests} role={role} todayShift={todayShift} shiftEnd={shiftEnd} />
}
