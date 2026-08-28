import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/modules/notifications'
import { snapshotTimetableRange, markTimetableRange, restoreTimetableSnapshot } from '@/modules/timetable'
import { buildEarlyLeaveValue } from '@/lib/utils'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  if (!['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const request = await prisma.earlyLeaveRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const wasApproved = request.status === 'approved'
  await prisma.earlyLeaveRequest.update({ where: { id: params.id }, data: { status } })

  if (status === 'approved' && !wasApproved) {
    const isoDate = request.date.toISOString().slice(0, 10)
    const previousValues = await snapshotTimetableRange(request.userId, request.date, request.date)
    await prisma.earlyLeaveRequest.update({ where: { id: params.id }, data: { previousValues } })
    const label = buildEarlyLeaveValue(previousValues[isoDate], request.leaveTime)
    await markTimetableRange(request.userId, request.date, request.date, label)
  } else if (status !== 'approved' && wasApproved) {
    await restoreTimetableSnapshot(request.userId, request.previousValues)
  }

  await createNotification(
    request.userId,
    `Sudden Leave ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
    wasApproved && status !== 'approved'
      ? `Your previously approved sudden leave has been reversed. Your timetable has been restored.`
      : `Your sudden leave request for ${request.leaveTime} today has been ${status}.${status === 'approved' ? ' Your timetable has been updated to reflect the early departure.' : ''}`,
    status === 'approved' ? 'success' : 'error'
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role

  const request = await prisma.earlyLeaveRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.userId !== userId && role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (request.status === 'approved') return NextResponse.json({ error: 'Cannot delete approved request' }, { status: 400 })

  await prisma.earlyLeaveRequest.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
