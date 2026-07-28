import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWeekStart } from '@/lib/utils'
import { notifyAllEmployees } from '@/lib/notifications'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const weekParam = searchParams.get('week')
  const weekStart = weekParam ? new Date(weekParam) : getWeekStart()
  const userId = (session.user as any).id
  const role = (session.user as any).role

  if (role === 'admin' || role === 'viewer') {
    const entries = await prisma.timetableEntry.findMany({
      where: { weekStart },
      include: { user: { select: { name: true, shift: true } } },
      orderBy: { user: { name: 'asc' } },
    })
    return NextResponse.json(entries)
  }

  const entry = await prisma.timetableEntry.findFirst({
    where: { userId, weekStart },
    include: { user: { select: { name: true, shift: true } } },
  })
  return NextResponse.json(entry ? [entry] : [])
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { entries, weekStart } = await req.json()
  const week = new Date(weekStart)

  const results = await Promise.all(
    entries.map((e: any) =>
      prisma.timetableEntry.upsert({
        where: { userId_weekStart: { userId: e.userId, weekStart: week } },
        update: { monday: e.monday, tuesday: e.tuesday, wednesday: e.wednesday, thursday: e.thursday, friday: e.friday, saturday: e.saturday, sunday: e.sunday },
        create: { userId: e.userId, weekStart: week, monday: e.monday, tuesday: e.tuesday, wednesday: e.wednesday, thursday: e.thursday, friday: e.friday, saturday: e.saturday, sunday: e.sunday },
      })
    )
  )

  await notifyAllEmployees('Timetable Updated 📅', 'The timetable has been updated by admin. Check your schedule.', 'info')
  return NextResponse.json(results)
}
