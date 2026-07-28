'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { BarChart3, Trophy, Phone, FileText, Plus, X, Check, Download, Upload } from 'lucide-react'
import { cn, avatarColor } from '@/lib/utils'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Exact column headers matching the provided Excel format
const STAT_HEADERS = [
  'PS',
  'Number of Case Created',
  'No. of issues resolved successfully',
  'No. of Inbound calls received',
  'No. of Outbound calls Made',
]

interface Props { stats: any[]; role: string; employees: any[]; currentMonth: number; currentYear: number }

export function StatsClient({ stats: initial, role, employees, currentMonth, currentYear }: Props) {
  const [stats, setStats] = useState(initial)
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(currentYear)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ userId: '', casesCreated: 0, casesResolved: 0, inboundCalls: 0, outboundCalls: 0 })
  const [loading, setLoading] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.stat-row', { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' })
      gsap.fromTo('.bar-fill', { scaleX: 0 }, { scaleX: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out', delay: 0.3, transformOrigin: 'left' })
    }, cardsRef)
    return () => ctx.revert()
  }, [stats])

  async function fetchStats() {
    setLoading(true)
    const res = await fetch(`/api/stats?month=${month}&year=${year}`)
    if (res.ok) setStats(await res.json())
    setLoading(false)
  }

  async function handleSave() {
    setLoading(true)
    const res = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, month, year }),
    })
    if (res.ok) { toast.success('Stats saved!'); setShowForm(false); fetchStats() }
    else toast.error('Failed to save')
    setLoading(false)
  }

  // ── Download current stats as xlsx ──
  function handleDownload() {
    if (stats.length === 0) return toast.error('No stats to download')
    const rows = stats.map(s => ({
      [STAT_HEADERS[0]]: s.user?.name ?? '',
      [STAT_HEADERS[1]]: s.casesCreated,
      [STAT_HEADERS[2]]: s.casesResolved,
      [STAT_HEADERS[3]]: s.inboundCalls,
      [STAT_HEADERS[4]]: s.outboundCalls,
    }))
    const ws = XLSX.utils.json_to_sheet(rows, { header: STAT_HEADERS })
    // Column widths
    ws['!cols'] = [{ wch: 24 }, { wch: 26 }, { wch: 36 }, { wch: 32 }, { wch: 28 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[month - 1]} ${year}`)
    XLSX.writeFile(wb, `stats_${MONTHS[month - 1]}_${year}.xlsx`)
    toast.success('Downloaded!')
  }

  // ── Download blank template ──
  function handleDownloadTemplate() {
    const rows = employees.map(e => ({
      [STAT_HEADERS[0]]: e.name,
      [STAT_HEADERS[1]]: '',
      [STAT_HEADERS[2]]: '',
      [STAT_HEADERS[3]]: '',
      [STAT_HEADERS[4]]: '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows, { header: STAT_HEADERS })
    ws['!cols'] = [{ wch: 24 }, { wch: 26 }, { wch: 36 }, { wch: 32 }, { wch: 28 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `stats_template_${MONTHS[month - 1]}_${year}.xlsx`)
    toast.success('Template downloaded!')
  }

  // ── Upload xlsx ──
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(ws)
        const records: any[] = []
        const notFound: string[] = []

        for (const row of rows) {
          const name = row['PS']?.toString().trim()
          if (!name) continue
          const emp = employees.find(e =>
            e.name.toLowerCase() === name.toLowerCase() ||
            e.name.toLowerCase().startsWith(name.toLowerCase())
          )
          if (!emp) { notFound.push(name); continue }
          records.push({
            userId: emp.id,
            month,
            year,
            casesCreated:  parseInt(row[STAT_HEADERS[1]]) || 0,
            casesResolved: parseInt(row[STAT_HEADERS[2]]) || 0,
            inboundCalls:  parseInt(row[STAT_HEADERS[3]]) || 0,
            outboundCalls: parseInt(row[STAT_HEADERS[4]]) || 0,
          })
        }

        if (notFound.length) toast.error(`Not found: ${notFound.join(', ')}`)
        if (records.length === 0) { toast.error('No valid rows found'); return }

        const res = await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(records),
        })
        if (res.ok) { toast.success(`Uploaded ${records.length} records!`); fetchStats() }
        else toast.error('Upload failed')
      } catch { toast.error('Invalid file format') }
      if (uploadRef.current) uploadRef.current.value = ''
    }
    reader.readAsBinaryString(file)
  }

  const maxResolved = Math.max(...stats.map(s => s.casesResolved), 1)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-6 animate-fade-in" ref={cardsRef}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Stats & Leaderboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{MONTHS[month - 1]} {year}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input w-auto" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-auto" value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchStats} className="btn-secondary">Load</button>
          <button onClick={handleDownload} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Download
          </button>
          {role === 'admin' && (
            <>
              <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
                <Download className="w-4 h-4" /> Template
              </button>
              <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
              <button onClick={() => uploadRef.current?.click()} className="btn-secondary flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload
              </button>
              <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Stats
              </button>
            </>
          )}
        </div>
      </div>

      {showForm && role === 'admin' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Add / Update Stats</h3>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-3">
              <label className="label">Employee</label>
              <select className="input" value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            {(['casesCreated','casesResolved','inboundCalls','outboundCalls'] as const).map(field => (
              <div key={field}>
                <label className="label capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input type="number" min={0} className="input" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: +e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={!form.userId || loading} className="btn-primary flex items-center gap-2">
              <Check className="w-4 h-4" /> Save
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {role === 'admin' && stats.length > 0 && (
        <div className="card">
          <h2 className="font-semibold flex items-center gap-2 mb-5" style={{ color: 'var(--text-primary)' }}>
            <Trophy className="w-5 h-5 text-amber-400" /> Leaderboard – Cases Resolved
          </h2>
          <div className="space-y-3">
            {stats.map((s, i) => (
              <div key={s.id} className="stat-row flex items-center gap-4">
                <span className="text-xl w-8 text-center">{medals[i] ?? `#${i + 1}`}</span>
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0', avatarColor(s.user?.name ?? ''))}>
                  {s.user?.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.user?.name}</p>
                    <p className="text-sm font-bold text-emerald-400">{s.casesResolved}</p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <div className="bar-fill h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
                      style={{ width: `${(s.casesResolved / maxResolved) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map(s => (
          <div key={s.id} className="stat-row card">
            {role === 'admin' && (
              <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: 'var(--border-base)' }}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold', avatarColor(s.user?.name ?? ''))}>
                  {s.user?.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.user?.name}</p>
                  <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{s.user?.shift} shift</p>
                </div>
              </div>
            )}
            {role !== 'admin' && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{MONTHS[s.month - 1]} {s.year}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Cases Created',  value: s.casesCreated,  icon: FileText, color: 'text-blue-400 bg-blue-500/15' },
                { label: 'Cases Resolved', value: s.casesResolved, icon: Check,    color: 'text-emerald-400 bg-emerald-500/15' },
                { label: 'Inbound Calls',  value: s.inboundCalls,  icon: Phone,    color: 'text-amber-400 bg-amber-500/15' },
                { label: 'Outbound Calls', value: s.outboundCalls, icon: Phone,    color: 'text-purple-400 bg-purple-500/15' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {stats.length === 0 && (
          <div className="md:col-span-2 card text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No stats for {MONTHS[month - 1]} {year}</p>
          </div>
        )}
      </div>
    </div>
  )
}
