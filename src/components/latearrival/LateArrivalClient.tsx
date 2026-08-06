'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { Timer, Plus, X, Check, Trash2, AlertCircle, Clock } from 'lucide-react'
import { formatDate, getWeekStart, getDayKey, getShiftStartTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  requests: any[]
  role: string
  employees: { id: string; name: string }[]
  todayShift: string | null
  shiftStart: string | null
  currentUserId: string
}

export function LateArrivalClient({ requests: initial, role, employees, todayShift, shiftStart, currentUserId }: Props) {
  const [requests, setRequests] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [joiningTime, setJoiningTime] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  // Admin-only "record on behalf of" fields
  const todayStr = new Date().toISOString().split('T')[0]
  const [targetUserId, setTargetUserId] = useState('')
  const [targetDate, setTargetDate] = useState(todayStr)
  const [targetShiftValue, setTargetShiftValue] = useState<string | null>(null)
  const [checkingDay, setCheckingDay] = useState(false)

  const isAdmin = role === 'admin'
  const effectiveShiftStart = isAdmin ? getShiftStartTime(targetShiftValue) : shiftStart
  const isValidTime = effectiveShiftStart !== null && joiningTime !== '' && joiningTime > effectiveShiftStart

  useEffect(() => {
    gsap.fromTo('.late-card', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, ease: 'power2.out' })
  }, [])

  useEffect(() => {
    if (showForm && formRef.current)
      gsap.fromTo(formRef.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' })
  }, [showForm])

  // Admin: look up the selected employee's actual scheduled shift for the chosen date
  useEffect(() => {
    if (!isAdmin || !targetUserId || !targetDate) { setTargetShiftValue(null); return }
    let cancelled = false
    setCheckingDay(true)
    const weekStart = getWeekStart(new Date(targetDate))
    const dayKey = getDayKey(new Date(targetDate))
    fetch(`/api/timetable?week=${weekStart.toISOString()}`)
      .then(res => res.ok ? res.json() : [])
      .then(entries => {
        if (cancelled) return
        const row = Array.isArray(entries) ? entries.find((e: any) => e.userId === targetUserId) : null
        setTargetShiftValue(row ? row[dayKey] : null)
      })
      .catch(() => { if (!cancelled) setTargetShiftValue(null) })
      .finally(() => { if (!cancelled) setCheckingDay(false) })
    return () => { cancelled = true }
  }, [isAdmin, targetUserId, targetDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!joiningTime || !reason) return toast.error('Please fill in all fields')
    if (isAdmin && !targetUserId) return toast.error('Please select an employee')
    if (!effectiveShiftStart) return toast.error("No recognized shift scheduled that day")
    if (joiningTime <= effectiveShiftStart) return toast.error(`Joining time must be later than the shift start (${effectiveShiftStart})`)
    setLoading(true)
    const body: any = { joiningTime, reason }
    if (isAdmin) { body.userId = targetUserId; body.date = targetDate }
    const res = await fetch('/api/late-arrival', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(isAdmin ? 'Late arrival recorded!' : 'Late arrival request submitted!')
      const owner = isAdmin ? employees.find(e => e.id === targetUserId) : { name: 'You' }
      setRequests(prev => [{ ...data, user: owner }, ...prev])
      setShowForm(false); setJoiningTime(''); setReason(''); setTargetUserId(''); setTargetDate(todayStr)
    } else toast.error(data.error || 'Failed to submit')
    setLoading(false)
  }

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    const res = await fetch(`/api/late-arrival/${id}`, {
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
    const res = await fetch(`/api/late-arrival/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Request deleted')
      setRequests(prev => prev.filter(r => r.id !== id))
    } else toast.error('Cannot delete this request')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Late Arrival</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {role === 'admin' ? 'Review late-arrival requests, or record one on an employee\'s behalf' : 'Joining late today? Let admin know what time you\'ll arrive'}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {role === 'admin' ? 'Record Late Arrival' : 'Report Late Arrival'}
        </button>
      </div>

      {role === 'employee' && (
        <div className="p-4 rounded-xl text-sm flex items-center gap-2 bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          A late arrival counts against your Overall Performance score this month, same as a Sudden Leave — use it only when genuinely needed.
        </div>
      )}

      {showForm && (
        <div ref={formRef} className="card overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isAdmin ? 'Record Late Arrival for an Employee' : 'New Late Arrival Report'}
            </h2>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>

          {isAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Employee</label>
                <select className="input" value={targetUserId} onChange={e => setTargetUserId(e.target.value)}>
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
              </div>
            </div>
          ) : null}

          {(!isAdmin || targetUserId) && (
            checkingDay ? (
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Checking schedule...</p>
            ) : effectiveShiftStart ? (
              <p className="text-sm mb-4 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Clock className="w-4 h-4" /> Scheduled shift: <strong style={{ color: 'var(--text-primary)' }}>{isAdmin ? targetShiftValue : todayShift}</strong>, starting at <strong style={{ color: 'var(--text-primary)' }}>{effectiveShiftStart}</strong>
              </p>
            ) : (
              <p className="text-sm mb-4 text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> No recognized shift scheduled that day, so a late-arrival time can't be validated.
              </p>
            )
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">What time will {isAdmin ? 'they' : 'you'} join?</label>
              <input type="time" className="input" value={joiningTime} onChange={e => setJoiningTime(e.target.value)} required disabled={!effectiveShiftStart} />
              {joiningTime && effectiveShiftStart && !isValidTime && (
                <p className="text-xs mt-2 flex items-center gap-1.5 text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Must be later than the shift start at {effectiveShiftStart}.
                </p>
              )}
            </div>
            <div>
              <label className="label">Reason</label>
              <input type="text" className="input" placeholder="e.g. Feeling unwell, appointment..." value={reason} onChange={e => setReason(e.target.value)} required />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={loading || !isValidTime || (isAdmin && !targetUserId)} className="btn-primary flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {isAdmin ? 'Record & Update Timetable' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {role === 'admin' ? 'All Late Arrival Requests' : 'My Late Arrival Requests'}
        </h2>
        {requests.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <Timer className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No late arrival requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="late-card flex items-center justify-between p-4 rounded-xl border transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex-1 min-w-0">
                  {role === 'admin' && (
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--brand-text)' }}>{r.user?.name}</p>
                  )}
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(r.date)} · Joining at {r.joiningTime} (shift starts {r.shiftStart})</p>
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
