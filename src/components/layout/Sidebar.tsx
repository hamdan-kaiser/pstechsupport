'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import {
  LayoutDashboard, CalendarDays, BarChart3, Clock, ArrowLeftRight,
  Users, LogOut, Shield, Thermometer, Brain, CalendarPlus, DoorOpen, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

const employeeLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/holidays', label: 'Holidays', icon: CalendarDays },
  { href: '/dashboard/sick-calls', label: 'Sick Calls', icon: Thermometer },
  { href: '/dashboard/additional-shift', label: 'Additional Shift', icon: CalendarPlus },
  { href: '/dashboard/sudden-leave', label: 'Sudden Leave', icon: DoorOpen },
  { href: '/dashboard/stats', label: 'My Stats', icon: BarChart3 },
  { href: '/dashboard/timetable', label: 'Timetable', icon: Clock },
  { href: '/dashboard/shift-swap', label: 'Shift Swap', icon: ArrowLeftRight },
  { href: '/dashboard/iq-test', label: 'Getting bored?', icon: Brain },
]

const adminLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/holidays', label: 'Holidays', icon: CalendarDays },
  { href: '/dashboard/sick-calls', label: 'Sick Calls', icon: Thermometer },
  { href: '/dashboard/additional-shift', label: 'Additional Shift', icon: CalendarPlus },
  { href: '/dashboard/sudden-leave', label: 'Sudden Leave', icon: DoorOpen },
  { href: '/dashboard/stats', label: 'Stats & Leaderboard', icon: BarChart3 },
  { href: '/dashboard/timetable', label: 'Timetable', icon: Clock },
  { href: '/dashboard/shift-swap', label: 'Shift Swap', icon: ArrowLeftRight },
  { href: '/dashboard/admin/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/iq-test', label: 'Getting bored?', icon: Brain },
]

// Viewers are read-only observers — no leave requests, stats, or shift swaps, just the schedule
const viewerLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/timetable', label: 'Timetable', icon: Clock },
  { href: '/dashboard/iq-test', label: 'Getting bored?', icon: Brain },
]

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const links = role === 'admin' ? adminLinks : role === 'viewer' ? viewerLinks : employeeLinks
  const { mobileSidebarOpen, closeMobileSidebar } = useAppStore()

  useEffect(() => {
    // Only run the entrance slide on desktop, where the sidebar is always visible. On mobile its
    // visibility is driven by the drawer's translate-x class — animating "x" here would set an
    // inline transform that permanently overrides that class, leaving the drawer stuck open.
    if (window.innerWidth >= 1024) {
      gsap.fromTo(sidebarRef.current,
        { x: -260, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' }
      )
    }
    gsap.fromTo('.sidebar-link',
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.2 }
    )
  }, [])

  // Close the mobile drawer whenever the route changes (e.g. after tapping a link)
  useEffect(() => {
    closeMobileSidebar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function handleLinkEnter(e: React.MouseEvent<HTMLElement>) {
    const icon = e.currentTarget.querySelector('svg')
    if (icon) gsap.to(icon, { scale: 1.2, x: 3, duration: 0.25, ease: 'back.out(3)' })
  }
  function handleLinkLeave(e: React.MouseEvent<HTMLElement>) {
    const icon = e.currentTarget.querySelector('svg')
    if (icon) gsap.to(icon, { scale: 1, x: 0, duration: 0.25, ease: 'power2.out' })
  }

  return (
    <>
      {/* Backdrop — mobile only, shown while the drawer is open */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMobileSidebar} />
      )}

      <div
        ref={sidebarRef}
        className={cn(
          'w-64 shrink-0 flex flex-col h-full border-r fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-base)' }}
      >
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm t-primary">Team Portal</p>
              <p className="text-xs t-muted capitalize">{role} Panel</p>
            </div>
          </div>
          <button onClick={closeMobileSidebar} className="p-1.5 rounded-lg lg:hidden" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn('sidebar-link', pathname === href && 'active')}
              onMouseEnter={handleLinkEnter} onMouseLeave={handleLinkLeave}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--border-base)' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
            onMouseEnter={handleLinkEnter} onMouseLeave={handleLinkLeave}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}
