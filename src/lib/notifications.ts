import { prisma } from './prisma'

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  return prisma.notification.create({ data: { userId, title, message, type } })
}

export async function notifyAllAdmins(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
  await Promise.all(admins.map(a => createNotification(a.id, title, message, type)))
}

export async function notifyAllEmployees(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const users = await prisma.user.findMany({ select: { id: true } })
  await Promise.all(users.map(u => createNotification(u.id, title, message, type)))
}
