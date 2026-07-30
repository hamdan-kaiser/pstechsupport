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

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Maps JS Date.getDay() (0=Sunday) to the timetable's day-of-week field name */
export const JS_DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
export function getDayKey(date: Date): typeof JS_DAY_KEYS[number] {
  return JS_DAY_KEYS[date.getDay()]
}
export function getTodayDayKey(): typeof JS_DAY_KEYS[number] {
  return getDayKey(new Date())
}

/** Splits a shift value like "8am (08:00-16:00)" into a short label and a readable time range */
export function splitShiftValue(val: string): { label: string; time: string | null } {
  const match = val.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (match) return { label: match[1].trim(), time: match[2].replace('-', ' – ') }
  return { label: val, time: null }
}

/** Scheduled end time ("HH:MM", 24h) for each standard shift label, used to validate early-leave times */
export const SHIFT_END_TIMES: Record<string, string> = {
  '8am': '16:00',
  '9am': '17:00',
  '10am': '18:00',
  '5pm': '01:00', // past midnight
  '6pm': '02:00', // past midnight
}
export function getShiftEndTime(rawShiftValue: string | null | undefined): string | null {
  if (!rawShiftValue) return null
  const label = splitShiftValue(rawShiftValue).label.trim().toLowerCase()
  return SHIFT_END_TIMES[label] ?? null
}

// ─── Shared style helpers ───────────────────────────────────────────────────

/** Tailwind classes for a shift/timetable cell value */
export function shiftStyle(val: string | null | undefined): string {
  if (!val) return ''
  const v = val.toLowerCase()
  if (v === 'off')                              return 'bg-slate-200 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200'
  if (v.includes('holiday'))                    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300'
  if (v.includes('sick'))                       return 'bg-red-100 text-red-800 dark:bg-red-500/25 dark:text-red-300'
  if (v.includes('5pm') || v.includes('6pm') || v.includes('night')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/25 dark:text-indigo-300'
  if (v.includes('8am'))                        return 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300'
  if (v.includes('9am'))                        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/25 dark:text-yellow-300'
  if (v.includes('10am'))                       return 'bg-orange-100 text-orange-800 dark:bg-orange-500/25 dark:text-orange-300'
  return 'bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-300'
}

/** Tailwind classes for a role badge */
export function roleBadge(role: string): string {
  if (role === 'admin')  return 'bg-purple-100 text-purple-800 dark:bg-purple-500/25 dark:text-purple-300'
  if (role === 'viewer') return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/25 dark:text-cyan-300'
  return 'bg-slate-200 text-slate-800 dark:bg-slate-600/40 dark:text-slate-200'
}

/** Tailwind classes for a shift badge (day/night) */
export function shiftBadge(shift: string): string {
  return shift === 'day'
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300'
    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/25 dark:text-indigo-300'
}

/** Derive a day/night indicator from an actual timetable shift value (e.g. "8am (08:00-16:00)", "5pm (17:00-01:00)") */
export function deriveShiftPeriod(val: string | null | undefined): 'day' | 'night' | null {
  if (!val) return null
  const v = val.toLowerCase()
  if (v === 'off' || v.includes('holiday') || v.includes('sick')) return null
  if (v.includes('pm') || v.includes('night') || v.includes('5pm') || v.includes('6pm')) return 'night'
  if (v.includes('am') || v.includes('day')) return 'day'
  return null
}

/** Consistent avatar bg colour cycling through a palette by first letter */
export function avatarColor(name: string): string {
  const colors = ['bg-blue-600','bg-purple-600','bg-emerald-600','bg-rose-600','bg-amber-600','bg-cyan-600','bg-indigo-600']
  return colors[(name?.charCodeAt(0) ?? 0) % colors.length]
}
