'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { gsap } from 'gsap'
import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, CalendarDays, BarChart3, Clock, ArrowLeftRight,
  Users, LogOut, Shield, Thermometer, Brain, CalendarPlus, DoorOpen, Timer, Repeat,
  Joystick, ChevronDown, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

// Each item is either a standalone link, or a collapsible section grouping a
// few related links under one common-scenario heading — keeps the top-level
// nav short instead of a long flat list.
type NavLink = { type: 'link'; href: string; label: string; icon: any; badgeIcon?: any }
type NavSection = { type: 'section'; label: string; icon: any; children: { href: string; label: string; icon: any }[] }
type NavItem = NavLink | NavSection

const leaveAttendanceSection: NavSection = {
  type: 'section', label: 'Leave & Attendance', icon: CalendarDays,
  children: [
    { href: '/dashboard/holidays', label: 'Holidays', icon: CalendarDays },
    { href: '/dashboard/sick-calls', label: 'Sick Calls', icon: Thermometer },
    { href: '/dashboard/sudden-leave', label: 'Sudden Leave', icon: DoorOpen },
    { href: '/dashboard/late-arrival', label: 'Late Arrival', icon: Timer },
  ],
}

const employeeLinks: NavItem[] = [
  { type: 'link', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  leaveAttendanceSection,
  {
    type: 'section', label: 'Changes in Shift', icon: ArrowLeftRight,
    children: [
      { href: '/dashboard/additional-shift', label: 'Additional Shift', icon: CalendarPlus },
      { href: '/dashboard/shift-swap', label: 'Shift Swap', icon: ArrowLeftRight },
    ],
  },
  { type: 'link', href: '/dashboard/stats', label: 'My Stats', icon: BarChart3 },
  { type: 'link', href: '/dashboard/timetable', label: 'Timetable', icon: Clock },
  { type: 'link', href: '/dashboard/iq-test', label: 'Getting bored?', icon: Brain, badgeIcon: Joystick },
]

const adminLinks: NavItem[] = [
  { type: 'link', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  leaveAttendanceSection,
  {
    type: 'section', label: 'Changes in Shift', icon: ArrowLeftRight,
    children: [
      { href: '/dashboard/additional-shift', label: 'Additional Shift', icon: CalendarPlus },
      { href: '/dashboard/shift-swap', label: 'Shift Swap', icon: ArrowLeftRight },
      { href: '/dashboard/shift-change', label: 'Change Shift', icon: Repeat },
    ],
  },
  { type: 'link', href: '/dashboard/stats', label: 'Stats & Leaderboard', icon: BarChart3 },
  { type: 'link', href: '/dashboard/timetable', label: 'Timetable', icon: Clock },
  { type: 'link', href: '/dashboard/admin/employees', label: 'Employees', icon: Users },
  { type: 'link', href: '/dashboard/iq-test', label: 'Getting bored?', icon: Brain, badgeIcon: Joystick },
]

// Viewers are read-only observers — no leave requests, stats, or shift swaps, just the schedule
const viewerLinks: NavItem[] = [
  { type: 'link', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'link', href: '/dashboard/timetable', label: 'Timetable', icon: Clock },
  { type: 'link', href: '/dashboard/iq-test', label: 'Getting bored?', icon: Brain, badgeIcon: Joystick },
]

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const links = role === 'admin' ? adminLinks : role === 'viewer' ? viewerLinks : employeeLinks
  const { mobileSidebarOpen, closeMobileSidebar } = useAppStore()

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const item of links) {
      if (item.type === 'section') initial[item.label] = item.children.some(c => pathname === c.href)
    }
    return initial
  })

  // If navigation lands on a page inside a collapsed section (e.g. a direct link from a
  // notification), auto-expand that section without collapsing any others the user opened.
  useEffect(() => {
    for (const item of links) {
      if (item.type === 'section' && item.children.some(c => pathname === c.href)) {
        setExpanded(prev => prev[item.label] ? prev : { ...prev, [item.label]: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

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
  function toggleSection(label: string) {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }))
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
          {links.map(item => {
            if (item.type === 'link') {
              const Icon = item.icon
              const Badge = item.badgeIcon
              return (
                <Link key={item.href} href={item.href} className={cn('sidebar-link', pathname === item.href && 'active')}
                  onMouseEnter={handleLinkEnter} onMouseLeave={handleLinkLeave}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                  {Badge && <Badge className="w-3.5 h-3.5 ml-auto opacity-60" />}
                </Link>
              )
            }

            const Icon = item.icon
            const isOpen = !!expanded[item.label]
            const hasActiveChild = item.children.some(c => pathname === c.href)
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleSection(item.label)}
                  onMouseEnter={handleLinkEnter} onMouseLeave={handleLinkLeave}
                  className={cn('sidebar-link w-full justify-between', hasActiveChild && !isOpen && 'active')}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </span>
                  <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-3" style={{ borderColor: 'var(--border-base)' }}>
                    {item.children.map(c => {
                      const CIcon = c.icon
                      return (
                        <Link key={c.href} href={c.href} className={cn('sidebar-link', pathname === c.href && 'active')}
                          onMouseEnter={handleLinkEnter} onMouseLeave={handleLinkLeave}>
                          <CIcon className="w-4 h-4 shrink-0" />
                          {c.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
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
