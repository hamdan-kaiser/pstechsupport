import { NextResponse } from 'next/server'
import { resetPassword } from '@/modules/auth'

export async function POST(req: Request) {
  const { userId, password } = await req.json()
  if (!userId || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const result = await resetPassword(userId, password)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}
