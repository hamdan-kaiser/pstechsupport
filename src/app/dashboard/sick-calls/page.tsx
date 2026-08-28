import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SickCallClient } from '@/modules/leave-attendance/components/SickCallClient'

export default async function SickCallsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role
  if (role === 'viewer') redirect('/dashboard')

  const requests = await prisma.sickRequest.findMany({
    where: role === 'admin' ? {} : { userId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return <SickCallClient requests={requests} role={role} />
}
