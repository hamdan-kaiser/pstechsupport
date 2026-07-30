import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWeekStart } from '@/lib/utils'
import { notifyAllEmployees } from '@/lib/notifications'
import { getLeaveOverridesForWeek } from '@/lib/leaveOverrides'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const weekParam = searchParams.get('week')
  const weekStart = weekParam ? new Date(weekParam) : getWeekStart()

  const entries = await prisma.timetableEntry.findMany({
    where: { weekStart },
    include: { user: { select: { name: true, shift: true } } },
    orderBy: { user: { name: 'asc' } },
  })
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { entries, weekStart } = await req.json()
  const week = new Date(weekStart)

  const results = await Promise.all(
    entries.map(async (e: any) => {
      // Approved Holiday/Sick days always win — a schedule re-upload can't silently erase leave
      // that was already approved and written to the timetable.
      const overrides = await getLeaveOverridesForWeek(e.userId, week)
      const days = {
        monday: overrides.monday ?? e.monday,
        tuesday: overrides.tuesday ?? e.tuesday,
        wednesday: overrides.wednesday ?? e.wednesday,
        thursday: overrides.thursday ?? e.thursday,
        friday: overrides.friday ?? e.friday,
        saturday: overrides.saturday ?? e.saturday,
        sunday: overrides.sunday ?? e.sunday,
      }
      return prisma.timetableEntry.upsert({
        where: { userId_weekStart: { userId: e.userId, weekStart: week } },
        update: days,
        create: { userId: e.userId, weekStart: week, ...days },
      })
    })
  )

  await notifyAllEmployees('Timetable Updated 📅', 'The timetable has been updated by admin. Check your schedule.', 'info')
  return NextResponse.json(results)
}
