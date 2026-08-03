import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EmployeesClient } from '@/components/admin/EmployeesClient'
import { getWeekStart, getTodayDayKey, deriveRowStatus } from '@/lib/utils'
import { getApprovedSickDaysForUsers } from '@/lib/sickUsage'
import { getEffectiveTimetableForWeek } from '@/lib/timetableResolve'

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions)
  if ((session!.user as any).role !== 'admin') redirect('/dashboard')

  const weekStart = getWeekStart()
  const todayKey = getTodayDayKey()

  const [employees, timetableEntries] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, shift: true, magicKey: true, totalHolidays: true, usedHolidays: true },
      orderBy: { name: 'asc' },
    }),
    getEffectiveTimetableForWeek(weekStart),
  ])

  const sickDaysByUser = await getApprovedSickDaysForUsers(employees.map(e => e.id))

  const employeesWithTodayShift = employees.map(emp => {
    const entry = timetableEntries.find(t => t.userId === emp.id) as any
    const todayValue = entry ? entry[todayKey] : null
    return { ...emp, sickDays: sickDaysByUser[emp.id] ?? 0, todayShift: deriveRowStatus(todayValue) }
  })

  return <EmployeesClient employees={employeesWithTodayShift} />
}
