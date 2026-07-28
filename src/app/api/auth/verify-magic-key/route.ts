import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { email, magicKey } = await req.json()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'No account found with that email' }, { status: 404 })
  if (user.magicKey !== magicKey) return NextResponse.json({ error: 'Incorrect magic key' }, { status: 401 })
  return NextResponse.json({ valid: true, userId: user.id })
}
