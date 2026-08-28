import { prisma } from '@/lib/prisma'

/** Total approved sick days per user, for admin visibility on the Employees list. */
export async function getApprovedSickDaysForUsers(userIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const id of userIds) counts[id] = 0
  if (userIds.length === 0) return counts

  const grouped = await prisma.sickRequest.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, status: 'approved' },
    _sum: { days: true },
  })
  for (const g of grouped) counts[g.userId] = g._sum.days ?? 0
  return counts
}
