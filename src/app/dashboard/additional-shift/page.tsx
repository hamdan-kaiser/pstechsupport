import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdditionalShiftClient } from '@/components/additionalshift/AdditionalShiftClient'

export default async function AdditionalShiftPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role

  const requests = await prisma.additionalShiftRequest.findMany({
    where: role === 'admin' || role === 'viewer' ? {} : { userId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return <AdditionalShiftClient requests={requests} role={role} currentUserId={userId} />
}
