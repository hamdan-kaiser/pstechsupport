import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyAllAdmins } from '@/lib/notifications'
import { getDayKey, getShiftEndTime } from '@/lib/utils'
import { getEffectiveDayValue } from '@/lib/timetableResolve'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role

  const where = role === 'admin' || role === 'viewer' ? {} : { userId }
  const requests = await prisma.earlyLeaveRequest.findMany({
    where,
    include: { user: { select: { name: true } } },
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
  const { leaveTime, reason } = await req.json()
  if (!leaveTime || !reason) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const dayKey = getDayKey(today)
  const todayShift = await getEffectiveDayValue(userId, today, dayKey)
  const shiftEnd = getShiftEndTime(todayShift)

  if (!shiftEnd) return NextResponse.json({ error: "You don't have a recognized shift scheduled today" }, { status: 400 })
  if (leaveTime >= shiftEnd) return NextResponse.json({ error: `Leave time must be before your shift ends at ${shiftEnd}` }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const request = await prisma.earlyLeaveRequest.create({
    data: { userId, date: today, leaveTime, shiftEnd, reason },
  })

  await notifyAllAdmins(
    'Sudden Leave Request 🚪',
    `${user.name} needs to leave early today at ${leaveTime} (shift ends ${shiftEnd}). Reason: ${reason}`,
    'warning',
    { refType: 'early-leave', refId: request.id }
  )

  return NextResponse.json(request, { status: 201 })
}
