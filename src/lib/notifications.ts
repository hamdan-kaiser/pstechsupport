import { prisma } from './prisma'

/** refType marks a notification as actionable directly from the notification panel:
 *  'holiday' | 'sick'            -> admin approves/rejects via that request's id
 *  'shiftswap-accept'            -> target employee accepts/declines the swap
 *  'shiftswap-approve'           -> admin approves/rejects the swap
 */
export type NotificationRef = { refType: string; refId: string }

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  ref?: NotificationRef
) {
  return prisma.notification.create({ data: { userId, title, message, type, refType: ref?.refType, refId: ref?.refId } })
}

export async function notifyAllAdmins(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', ref?: NotificationRef) {
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
  await Promise.all(admins.map(a => createNotification(a.id, title, message, type, ref)))
}

export async function notifyAllEmployees(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', ref?: NotificationRef) {
  const users = await prisma.user.findMany({ select: { id: true } })
  await Promise.all(users.map(u => createNotification(u.id, title, message, type, ref)))
}
