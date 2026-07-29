import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TimetableClient } from '@/components/timetable/TimetableClient'
import { getWeekStart } from '@/lib/utils'

export default async function TimetablePage() {
  const session = await getServerSession(authOptions)
  const role = (session!.user as any).role
  const weekStart = getWeekStart()

  const [entries, employees] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: { weekStart },
      include: { user: { select: { name: true, shift: true } } },
      orderBy: { user: { name: 'asc' } },
    }),
    role === 'admin'
      ? prisma.user.findMany({ select: { id: true, name: true, shift: true }, orderBy: { name: 'asc' } })
      : [],
  ])

  return <TimetableClient entries={entries} employees={employees} role={role} weekStart={weekStart.toISOString()} />
}
