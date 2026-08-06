import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { findLeaveConflict } from '@/lib/leaveConflict'
import { snapshotTimetableRange, markTimetableRange } from '@/lib/timetableRange'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role
  if (role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const where = role === 'admin' ? {} : { userId }
  const requests = await prisma.shiftChangeRequest.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(requests)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, date, newShift, reason } = await req.json()
  if (!userId || !date || !newShift || !reason) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const dateObj = new Date(date)
  dateObj.setUTCHours(0, 0, 0, 0)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const conflict = await findLeaveConflict(userId, dateObj, dateObj)
  if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })

  const previousValues = await snapshotTimetableRange(userId, dateObj, dateObj)
  const request = await prisma.shiftChangeRequest.create({
    data: { userId, date: dateObj, newShift, reason, previousValues },
  })
  await markTimetableRange(userId, dateObj, dateObj, newShift)

  await createNotification(
    userId,
    'Shift Changed 🔄',
    `Admin changed your shift on ${dateObj.toLocaleDateString()} to ${newShift}. Reason: ${reason}`,
    'info'
  )

  return NextResponse.json(request, { status: 201 })
}
