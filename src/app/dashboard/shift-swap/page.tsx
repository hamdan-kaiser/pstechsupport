import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ShiftSwapClient } from '@/modules/shift-management'

export default async function ShiftSwapPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id
  const role = (session!.user as any).role
  if (role === 'viewer') redirect('/dashboard')

  const [swaps, employees] = await Promise.all([
    prisma.shiftSwap.findMany({
      where: role === 'admin' ? {} : { OR: [{ requesterId: userId }, { targetId: userId }] },
      include: {
        requester: { select: { id: true, name: true, shift: true } },
        target: { select: { id: true, name: true, shift: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, name: true, shift: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return <ShiftSwapClient swaps={swaps} employees={employees} role={role} currentUserId={userId} />
}
