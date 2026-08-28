import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { prisma } from '@/lib/prisma'
import { getMonthlyLeaveSummaryForUsers } from '@/modules/leave-attendance'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  if (role === 'admin') {
    const stats = await prisma.statsRecord.findMany({
      where: { month, year },
      include: { user: { select: { name: true, shift: true } } },
      orderBy: { casesResolved: 'desc' },
    })
    const summaries = await getMonthlyLeaveSummaryForUsers(stats.map(s => s.userId), month, year)
    return NextResponse.json(stats.map(s => ({ ...s, ...summaries[s.userId] })))
  }

  const userId = (session.user as any).id
  const stats = await prisma.statsRecord.findMany({
    where: { userId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  const merged = await Promise.all(stats.map(async s => {
    const summary = await getMonthlyLeaveSummaryForUsers([userId], s.month, s.year)
    return { ...s, ...summary[userId] }
  }))
  return NextResponse.json(merged)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Bulk upload: array of records
  if (Array.isArray(body)) {
    const results = await Promise.all(
      body.map((r: any) =>
        prisma.statsRecord.upsert({
          where: { userId_month_year: { userId: r.userId, month: r.month, year: r.year } },
          update: { casesCreated: r.casesCreated, casesResolved: r.casesResolved, inboundCalls: r.inboundCalls, outboundCalls: r.outboundCalls },
          create: { userId: r.userId, month: r.month, year: r.year, casesCreated: r.casesCreated, casesResolved: r.casesResolved, inboundCalls: r.inboundCalls, outboundCalls: r.outboundCalls },
        })
      )
    )
    return NextResponse.json(results)
  }

  // Single record
  const { userId, month, year, casesCreated, casesResolved, inboundCalls, outboundCalls } = body
  const record = await prisma.statsRecord.upsert({
    where: { userId_month_year: { userId, month, year } },
    update: { casesCreated, casesResolved, inboundCalls, outboundCalls },
    create: { userId, month, year, casesCreated, casesResolved, inboundCalls, outboundCalls },
  })
  return NextResponse.json(record)
}
