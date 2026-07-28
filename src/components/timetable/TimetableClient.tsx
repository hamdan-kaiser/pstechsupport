'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Clock, Upload, Download, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, DAYS, DAY_LABELS, getWeekStart, shiftStyle, shiftBadge, avatarColor } from '@/lib/utils'

interface Props { entries: any[]; employees: any[]; role: string; weekStart: string }

export function TimetableClient({ entries: initial, employees, role, weekStart: initialWeek }: Props) {
  const [entries, setEntries] = useState(initial)
  const [weekStart, setWeekStart] = useState(new Date(initialWeek))
  const [uploading, setUploading] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.tt-row', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' })
    }, tableRef)
    return () => ctx.revert()
  }, [entries])

  async function loadWeek(date: Date) {
    const res = await fetch(`/api/timetable?week=${date.toISOString()}`)
    if (res.ok) setEntries(await res.json())
  }

  function changeWeek(dir: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + dir * 7)
    setWeekStart(d)
    loadWeek(d)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 })
        const headers = (rows[0] as string[]).map(h => h?.toString().toLowerCase().trim())
        const nameIdx = 0
        const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        const dayIndices = dayKeys.map(d => headers.findIndex(h => h.startsWith(d)))
        const parsedEntries: any[] = []
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || !row[nameIdx]) continue
          const empName = row[nameIdx]?.toString().trim()
          const emp = employees.find(e =>
            e.name.toLowerCase() === empName.toLowerCase() ||
            e.name.toLowerCase().startsWith(empName.toLowerCase())
          )
          if (!emp) { toast.error(`Employee not found: ${empName}`); continue }
          const entry: any = { userId: emp.id }
          DAYS.forEach((day, di) => {
            entry[day] = dayIndices[di] >= 0 ? row[dayIndices[di]]?.toString().trim() || null : null
          })
          parsedEntries.push(entry)
        }
        if (parsedEntries.length === 0) { toast.error('No valid rows found in Excel'); setUploading(false); return }
        const res = await fetch('/api/timetable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: parsedEntries, weekStart: weekStart.toISOString() }),
        })
        if (res.ok) { toast.success(`Timetable updated for ${parsedEntries.length} employees!`); loadWeek(weekStart) }
        else toast.error('Failed to save timetable')
      } catch { toast.error('Invalid Excel file format') }
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsBinaryString(file)
  }

  const weekLabel = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndLabel = weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  // ── Download timetable as xlsx ──
  function handleDownload() {
    if (entries.length === 0) return toast.error('No timetable to download')
    const rows = entries.map(entry => ({
      PS: entry.user?.name ?? '',
      Mon: entry.monday ?? '',
      Tue: entry.tuesday ?? '',
      Wed: entry.wednesday ?? '',
      Thu: entry.thursday ?? '',
      Fri: entry.friday ?? '',
      Sat: entry.saturday ?? '',
      Sun: entry.sunday ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows, { header: ['PS','Mon','Tue','Wed','Thu','Fri','Sat','Sun'] })
    ws['!cols'] = [{ wch: 24 }, ...Array(7).fill({ wch: 14 })]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Timetable')
    XLSX.writeFile(wb, `timetable_${weekLabel.replace(/ /g,'_')}.xlsx`)
    toast.success('Downloaded!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Timetable</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{weekLabel} – {weekEndLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <button onClick={() => changeWeek(-1)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Week</span>
            <button onClick={() => changeWeek(1)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={handleDownload} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Download
          </button>
          {role === 'admin' && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary flex items-center gap-2">
                {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload Excel
              </button>
            </>
          )}
        </div>
      </div>

      {role === 'admin' && (
        <div className="p-4 rounded-xl text-sm border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Excel Format Guide</p>
          <p>First column: employee first name. Headers: <span className="font-mono text-blue-400">PS | Mon | Tue | Wed | Thu | Fri | Sat | Sun</span></p>
          <p className="mt-1">Cell values: <span className="font-mono text-amber-400">8am</span>, <span className="font-mono text-indigo-400">5pm</span>, <span className="font-mono">OFF</span>, <span className="font-mono">Holiday</span>, <span className="font-mono">Sick Off</span></p>
        </div>
      )}

      <div ref={tableRef} className="card overflow-x-auto">
        {entries.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">No timetable for this week</p>
            {role === 'admin' && <p className="text-sm mt-2">Upload an Excel file to set the timetable</p>}
          </div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-base)' }}>
                <th className="text-left py-4 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Employee</th>
                {DAY_LABELS.map((d, i) => {
                  const dayDate = new Date(weekStart)
                  dayDate.setDate(dayDate.getDate() + i)
                  const isToday = dayDate.toDateString() === new Date().toDateString()
                  return (
                    <th key={d} className="text-center py-4 px-3 font-medium" style={{ color: isToday ? 'var(--brand-text)' : 'var(--text-secondary)' }}>
                      <div>{d}</div>
                      <div className="text-xs font-normal mt-0.5">{dayDate.getDate()}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id ?? i} className="tt-row border-b transition-colors" style={{ borderColor: 'var(--border-base)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0', avatarColor(entry.user?.name ?? ''))}>
                        {entry.user?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{entry.user?.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {entry.user?.shift === 'day'
                            ? <><Sun className="w-3 h-3 text-amber-400" /><span className="text-xs text-amber-400">Day</span></>
                            : <><Moon className="w-3 h-3 text-indigo-400" /><span className="text-xs text-indigo-400">Night</span></>
                          }
                        </div>
                      </div>
                    </div>
                  </td>
                  {DAYS.map(day => (
                    <td key={day} className="py-4 px-3 text-center">
                      {entry[day] ? (
                        <span className={cn('text-xs px-2.5 py-1.5 rounded-lg font-medium inline-block', shiftStyle(entry[day]))}>
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
        )}
      </div>

      <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--text-secondary)' }}>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/30 inline-block" /> 8am (08:00–16:00)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-500/30 inline-block" /> 9am (09:00–17:00)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500/30 inline-block" /> 10am (10:00–18:00)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500/30 inline-block" /> 5pm/6pm (17:00–01:00)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 inline-block" /> Holiday</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/30 inline-block" /> Sick Off</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-500/30 inline-block" /> OFF</span>
      </div>
    </div>
  )
}
