'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { gsap } from 'gsap'
import { useAppStore } from '@/store/appStore'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { COLOR } from '@/lib/design'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface TopBarProps {
  user: { name?: string | null; email?: string | null; role?: string }
}

export function TopBar({ user }: TopBarProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } = useAppStore()

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNotifications() {
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      setNotifications(data)
    }
  }

  async function handleMarkRead(id: string) {
    markRead(id)
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
  }

  async function handleMarkAll() {
    markAllRead()
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
  }

  useEffect(() => {
    if (open && panelRef.current) {
      gsap.fromTo(panelRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
      )
    }
  }, [open])

  useEffect(() => {
    if (unreadCount > 0 && bellRef.current) {
      gsap.fromTo(bellRef.current, { rotation: -15 }, { rotation: 15, duration: 0.1, repeat: 5, yoyo: true, ease: 'power1.inOut', onComplete: () => gsap.set(bellRef.current, { rotation: 0 }) })
    }
  }, [unreadCount])

  const typeColors: Record<string, string> = {
    info: 'bg-brand-500/20 text-brand-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    error: 'bg-red-500/20 text-red-400',
  }

  return (
    <header className="h-16 border-b flex items-center justify-between px-6 shrink-0" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-base)' }}>
      <div>
        <p className="font-semibold t-primary">Welcome back, {user.name?.split(' ')[0]}</p>
        <p className="t-muted text-xs">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setOpen(!open)}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <Bell className="w-5 h-5 t-secondary" style={{ color: 'var(--text-secondary)' }} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div ref={panelRef} className="absolute right-0 top-12 w-96 rounded-2xl shadow-2xl z-50 overflow-hidden border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-base)' }}>
                  <h3 className="font-semibold t-primary">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAll} className="text-xs t-brand flex items-center gap-1" style={{ color: 'var(--brand-text)' }}>
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} style={{ color: 'var(--text-secondary)' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={cn('p-4 border-b transition-colors', !n.read && 'bg-blue-500/5')}
                        style={{ borderColor: 'var(--border-base)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = n.read ? '' : COLOR.cyanGhost)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeColors[n.type] || typeColors.info)}>
                                {n.type}
                              </span>
                              {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                            </div>
                            <p className="text-sm font-medium t-primary" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatDate(n.createdAt)}</p>
                          </div>
                          {!n.read && (
                            <button onClick={() => handleMarkRead(n.id)} style={{ color: 'var(--text-muted)' }} className="hover:text-blue-400 shrink-0">
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium t-primary" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
