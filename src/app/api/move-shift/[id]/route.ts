import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/modules/notifications'
import { snapshotTimetableRange, markTimetableRange, restoreTimetableSnapshot } from '@/modules/timetable'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  if (!['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const request = await prisma.shiftMoveRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const wasApproved = request.status === 'approved'
  await prisma.shiftMoveRequest.update({ where: { id: params.id }, data: { status } })

  if (status === 'approved' && !wasApproved) {
    // Snapshot both days first (each is its own single-day range — they may fall in different
    // weeks), then swap their values: the destination day gets what the origin day used to have,
    // and the origin day gets whatever the destination day used to have (typically OFF).
    const fromIso = request.fromDate.toISOString().slice(0, 10)
    const toIso = request.toDate.toISOString().slice(0, 10)
    const previousValues = {
      ...(await snapshotTimetableRange(request.userId, request.fromDate, request.fromDate)),
      ...(await snapshotTimetableRange(request.userId, request.toDate, request.toDate)),
    }
    await prisma.shiftMoveRequest.update({ where: { id: params.id }, data: { previousValues } })

    const oldFromValue = previousValues[fromIso]
    const oldToValue = previousValues[toIso]
    await markTimetableRange(request.userId, request.fromDate, request.fromDate, oldToValue ?? 'OFF')
    await markTimetableRange(request.userId, request.toDate, request.toDate, oldFromValue ?? 'OFF')
  } else if (status !== 'approved' && wasApproved) {
    await restoreTimetableSnapshot(request.userId, request.previousValues)
  }

  await createNotification(
    request.userId,
    `Shift Move ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
    wasApproved && status !== 'approved'
      ? `Your previously approved shift move has been reversed. Your timetable has been restored.`
      : `Your request to move your ${request.fromDate.toLocaleDateString()} shift to ${request.toDate.toLocaleDateString()} has been ${status}.`,
    status === 'approved' ? 'success' : 'error'
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role

  const request = await prisma.shiftMoveRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.userId !== userId && role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (request.status === 'approved') return NextResponse.json({ error: 'Cannot delete approved request' }, { status: 400 })

  await prisma.shiftMoveRequest.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
