import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isSuperAdmin } from '@/modules/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const data = await req.json()

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { email: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only the super admin may change anyone's role, and the super admin's own role can never be
  // changed by anyone (including themself) — otherwise the portal could end up with no one able
  // to grant admin/viewer access ever again.
  const requesterIsSuper = isSuperAdmin((session.user as any).email)
  if ('role' in data && (!requesterIsSuper || isSuperAdmin(target.email))) delete data.role

  if (data.password) data.password = await bcrypt.hash(data.password, 10)
  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, shift: true, totalHolidays: true, usedHolidays: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { email: true } })
  if (target && isSuperAdmin(target.email)) return NextResponse.json({ error: 'Cannot remove the super admin account' }, { status: 403 })

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
