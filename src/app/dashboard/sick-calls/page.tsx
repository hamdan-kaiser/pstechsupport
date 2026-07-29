import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SickCallClient } from '@/components/sick/SickCallClient'

export default async function SickCallsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role

  const requests = await prisma.sickRequest.findMany({
    where: role === 'admin' || role === 'viewer' ? {} : { userId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return <SickCallClient requests={requests} role={role} />
}
