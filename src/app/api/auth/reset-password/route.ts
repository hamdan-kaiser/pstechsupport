import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { userId, password } = await req.json()
  if (!userId || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (password.length < 11) return NextResponse.json({ error: 'Password must be at least 11 characters' }, { status: 400 })
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return NextResponse.json({ error: 'Password must contain at least one special character' }, { status: 400 })
  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  return NextResponse.json({ success: true })
}
