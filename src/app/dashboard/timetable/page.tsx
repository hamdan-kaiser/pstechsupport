import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { prisma } from '@/lib/prisma'
import { TimetableClient } from '@/modules/timetable/components/TimetableClient'
import { getWeekStart } from '@/lib/utils'
import { getEffectiveTimetableForWeek } from '@/modules/timetable'

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
