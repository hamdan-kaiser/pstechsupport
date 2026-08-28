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

// The 3 candidate dark-mode background colors — kept in sync with the hardcoded copy in
// layout.tsx's pre-hydration bootstrap script (which can't import this, since it runs as a
// literal inline <script> string before any JS module loads) and the data-dark-bg CSS rules
// in globals.css.
export const DARK_BG_COLORS = ['#2b094d', '#174309', '#2d2424']

interface AppStore {
  notifications: Notification[]
  unreadCount: number
  theme: 'dark' | 'light'
  darkBgIndex: number
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
      darkBgIndex: 0,
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
          // A fresh switch INTO dark mode re-rolls the background color; staying in the same
          // mode (or switching to light, which doesn't use these colors at all) leaves it as-is.
          const nextBgIndex = next === 'dark' ? Math.floor(Math.random() * DARK_BG_COLORS.length) : s.darkBgIndex
          if (next === 'dark') document.documentElement.setAttribute('data-dark-bg', String(nextBgIndex))
          return { theme: next, darkBgIndex: nextBgIndex }
        }),
      openMobileSidebar: () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
    }),
    { name: 'portal-theme', partialize: (s) => ({ theme: s.theme, darkBgIndex: s.darkBgIndex }) }
  )
)
