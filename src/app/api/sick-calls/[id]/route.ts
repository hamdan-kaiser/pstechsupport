import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { getWeekStart } from '@/lib/utils'

const JS_DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

async function markTimetableRange(userId: string, startDate: Date, endDate: Date, value: string) {
  const updates = []
  const cur = new Date(startDate)
  const end = new Date(endDate)
  while (cur <= end) {
    const weekStart = getWeekStart(cur)
    const dayKey = JS_DAY_KEYS[cur.getDay()]
    updates.push(
      prisma.timetableEntry.upsert({
        where: { userId_weekStart: { userId, weekStart } },
        update: { [dayKey]: value },
        create: { userId, weekStart, [dayKey]: value },
      })
    )
    cur.setDate(cur.getDate() + 1)
  }
  await Promise.all(updates)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  if (!['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const sick = await prisma.sickRequest.findUnique({ where: { id: params.id }, include: { user: true } })
  if (!sick) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.sickRequest.update({ where: { id: params.id }, data: { status } })

  if (status === 'approved') {
    await markTimetableRange(sick.userId, sick.startDate, sick.endDate, 'Sick Off')
  }

  await createNotification(
    sick.userId,
    `Sick Call ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
    `Your sick call for ${sick.days} day(s) has been ${status}.`,
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
