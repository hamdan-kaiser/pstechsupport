import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyAllAdmins } from '@/lib/notifications'
import { getWeekStart, getDayKey } from '@/lib/utils'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role

  const where = role === 'admin' || role === 'viewer' ? {} : { userId }
  const requests = await prisma.additionalShiftRequest.findMany({
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
  const { date, shift, reason } = await req.json()
  if (!date || !shift || !reason) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const dateObj = new Date(date)
  const weekStart = getWeekStart(dateObj)
  const dayKey = getDayKey(dateObj)
  const entry = await prisma.timetableEntry.findUnique({ where: { userId_weekStart: { userId, weekStart } } })
  const currentValue = entry ? ((entry as any)[dayKey] as string | null) : null
  if (currentValue && currentValue.toLowerCase() !== 'off') {
    return NextResponse.json({ error: 'You can only request an additional shift on a day you are scheduled OFF' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const request = await prisma.additionalShiftRequest.create({
    data: { userId, date: dateObj, shift, reason },
  })

  await notifyAllAdmins(
    'New Additional Shift Request',
    `${user.name} wants to work an additional shift (${shift}) on ${dateObj.toLocaleDateString()}, their scheduled day off.`,
    'info',
    { refType: 'additional-shift', refId: request.id }
  )

  return NextResponse.json(request, { status: 201 })
}
