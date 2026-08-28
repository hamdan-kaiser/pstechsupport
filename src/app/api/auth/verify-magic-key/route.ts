import { NextResponse } from 'next/server'
import { verifyMagicKey } from '@/modules/auth'

export async function POST(req: Request) {
  const { email, magicKey } = await req.json()
  const result = await verifyMagicKey(email, magicKey)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}
