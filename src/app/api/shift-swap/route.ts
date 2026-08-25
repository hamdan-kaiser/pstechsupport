import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, notifyAllAdmins } from '@/lib/notifications'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role
  if (role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const where = role === 'admin' ? {} : { OR: [{ requesterId: userId }, { targetId: userId }] }
  const swaps = await prisma.shiftSwap.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true, shift: true } },
      target: { select: { id: true, name: true, shift: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(swaps)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const requesterId = (session.user as any).id
  const { targetId, swapDate, requesterShift, targetShift } = await req.json()

  if (requesterId === targetId) return NextResponse.json({ error: 'Cannot swap with yourself' }, { status: 400 })

  const swapDateObj = new Date(swapDate)

  // Check if target already has a shift on that date
  const targetTimetable = await prisma.timetableEntry.findFirst({
    where: { userId: targetId },
    orderBy: { weekStart: 'desc' },
  })

  // Check for existing pending swap for target on same date
  const conflict = await prisma.shiftSwap.findFirst({
    where: {
      targetId,
      swapDate: swapDateObj,
      status: { in: ['pending', 'approved'] },
    },
  })
  if (conflict) return NextResponse.json({ error: 'User already has a pending swap on that date' }, { status: 409 })

  const [requester, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: requesterId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { name: true } }),
  ])

  const swap = await prisma.shiftSwap.create({
    data: { requesterId, targetId, swapDate: swapDateObj, requesterShift, targetShift },
  })

  await createNotification(
    targetId,
    'Shift Swap Request 🔄',
    `${requester?.name} wants to swap shifts with you on ${swapDateObj.toLocaleDateString()}. They'd cover your shift (${targetShift}), and you'd cover theirs (${requesterShift}).`,
    'warning',
    { refType: 'shiftswap-accept', refId: swap.id }
  )

  return NextResponse.json(swap, { status: 201 })
}
