'use client'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { CalendarDays, ArrowLeftRight, Sun, Moon, Clock } from 'lucide-react'
import { formatDate, DAY_LABELS, DAYS, shiftStyle, shiftBadge, avatarColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  user: any
  timetable: any
  allTimetables: any[]
  pendingHolidays: any[]
  recentSwaps: any[]
  role: string
}

export function DashboardClient({ user, allTimetables, pendingHolidays, recentSwaps, role }: Props) {
  const statsRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const remaining = (user?.totalHolidays ?? 28) - (user?.usedHolidays ?? 0)
  const usedPct = Math.round(((user?.usedHolidays ?? 0) / (user?.totalHolidays ?? 28)) * 100)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.stat-card', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' })
      gsap.fromTo('.timetable-row', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out', delay: 0.4 })
      gsap.fromTo('.holiday-bar-fill', { width: '0%' }, { width: `${usedPct}%`, duration: 1, ease: 'power2.out', delay: 0.6 })
    })
    return () => ctx.revert()
  }, [usedPct])


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats row */}
      <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Holidays', value: user?.totalHolidays ?? 28, sub: 'days per year', icon: CalendarDays, accent: 'text-blue-400 bg-blue-500/15' },
          null, // remaining — special
          { label: 'Current Shift', value: user?.shift === 'day' ? 'Day' : 'Night', sub: user?.shift === 'day' ? '08:00 – 16:00' : '16:00 – 00:00', icon: user?.shift === 'day' ? Sun : Moon, accent: shiftBadge(user?.shift ?? 'day') },
          { label: 'Pending Requests', value: pendingHolidays.length, sub: 'holiday requests', icon: Clock, accent: 'text-amber-400 bg-amber-500/15' },
        ].map((s, i) => {
          if (i === 1) return (
            <div key="remaining" className="stat-card card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Remaining</p>
                <div className="w-9 h-9 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{remaining}</p>
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div className="holiday-bar-fill h-full bg-emerald-500 rounded-full" style={{ width: `${usedPct}%` }} />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{user?.usedHolidays ?? 0} used</p>
              </div>
            </div>
          )
          if (!s) return null
          const Icon = s.icon
          return (
            <div key={s.label} className="stat-card card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.accent)}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Timetable */}
      <div ref={tableRef} className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Clock className="w-5 h-5" style={{ color: 'var(--brand-text)' }} />
            {role === 'admin' ? 'Team Timetable – This Week' : 'My Timetable – This Week'}
          </h2>
          <Link href="/dashboard/timetable" className="text-sm transition-colors" style={{ color: 'var(--brand-text)' }}>View full →</Link>
        </div>

        {allTimetables.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No timetable for this week yet.</p>
            {role === 'admin' && (
              <Link href="/dashboard/timetable" className="text-sm mt-2 inline-block hover:underline" style={{ color: 'var(--brand-text)' }}>Upload timetable →</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-base)' }}>
                  <th className="text-left py-3 px-3 font-medium w-40" style={{ color: 'var(--text-secondary)' }}>Employee</th>
                  {DAY_LABELS.map(d => (
                    <th key={d} className="text-center py-3 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTimetables.map((entry, i) => (
                  <tr key={entry.id ?? i} className="timetable-row border-b transition-colors" style={{ borderColor: 'var(--border-base)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0', avatarColor(entry.user?.name ?? ''))}>
                          {entry.user?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{entry.user?.name}</p>
                          <span className={cn('text-xs px-1.5 py-0.5 rounded-full', shiftBadge(entry.user?.shift ?? 'day'))}>
                            {entry.user?.shift}
                          </span>
                        </div>
                      </div>
                    </td>
                    {DAYS.map(day => (
                      <td key={day} className="py-3 px-2 text-center">
                        {entry[day] ? (
                          <span className={cn('text-xs px-2 py-1 rounded-lg font-medium', shiftStyle(entry[day]))}>
                            {entry[day]}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <CalendarDays className="w-4 h-4" style={{ color: 'var(--brand-text)' }} /> Holiday Requests
            </h3>
            <Link href="/dashboard/holidays" className="text-xs transition-colors" style={{ color: 'var(--brand-text)' }}>View all →</Link>
          </div>
          {pendingHolidays.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No pending requests</p>
          ) : (
            <div className="space-y-3">
              {pendingHolidays.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(h.startDate)} – {formatDate(h.endDate)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{h.days} day{h.days > 1 ? 's' : ''} · {h.reason}</p>
                  </div>
                  <span className="badge-pending">Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ArrowLeftRight className="w-4 h-4" style={{ color: 'var(--brand-text)' }} /> Shift Swaps
            </h3>
            <Link href="/dashboard/shift-swap" className="text-xs transition-colors" style={{ color: 'var(--brand-text)' }}>View all →</Link>
          </div>
          {recentSwaps.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No recent swap requests</p>
          ) : (
            <div className="space-y-3">
              {recentSwaps.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.requester.name} ↔ {s.target.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(s.swapDate)}</p>
                  </div>
                  <span className={cn(s.status === 'approved' ? 'badge-approved' : s.status === 'rejected' ? 'badge-rejected' : 'badge-pending')}>
                    {s.status === 'pending' ? 'Pending' : s.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
