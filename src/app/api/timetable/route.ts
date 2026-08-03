import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWeekStart, DAYS } from '@/lib/utils'
import { notifyAllEmployees } from '@/lib/notifications'
import { getLeaveOverridesForWeek } from '@/lib/leaveOverrides'
import { getEffectiveTimetableForWeek } from '@/lib/timetableResolve'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const weekParam = searchParams.get('week')
  // Always snap to a clean, timezone-independent Monday boundary — never trust a client-computed
  // timestamp as-is, since local-time arithmetic in the browser could drift by an hour or so.
  const weekStart = getWeekStart(weekParam ? new Date(weekParam) : new Date())

  const entries = await getEffectiveTimetableForWeek(weekStart)
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { entries, weekStart } = await req.json()
  const week = getWeekStart(new Date(weekStart))

  const results = await Promise.all(
    entries.map(async (e: any) => {
      // Approved Holiday/Sick days always win — a schedule re-upload can't silently erase leave
      // that was already approved and written to the timetable. Days protected this way are
      // flagged as one-off overrides; everything else is treated as the new recurring schedule,
      // which also clears any stale override flag a prior one-off approval left on this week.
      const overrides = await getLeaveOverridesForWeek(e.userId, week)
      const days: Record<string, string | null> = {}
      const overrideDays: string[] = []
      for (const day of DAYS) {
        if (overrides[day]) {
          days[day] = overrides[day]!
          overrideDays.push(day)
        } else {
          days[day] = e[day] ?? null
        }
      }
      return prisma.timetableEntry.upsert({
        where: { userId_weekStart: { userId: e.userId, weekStart: week } },
        update: { ...days, overrideDays },
        create: { userId: e.userId, weekStart: week, ...days, overrideDays },
      })
    })
  )

  await notifyAllEmployees('Timetable Updated 📅', 'The timetable has been updated by admin. Check your schedule.', 'info')
  return NextResponse.json(results)
}
