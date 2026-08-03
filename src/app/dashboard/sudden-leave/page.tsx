import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SuddenLeaveClient } from '@/components/suddenleave/SuddenLeaveClient'
import { getDayKey, getShiftEndTime } from '@/lib/utils'
import { getEffectiveDayValue } from '@/lib/timetableResolve'

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
  today.setUTCHours(0, 0, 0, 0)
  const dayKey = getDayKey(today)
  const todayShift = await getEffectiveDayValue(userId, today, dayKey)
  const shiftEnd = getShiftEndTime(todayShift)

  return <SuddenLeaveClient requests={requests} role={role} todayShift={todayShift} shiftEnd={shiftEnd} />
}
