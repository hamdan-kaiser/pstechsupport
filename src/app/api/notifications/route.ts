import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { prisma } from '@/lib/prisma'
import { pruneOldNotifications } from '@/modules/notifications'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // This route is polled by every session every few minutes — a cheap, low-probability spot to
  // opportunistically keep the notification table trimmed without needing a cron job.
  if (Math.random() < 0.02) await pruneOldNotifications()

  return NextResponse.json(notifications)
}
