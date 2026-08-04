import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  refType?: string | null
  refId?: string | null
  read: boolean
  createdAt: string
}

interface AppStore {
  notifications: Notification[]
  unreadCount: number
  theme: 'dark' | 'light'
  mobileSidebarOpen: boolean
  setNotifications: (n: Notification[]) => void
  markRead: (id: string) => void
  markAllRead: () => void
  toggleTheme: () => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      theme: 'dark',
      mobileSidebarOpen: false,
      setNotifications: (notifications) =>
        set({ notifications, unreadCount: notifications.filter(n => !n.read).length }),
      markRead: (id) =>
        set((s) => {
          const updated = s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
          return { notifications: updated, unreadCount: updated.filter(n => !n.read).length }
        }),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark'
          document.documentElement.classList.remove('dark', 'light')
          document.documentElement.classList.add(next)
          return { theme: next }
        }),
      openMobileSidebar: () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
    }),
    { name: 'portal-theme', partialize: (s) => ({ theme: s.theme }) }
  )
)
