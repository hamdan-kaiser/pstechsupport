import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EmployeesClient } from '@/components/admin/EmployeesClient'

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions)
  if ((session!.user as any).role !== 'admin') redirect('/dashboard')

  const employees = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, shift: true, magicKey: true, totalHolidays: true, usedHolidays: true, createdAt: true },
    orderBy: { name: 'asc' },
  })

  return <EmployeesClient employees={employees} />
}
