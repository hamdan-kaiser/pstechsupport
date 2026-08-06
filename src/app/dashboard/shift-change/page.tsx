import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ShiftChangeClient } from '@/components/shiftchange/ShiftChangeClient'

export default async function ShiftChangePage() {
  const session = await getServerSession(authOptions)
  if ((session!.user as any).role !== 'admin') redirect('/dashboard')

  const [requests, employees] = await Promise.all([
    prisma.shiftChangeRequest.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return <ShiftChangeClient requests={requests} employees={employees} />
}
