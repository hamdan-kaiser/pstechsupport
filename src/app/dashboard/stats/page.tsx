import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatsClient } from '@/components/stats/StatsClient'

export default async function StatsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [stats, allEmployees] = await Promise.all([
    role === 'admin'
      ? prisma.statsRecord.findMany({
          where: { month, year },
          include: { user: { select: { name: true, shift: true } } },
          orderBy: { casesResolved: 'desc' },
        })
      : prisma.statsRecord.findMany({ where: { userId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
    role === 'admin'
      ? prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : [],
  ])

  return <StatsClient stats={stats} role={role} employees={allEmployees} currentMonth={month} currentYear={year} />
}
