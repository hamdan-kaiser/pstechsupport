import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyAllAdmins } from '@/lib/notifications'
import { diffDays } from '@/lib/utils'
import { findLeaveConflict } from '@/lib/leaveConflict'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role
  if (role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const where = role === 'admin' ? {} : { userId }
  const requests = await prisma.sickRequest.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(requests)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const userId = (session.user as any).id
  const { startDate, endDate, reason } = await req.json()

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const startDateObj = new Date(startDate)
  const endDateObj = new Date(endDate)
  const conflict = await findLeaveConflict(userId, startDateObj, endDateObj)
  if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })

  const days = diffDays(startDateObj, endDateObj)

  const request = await prisma.sickRequest.create({
    data: { userId, startDate: startDateObj, endDate: endDateObj, days, reason },
  })

  await notifyAllAdmins(
    'New Sick Call 🤒',
    `${user.name} has reported sick for ${days} day(s) from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
    'warning',
    { refType: 'sick', refId: request.id }
  )

  return NextResponse.json(request, { status: 201 })
}
