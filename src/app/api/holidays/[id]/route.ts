import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  if (!['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const holiday = await prisma.holidayRequest.findUnique({
    where: { id: params.id },
    include: { user: true },
  })
  if (!holiday) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.holidayRequest.update({ where: { id: params.id }, data: { status } })

  if (status === 'approved') {
    await prisma.user.update({
      where: { id: holiday.userId },
      data: { usedHolidays: { increment: holiday.days } },
    })
  }

  await createNotification(
    holiday.userId,
    `Holiday Request ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
    `Your holiday request for ${holiday.days} day(s) has been ${status}.`,
    status === 'approved' ? 'success' : 'error'
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role

  const holiday = await prisma.holidayRequest.findUnique({ where: { id: params.id } })
  if (!holiday) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (holiday.userId !== userId && role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (holiday.status === 'approved') return NextResponse.json({ error: 'Cannot delete approved request' }, { status: 400 })

  await prisma.holidayRequest.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
