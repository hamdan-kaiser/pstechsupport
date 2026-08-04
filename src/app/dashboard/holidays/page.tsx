import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { HolidaysClient } from '@/components/holidays/HolidaysClient'

export default async function HolidaysPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role
  if (role === 'viewer') redirect('/dashboard')

  const [user, requests] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { totalHolidays: true, usedHolidays: true } }),
    prisma.holidayRequest.findMany({
      where: role === 'admin' ? {} : { userId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return <HolidaysClient user={user} requests={requests} role={role} />
}
