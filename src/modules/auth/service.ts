import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function verifyMagicKey(email: string, magicKey: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { error: 'No account found with that email', status: 404 as const }
  if (user.magicKey !== magicKey) return { error: 'Incorrect magic key', status: 401 as const }
  return { valid: true as const, userId: user.id }
}

export async function resetPassword(userId: string, password: string) {
  if (password.length < 11) return { error: 'Password must be at least 11 characters', status: 400 as const }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return { error: 'Password must contain at least one special character', status: 400 as const }
  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  return { success: true as const }
}
