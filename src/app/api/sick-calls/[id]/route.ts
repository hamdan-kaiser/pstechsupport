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

  const sick = await prisma.sickRequest.findUnique({ where: { id: params.id }, include: { user: true } })
  if (!sick) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const wasApproved = sick.status === 'approved'
  await prisma.sickRequest.update({ where: { id: params.id }, data: { status } })

  if (status === 'approved' && !wasApproved) {
    const previousValues = await snapshotTimetableRange(sick.userId, sick.startDate, sick.endDate)
    await prisma.sickRequest.update({ where: { id: params.id }, data: { previousValues } })
    await markTimetableRange(sick.userId, sick.startDate, sick.endDate, 'Sick Off')
  } else if (status !== 'approved' && wasApproved) {
    await restoreTimetableSnapshot(sick.userId, sick.previousValues)
  }

  await createNotification(
    sick.userId,
    `Sick Call ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
    wasApproved && status !== 'approved'
      ? `Your previously approved sick call for ${sick.days} day(s) has been reversed. Your timetable has been restored.`
      : `Your sick call for ${sick.days} day(s) has been ${status}.`,
    status === 'approved' ? 'success' : 'error'
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role

  const sick = await prisma.sickRequest.findUnique({ where: { id: params.id } })
  if (!sick) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (sick.userId !== userId && role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (sick.status === 'approved') return NextResponse.json({ error: 'Cannot delete approved request' }, { status: 400 })

  await prisma.sickRequest.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
