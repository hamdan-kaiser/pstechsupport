import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { getWeekStart, getDayKey } from '@/lib/utils'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  if (!['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const request = await prisma.additionalShiftRequest.findUnique({ where: { id: params.id }, include: { user: true } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.additionalShiftRequest.update({ where: { id: params.id }, data: { status } })

  if (status === 'approved') {
    const weekStart = getWeekStart(request.date)
    const dayKey = getDayKey(request.date)
    await prisma.timetableEntry.upsert({
      where: { userId_weekStart: { userId: request.userId, weekStart } },
      update: { [dayKey]: request.shift },
      create: { userId: request.userId, weekStart, [dayKey]: request.shift },
    })
    // Working an additional day off gives back a holiday day, floored at 0
    await prisma.user.update({
      where: { id: request.userId },
      data: { usedHolidays: { decrement: 1 } },
    })
    const refreshed = await prisma.user.findUnique({ where: { id: request.userId }, select: { usedHolidays: true } })
    if (refreshed && refreshed.usedHolidays < 0) {
      await prisma.user.update({ where: { id: request.userId }, data: { usedHolidays: 0 } })
    }
  }

  await createNotification(
    request.userId,
    `Additional Shift ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
    `Your additional shift request for ${request.date.toLocaleDateString()} has been ${status}.`,
    status === 'approved' ? 'success' : 'error'
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role

  const request = await prisma.additionalShiftRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.userId !== userId && role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (request.status === 'approved') return NextResponse.json({ error: 'Cannot delete approved request' }, { status: 400 })

  await prisma.additionalShiftRequest.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
