import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StatsClient } from '@/modules/leaderboard'
import { getMonthlyLeaveSummaryForUsers } from '@/modules/leave-attendance'

export default async function StatsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role
  if (role === 'viewer') redirect('/dashboard')
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [rawStats, allEmployees] = await Promise.all([
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

  const stats = role === 'admin'
    ? await (async () => {
        const summaries = await getMonthlyLeaveSummaryForUsers(rawStats.map(s => s.userId), month, year)
        return rawStats.map(s => ({ ...s, ...summaries[s.userId] }))
      })()
    : await Promise.all(rawStats.map(async s => {
        const summary = await getMonthlyLeaveSummaryForUsers([userId], s.month, s.year)
        return { ...s, ...summary[userId] }
      }))

  return <StatsClient stats={stats} role={role} employees={allEmployees} currentMonth={month} currentYear={year} />
}
