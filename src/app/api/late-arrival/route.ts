import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, notifyAllAdmins } from '@/lib/notifications'
import { getDayKey, getShiftStartTime, buildLateArrivalValue } from '@/lib/utils'
import { getEffectiveDayValue } from '@/lib/timetableResolve'
import { findLeaveConflict } from '@/lib/leaveConflict'
import { snapshotTimetableRange, markTimetableRange } from '@/lib/timetableRange'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role
  if (role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const where = role === 'admin' ? {} : { userId }
  const requests = await prisma.lateArrivalRequest.findMany({
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
  const selfId = (session.user as any).id

  const body = await req.json()
  const onBehalf = role === 'admin' && !!body.userId
  const targetUserId = onBehalf ? body.userId : selfId
  const { joiningTime, reason } = body
  if (!joiningTime || !reason) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const dateObj = onBehalf && body.date ? new Date(body.date) : new Date()
  dateObj.setUTCHours(0, 0, 0, 0)

  const dayKey = getDayKey(dateObj)
  const todayShift = await getEffectiveDayValue(targetUserId, dateObj, dayKey)
  const shiftStart = getShiftStartTime(todayShift)
  if (!shiftStart) return NextResponse.json({ error: "No recognized shift scheduled that day" }, { status: 400 })
  if (joiningTime <= shiftStart) return NextResponse.json({ error: `Joining time must be later than the shift start (${shiftStart})` }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const conflict = await findLeaveConflict(targetUserId, dateObj, dateObj)
  if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })

  if (onBehalf) {
    // Admin is entering this directly on the employee's behalf — apply it immediately rather
    // than routing through a redundant self-approval step.
    const isoDate = dateObj.toISOString().slice(0, 10)
    const previousValues = await snapshotTimetableRange(targetUserId, dateObj, dateObj)
    const label = buildLateArrivalValue(previousValues[isoDate], joiningTime)
    const request = await prisma.lateArrivalRequest.create({
      data: { userId: targetUserId, date: dateObj, joiningTime, shiftStart, reason, status: 'approved', previousValues },
    })
    await markTimetableRange(targetUserId, dateObj, dateObj, label)
    await createNotification(
      targetUserId,
      'Late Arrival Recorded 🕒',
      `Admin recorded a late arrival for you on ${dateObj.toLocaleDateString()}: joining at ${joiningTime}. Reason: ${reason}`,
      'info'
    )
    return NextResponse.json(request, { status: 201 })
  }

  const request = await prisma.lateArrivalRequest.create({
    data: { userId: targetUserId, date: dateObj, joiningTime, shiftStart, reason },
  })

  await notifyAllAdmins(
    'Late Arrival Request 🕒',
    `${user.name} will join late today at ${joiningTime} (usual start ${shiftStart}). Reason: ${reason}`,
    'warning',
    { refType: 'late-arrival', refId: request.id }
  )

  return NextResponse.json(request, { status: 201 })
}
