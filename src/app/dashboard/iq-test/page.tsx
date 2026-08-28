import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth'
import { prisma } from '@/lib/prisma'
import { IqTestClient } from '@/modules/iq-game'

export default async function IqTestPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as any).id

  const [scores, myScore] = await Promise.all([
    prisma.iqGameScore.findMany({
      include: { user: { select: { name: true } } },
      orderBy: [{ bestScore: 'desc' }, { bestTimeMs: 'asc' }],
      take: 50,
    }),
    prisma.iqGameScore.findUnique({ where: { userId } }),
  ])

  const leaderboard = scores.map(s => ({ id: s.userId, name: s.user.name, bestScore: s.bestScore, bestTimeMs: s.bestTimeMs }))

  return (
    <IqTestClient
      leaderboard={leaderboard}
      myBest={myScore ? { bestScore: myScore.bestScore, bestTimeMs: myScore.bestTimeMs } : null}
      currentUserId={userId}
    />
  )
}
