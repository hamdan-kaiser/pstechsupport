'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { CalendarPlus, Plus, X, Check, Trash2, AlertCircle } from 'lucide-react'
import { formatDate, getWeekStart, getDayKey } from '@/lib/utils'
import { cn } from '@/lib/utils'

const SHIFT_CHOICES = ['8am (08:00-16:00)', '9am (09:00-17:00)', '10am (10:00-18:00)', '5pm (17:00-01:00)']

interface Props { requests: any[]; role: string; currentUserId: string }

export function AdditionalShiftClient({ requests: initial, role, currentUserId }: Props) {
  const [requests, setRequests] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState('')
  const [shift, setShift] = useState(SHIFT_CHOICES[0])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [dayValue, setDayValue] = useState<string | null>(null)
  const [checkingDay, setCheckingDay] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const isOffDay = date !== '' && (dayValue === null || dayValue.toLowerCase() === 'off')

  useEffect(() => {
    gsap.fromTo('.addshift-card', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, ease: 'power2.out' })
  }, [])

  useEffect(() => {
    if (showForm && formRef.current)
      gsap.fromTo(formRef.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' })
  }, [showForm])

  useEffect(() => {
    if (!date) { setDayValue(null); return }
    let cancelled = false
    setCheckingDay(true)
    const weekStart = getWeekStart(new Date(date))
    const dayKey = getDayKey(new Date(date))
    fetch(`/api/timetable?week=${weekStart.toISOString()}`)
      .then(res => res.ok ? res.json() : [])
      .then(entries => {
        if (cancelled) return
        const mine = Array.isArray(entries) ? entries.find((e: any) => e.userId === currentUserId) : null
        setDayValue(mine ? mine[dayKey] : null)
      })
      .catch(() => { if (!cancelled) setDayValue(null) })
      .finally(() => { if (!cancelled) setCheckingDay(false) })
    return () => { cancelled = true }
  }, [date, currentUserId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !shift || !reason) return toast.error('Please fill in all fields')
    setLoading(true)
    const res = await fetch('/api/additional-shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, shift, reason }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Additional shift request submitted!')
      setRequests(prev => [{ ...data, user: { name: 'You' } }, ...prev])
      setShowForm(false); setDate(''); setShift(SHIFT_CHOICES[0]); setReason('')
    } else toast.error(data.error || 'Failed to submit')
    setLoading(false)
  }

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    const res = await fetch(`/api/additional-shifts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success(`Request ${status}`)
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } else toast.error('Failed to update')
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/additional-shifts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Request deleted')
      setRequests(prev => prev.filter(r => r.id !== id))
    } else toast.error('Cannot delete this request')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Additional Shift</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {role === 'admin' ? 'Review requests to work an extra shift on a day off' : 'Pick up an extra shift on one of your days off — approval gives back a holiday day'}
          </p>
        </div>
        {role === 'employee' && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Request Additional Shift
          </button>
        )}
      </div>

      {showForm && role === 'employee' && (
        <div ref={formRef} className="card overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>New Additional Shift Request</h2>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date (must be a day you're OFF)</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
              {checkingDay && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Checking your schedule...</p>}
              {date && !checkingDay && !isOffDay && (
                <p className="text-xs mt-2 flex items-center gap-1.5 text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> You're scheduled to work ({dayValue}) that day — pick an actual day off.
                </p>
              )}
            </div>
            <div>
              <label className="label">Shift you'd work</label>
              <select className="input" value={shift} onChange={e => setShift(e.target.value)}>
                {SHIFT_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Reason</label>
              <input type="text" className="input" placeholder="e.g. Covering a backlog, extra hours..." value={reason} onChange={e => setReason(e.target.value)} required />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={loading || !isOffDay} className="btn-primary flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Submit Request
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {role === 'admin' ? 'All Additional Shift Requests' : 'My Additional Shift Requests'}
        </h2>
        {requests.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <CalendarPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No additional shift requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="addshift-card flex items-center justify-between p-4 rounded-xl border transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex-1 min-w-0">
                  {role === 'admin' && (
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--brand-text)' }}>{r.user?.name}</p>
                  )}
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(r.date)} · {r.shift}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.reason}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Submitted {formatDate(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className={cn(r.status === 'approved' ? 'badge-approved' : r.status === 'rejected' ? 'badge-rejected' : 'badge-pending')}>
                    {r.status}
                  </span>
                  {role === 'admin' && r.status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(r.id, 'approved')} className="btn-success py-1.5 px-3 text-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleAction(r.id, 'rejected')} className="btn-danger py-1.5 px-3 text-xs flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {r.status === 'pending' && role === 'employee' && (
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 transition-colors hover:text-red-400" style={{ color: 'var(--text-muted)' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
