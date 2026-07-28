import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const role = (session.user as any).role

  if (role === 'admin' || role === 'viewer') {
    const stats = await prisma.statsRecord.findMany({
      where: { month, year },
      include: { user: { select: { name: true, shift: true } } },
      orderBy: { casesResolved: 'desc' },
    })
    return NextResponse.json(stats)
  }

  const userId = (session.user as any).id
  const stats = await prisma.statsRecord.findMany({
    where: { userId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  return NextResponse.json(stats)
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
