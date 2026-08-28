import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdditionalShiftClient } from '@/modules/shift-management'

export default async function AdditionalShiftPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role
  if (role === 'viewer') redirect('/dashboard')

  const requests = await prisma.additionalShiftRequest.findMany({
    where: role === 'admin' ? {} : { userId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return <AdditionalShiftClient requests={requests} role={role} currentUserId={userId} />
}
