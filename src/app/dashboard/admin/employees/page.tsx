import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EmployeesClient } from '@/components/admin/EmployeesClient'
import { getWeekStart, deriveShiftPeriod } from '@/lib/utils'

const JS_DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions)
  if ((session!.user as any).role !== 'admin') redirect('/dashboard')

  const weekStart = getWeekStart()
  const todayKey = JS_DAY_KEYS[new Date().getDay()]

  const [employees, timetableEntries] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, shift: true, magicKey: true, totalHolidays: true, usedHolidays: true, createdAt: true },
      orderBy: { name: 'asc' },
    }),
    prisma.timetableEntry.findMany({ where: { weekStart } }),
  ])

  const employeesWithTodayShift = employees.map(emp => {
    const entry = timetableEntries.find(t => t.userId === emp.id) as any
    const todayValue = entry ? entry[todayKey] : null
    return { ...emp, todayShift: deriveShiftPeriod(todayValue) ?? emp.shift }
  })

  return <EmployeesClient employees={employeesWithTodayShift} />
}
