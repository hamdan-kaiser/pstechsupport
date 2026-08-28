// Notifications module — owns in-app Notification records and the SMTP email side-channel for
// admin alerts. This is the module's public API; other modules should only import from here.

export { createNotification, notifyAllAdmins, notifyAllEmployees, pruneOldNotifications } from './service'
export type { NotificationRef } from './service'
export { notifyAdminsByEmail } from './email'
