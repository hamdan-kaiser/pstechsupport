import { prisma } from '@/lib/prisma'

/** refType marks a notification as actionable directly from the notification panel:
 *  'holiday' | 'sick' | 'additional-shift' | 'early-leave' | 'late-arrival' -> admin approves/rejects via that request's id
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

const NOTIFICATION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/** Deletes already-read notifications older than 30 days — read notifications have no ongoing
 *  value once seen, and this is by far the fastest-growing table in the app (every request
 *  action fans out a row per admin). There's no cron infrastructure here, so this is called
 *  opportunistically at low probability from the notifications GET route instead: cheap enough
 *  in aggregate to keep the table from growing unbounded, without adding latency to most requests. */
export async function pruneOldNotifications() {
  await prisma.notification.deleteMany({
    where: { read: true, createdAt: { lt: new Date(Date.now() - NOTIFICATION_RETENTION_MS) } },
  })
}
