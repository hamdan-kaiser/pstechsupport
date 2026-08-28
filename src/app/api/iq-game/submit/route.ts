import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const { correctCount, totalTimeMs } = await req.json()

  if (typeof correctCount !== 'number' || typeof totalTimeMs !== 'number' || correctCount < 0 || correctCount > 20 || totalTimeMs < 0) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 })
  }

  const existing = await prisma.iqGameScore.findUnique({ where: { userId } })
  const isNewBest = !existing || correctCount > existing.bestScore || (correctCount === existing.bestScore && totalTimeMs < existing.bestTimeMs)

  await prisma.iqGameScore.upsert({
    where: { userId },
    update: {
      attempts: { increment: 1 },
      lastPlayedAt: new Date(),
      ...(isNewBest ? { bestScore: correctCount, bestTimeMs: totalTimeMs } : {}),
    },
    create: { userId, bestScore: correctCount, bestTimeMs: totalTimeMs, attempts: 1 },
  })

  const scores = await prisma.iqGameScore.findMany({
    include: { user: { select: { name: true } } },
    orderBy: [{ bestScore: 'desc' }, { bestTimeMs: 'asc' }],
    take: 50,
  })

  return NextResponse.json({
    isNewBest,
    leaderboard: scores.map(s => ({ id: s.userId, name: s.user.name, bestScore: s.bestScore, bestTimeMs: s.bestTimeMs })),
  })
}
