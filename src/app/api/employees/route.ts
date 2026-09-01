import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isSuperAdmin } from '@/modules/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const employees = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, shift: true, totalHolidays: true, usedHolidays: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(employees)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, email, password, role, shift, totalHolidays } = await req.json()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
  const hashed = await bcrypt.hash(password || 'password123', 10)
  // Only the super admin can set a new employee's role at creation — everyone else's new hires
  // start as a regular employee, promotable later only by the super admin.
  const requesterIsSuper = isSuperAdmin((session.user as any).email)
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: requesterIsSuper ? (role || 'employee') : 'employee', shift: shift || 'day', totalHolidays: totalHolidays || 28 },
    select: { id: true, name: true, email: true, role: true, shift: true, totalHolidays: true, usedHolidays: true },
  })
  return NextResponse.json(user, { status: 201 })
}
