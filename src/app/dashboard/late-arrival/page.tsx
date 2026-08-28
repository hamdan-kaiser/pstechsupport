import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { LateArrivalClient } from '@/modules/leave-attendance/components/LateArrivalClient'
import { getDayKey, getShiftStartTime } from '@/lib/utils'
import { getEffectiveDayValue } from '@/modules/timetable'

export default async function LateArrivalPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role
  if (role === 'viewer') redirect('/dashboard')

  const [requests, employees] = await Promise.all([
    prisma.lateArrivalRequest.findMany({
      where: role === 'admin' ? {} : { userId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    role === 'admin' ? prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
  ])

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const dayKey = getDayKey(today)
  const todayShift = await getEffectiveDayValue(userId, today, dayKey)
  const shiftStart = getShiftStartTime(todayShift)

  return (
    <LateArrivalClient
      requests={requests}
      role={role}
      employees={employees}
      todayShift={todayShift}
      shiftStart={shiftStart}
      currentUserId={userId}
    />
  )
}
