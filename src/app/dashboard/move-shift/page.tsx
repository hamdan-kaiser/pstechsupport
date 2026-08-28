import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MoveShiftClient } from '@/modules/shift-management'

export default async function MoveShiftPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role
  if (role === 'viewer') redirect('/dashboard')

  const requests = await prisma.shiftMoveRequest.findMany({
    where: role === 'admin' ? {} : { userId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return <MoveShiftClient requests={requests} role={role} currentUserId={userId} />
}
