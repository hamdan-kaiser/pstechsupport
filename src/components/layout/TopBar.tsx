'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, X, Check, CheckCheck, Menu } from 'lucide-react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { useAppStore } from '@/store/appStore'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { COLOR } from '@/lib/design'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface TopBarProps {
  user: { name?: string | null; email?: string | null; role?: string }
}

// Maps a notification's refType to the endpoint/body needed to approve or decline it inline.
const REF_ACTIONS: Record<string, {
  approveLabel: string
  declineLabel: string
  endpoint: (id: string) => string
  body: (decision: 'approve' | 'decline') => any
}> = {
  holiday: {
    approveLabel: 'Approve', declineLabel: 'Reject',
    endpoint: id => `/api/holidays/${id}`,
    body: decision => ({ status: decision === 'approve' ? 'approved' : 'rejected' }),
  },
  sick: {
    approveLabel: 'Approve', declineLabel: 'Reject',
    endpoint: id => `/api/sick-calls/${id}`,
    body: decision => ({ status: decision === 'approve' ? 'approved' : 'rejected' }),
  },
  'shiftswap-accept': {
    approveLabel: 'Accept', declineLabel: 'Decline',
    endpoint: id => `/api/shift-swap/${id}`,
    body: decision => ({ action: decision === 'approve' ? 'accept' : 'reject' }),
  },
  'shiftswap-approve': {
    approveLabel: 'Approve', declineLabel: 'Reject',
    endpoint: id => `/api/shift-swap/${id}`,
    body: decision => ({ action: decision === 'approve' ? 'admin_approve' : 'admin_reject' }),
  },
  'additional-shift': {
    approveLabel: 'Approve', declineLabel: 'Reject',
    endpoint: id => `/api/additional-shifts/${id}`,
    body: decision => ({ status: decision === 'approve' ? 'approved' : 'rejected' }),
  },
  'early-leave': {
    approveLabel: 'Approve', declineLabel: 'Reject',
    endpoint: id => `/api/sudden-leave/${id}`,
    body: decision => ({ status: decision === 'approve' ? 'approved' : 'rejected' }),
  },
  'late-arrival': {
    approveLabel: 'Approve', declineLabel: 'Reject',
    endpoint: id => `/api/late-arrival/${id}`,
    body: decision => ({ status: decision === 'approve' ? 'approved' : 'rejected' }),
  },
  'shift-move': {
    approveLabel: 'Approve', declineLabel: 'Reject',
    endpoint: id => `/api/move-shift/${id}`,
    body: decision => ({ status: decision === 'approve' ? 'approved' : 'rejected' }),
  },
}

export function TopBar({ user }: TopBarProps) {
  const [open, setOpen] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const { notifications, unreadCount, setNotifications, markRead, markAllRead, openMobileSidebar } = useAppStore()

  useEffect(() => {
    fetchNotifications()
    // This component is mounted on every page for every logged-in session, so its poll interval
    // is the single biggest driver of steady-state database load in the app. A window-focus
    // listener covers the "I just got approved, let me check" case responsively, so the
    // background interval only needs to be a slow safety net, not the primary refresh path.
    const interval = setInterval(fetchNotifications, 3 * 60 * 1000)
    window.addEventListener('focus', fetchNotifications)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', fetchNotifications)
    }
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

  async function handleAction(n: any, decision: 'approve' | 'decline') {
    const config = REF_ACTIONS[n.refType as string]
    if (!config || !n.refId) return
    setActioningId(n.id)
    const res = await fetch(config.endpoint(n.refId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.body(decision)),
    })
    if (res.ok) {
      toast.success(decision === 'approve' ? 'Approved!' : 'Declined')
      markRead(n.id)
      await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })
      fetchNotifications()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error || 'Action failed')
    }
    setActioningId(null)
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
    info: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
  }

  return (
    <header className="h-16 border-b flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-base)' }}>
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={openMobileSidebar} className="p-2 -ml-1 rounded-lg shrink-0 lg:hidden" style={{ color: 'var(--text-secondary)' }}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="font-semibold t-primary truncate">Welcome back, {user.name?.split(' ')[0]}</p>
          <p className="t-muted text-xs hidden sm:block">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
              <div ref={panelRef} className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-12 w-auto sm:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
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
                            {!n.read && n.refType && REF_ACTIONS[n.refType] && (
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  disabled={actioningId === n.id}
                                  onClick={() => handleAction(n, 'approve')}
                                  className="btn-success py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" /> {REF_ACTIONS[n.refType].approveLabel}
                                </button>
                                <button
                                  disabled={actioningId === n.id}
                                  onClick={() => handleAction(n, 'decline')}
                                  className="btn-danger py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" /> {REF_ACTIONS[n.refType].declineLabel}
                                </button>
                              </div>
                            )}
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
