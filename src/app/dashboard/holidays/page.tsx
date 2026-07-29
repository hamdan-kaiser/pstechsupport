import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HolidaysClient } from '@/components/holidays/HolidaysClient'
import { getUsedHolidayDays } from '@/lib/holidayUsage'

export default async function HolidaysPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role

  const [user, requests, usedHolidays] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { totalHolidays: true, usedHolidays: true } }),
    prisma.holidayRequest.findMany({
      where: role === 'admin' ? {} : { userId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    getUsedHolidayDays(userId),
  ])

  return <HolidaysClient user={user ? { ...user, usedHolidays } : user} requests={requests} role={role} />
}
