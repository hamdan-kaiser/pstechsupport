import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyAllAdmins } from '@/lib/notifications'
import { getDayKey } from '@/lib/utils'
import { getEffectiveDayValue } from '@/lib/timetableResolve'
import { findLeaveConflict } from '@/lib/leaveConflict'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role
  if (role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const where = role === 'admin' ? {} : { userId }
  const requests = await prisma.shiftMoveRequest.findMany({
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
  const { fromDate, toDate, reason } = await req.json()
  if (!fromDate || !toDate || !reason) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const fromDateObj = new Date(fromDate)
  const toDateObj = new Date(toDate)
  fromDateObj.setUTCHours(0, 0, 0, 0)
  toDateObj.setUTCHours(0, 0, 0, 0)
  if (fromDateObj.getTime() === toDateObj.getTime()) {
    return NextResponse.json({ error: 'Pick two different days' }, { status: 400 })
  }

  const fromValue = await getEffectiveDayValue(userId, fromDateObj, getDayKey(fromDateObj))
  if (!fromValue || fromValue.toLowerCase() === 'off') {
    return NextResponse.json({ error: "You're not scheduled to work on the day you're moving from" }, { status: 400 })
  }

  const conflict = (await findLeaveConflict(userId, fromDateObj, fromDateObj)) ?? (await findLeaveConflict(userId, toDateObj, toDateObj))
  if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const request = await prisma.shiftMoveRequest.create({
    data: { userId, fromDate: fromDateObj, toDate: toDateObj, reason },
  })

  await notifyAllAdmins(
    'Shift Move Request 🔁',
    `${user.name} wants to move their ${fromDateObj.toLocaleDateString()} shift (${fromValue}) to ${toDateObj.toLocaleDateString()} instead. Reason: ${reason}`,
    'warning',
    { refType: 'shift-move', refId: request.id }
  )

  return NextResponse.json(request, { status: 201 })
}
