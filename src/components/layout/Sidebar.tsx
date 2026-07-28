'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import {
  LayoutDashboard, CalendarDays, BarChart3, Clock, ArrowLeftRight,
  Users, Settings, LogOut, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const employeeLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/holidays', label: 'Holidays', icon: CalendarDays },
  { href: '/dashboard/stats', label: 'My Stats', icon: BarChart3 },
  { href: '/dashboard/timetable', label: 'Timetable', icon: Clock },
  { href: '/dashboard/shift-swap', label: 'Shift Swap', icon: ArrowLeftRight },
]

const adminLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/holidays', label: 'Holidays', icon: CalendarDays },
  { href: '/dashboard/stats', label: 'Stats & Leaderboard', icon: BarChart3 },
  { href: '/dashboard/timetable', label: 'Timetable', icon: Clock },
  { href: '/dashboard/shift-swap', label: 'Shift Swap', icon: ArrowLeftRight },
  { href: '/dashboard/admin/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const links = role === 'admin' ? adminLinks : employeeLinks

  useEffect(() => {
    gsap.fromTo(sidebarRef.current,
      { x: -260, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
    )
    gsap.fromTo('.sidebar-link',
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.2 }
    )
  }, [])

  return (
    <div ref={sidebarRef} className="w-64 shrink-0 flex flex-col h-full border-r" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-base)' }}>
      <div className="p-6 border-b" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm t-primary">Team Portal</p>
            <p className="text-xs t-muted capitalize">{role} Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn('sidebar-link', pathname === href && 'active')}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'var(--border-base)' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
