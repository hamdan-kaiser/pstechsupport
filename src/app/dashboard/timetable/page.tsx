import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TimetableClient } from '@/components/timetable/TimetableClient'
import { getWeekStart } from '@/lib/utils'
import { getEffectiveTimetableForWeek } from '@/lib/timetableResolve'

export default async function TimetablePage() {
  const session = await getServerSession(authOptions)
  const role = (session!.user as any).role
  const currentUserId = (session!.user as any).id
  const weekStart = getWeekStart()

  const [entries, employees] = await Promise.all([
    getEffectiveTimetableForWeek(weekStart),
    role === 'admin'
      ? prisma.user.findMany({ select: { id: true, name: true, shift: true }, orderBy: { name: 'asc' } })
      : [],
  ])

  return <TimetableClient entries={entries} employees={employees} role={role} weekStart={weekStart.toISOString()} currentUserId={currentUserId} />
}
