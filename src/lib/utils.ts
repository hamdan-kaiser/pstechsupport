import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  const d = new Date(date)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function getWeekStart(date: Date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function diffDays(start: Date, end: Date) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1
}

export const SHIFT_TIMES = {
  'early':  '08:00 - 16:00',
  'mid':    '09:00 - 17:00',
  'late':   '10:00 - 18:00',
  'night':  '17:00 - 01:00',
}

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Shared style helpers ───────────────────────────────────────────────────

/** Tailwind classes for a shift/timetable cell value */
export function shiftStyle(val: string | null | undefined): string {
  if (!val) return ''
  const v = val.toLowerCase()
  if (v === 'off')                              return 'bg-slate-500/15 text-slate-400'
  if (v.includes('holiday'))                    return 'bg-emerald-500/15 text-emerald-400'
  if (v.includes('sick'))                       return 'bg-red-500/15 text-red-400'
  if (v.includes('5pm') || v.includes('6pm') || v.includes('night')) return 'bg-indigo-500/15 text-indigo-400'
  if (v.includes('8am'))                        return 'bg-amber-500/15 text-amber-400'
  if (v.includes('9am'))                        return 'bg-yellow-500/15 text-yellow-400'
  if (v.includes('10am'))                       return 'bg-orange-500/15 text-orange-400'
  return 'bg-blue-500/15 text-blue-400'
}

/** Tailwind classes for a role badge */
export function roleBadge(role: string): string {
  if (role === 'admin')  return 'bg-purple-500/20 text-purple-400'
  if (role === 'viewer') return 'bg-cyan-500/20 text-cyan-400'
  return 'bg-slate-700 text-slate-300'
}

/** Tailwind classes for a shift badge (day/night) */
export function shiftBadge(shift: string): string {
  return shift === 'day'
    ? 'bg-amber-500/20 text-amber-300'
    : 'bg-indigo-500/20 text-indigo-300'
}

/** Consistent avatar bg colour cycling through a palette by first letter */
export function avatarColor(name: string): string {
  const colors = ['bg-blue-600','bg-purple-600','bg-emerald-600','bg-rose-600','bg-amber-600','bg-cyan-600','bg-indigo-600']
  return colors[(name?.charCodeAt(0) ?? 0) % colors.length]
}
