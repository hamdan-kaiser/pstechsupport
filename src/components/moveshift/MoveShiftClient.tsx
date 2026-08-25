'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { Repeat, Plus, X, Check, Trash2, AlertCircle } from 'lucide-react'
import { formatDate, getWeekStart, getDayKey } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props { requests: any[]; role: string; currentUserId: string }

export function MoveShiftClient({ requests: initial, role, currentUserId }: Props) {
  const [requests, setRequests] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [fromValue, setFromValue] = useState<string | null>(null)
  const [toValue, setToValue] = useState<string | null>(null)
  const [checkingFrom, setCheckingFrom] = useState(false)
  const [checkingTo, setCheckingTo] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const isValidFrom = fromDate !== '' && fromValue !== null && fromValue.toLowerCase() !== 'off'
  const datesDiffer = fromDate !== '' && toDate !== '' && fromDate !== toDate

  useEffect(() => {
    gsap.fromTo('.move-card', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, ease: 'power2.out' })
  }, [])

  useEffect(() => {
    if (showForm && formRef.current)
      gsap.fromTo(formRef.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' })
  }, [showForm])

  async function lookupDay(date: string, setValue: (v: string | null) => void, setChecking: (v: boolean) => void) {
    if (!date) { setValue(null); return }
    setChecking(true)
    const weekStart = getWeekStart(new Date(date))
    const dayKey = getDayKey(new Date(date))
    try {
      const res = await fetch(`/api/timetable?week=${weekStart.toISOString()}`)
      const entries = res.ok ? await res.json() : []
      const mine = Array.isArray(entries) ? entries.find((e: any) => e.userId === currentUserId) : null
      setValue(mine ? mine[dayKey] : null)
    } catch {
      setValue(null)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => { lookupDay(fromDate, setFromValue, setCheckingFrom) }, [fromDate])
  useEffect(() => { lookupDay(toDate, setToValue, setCheckingTo) }, [toDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fromDate || !toDate || !reason) return toast.error('Please fill in all fields')
    setLoading(true)
    const res = await fetch('/api/move-shift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromDate, toDate, reason }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Shift move request submitted!')
      setRequests(prev => [{ ...data, user: { name: 'You' } }, ...prev])
      setShowForm(false); setFromDate(''); setToDate(''); setReason('')
    } else toast.error(data.error || 'Failed to submit')
    setLoading(false)
  }

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    const res = await fetch(`/api/move-shift/${id}`, {
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
    const res = await fetch(`/api/move-shift/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Request deleted')
      setRequests(prev => prev.filter(r => r.id !== id))
    } else toast.error('Cannot delete this request')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Move Shift</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {role === 'admin' ? "Review employees' requests to move a scheduled shift to a different day" : "Need to cover a different day instead? Move one of your shifts to another day"}
          </p>
        </div>
        {role === 'employee' && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Move a Shift
          </button>
        )}
      </div>

      {showForm && role === 'employee' && (
        <div ref={formRef} className="card overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>New Shift Move Request</h2>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Move shift away from...</label>
              <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} required />
              {checkingFrom && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Checking your schedule...</p>}
              {fromDate && !checkingFrom && (
                isValidFrom
                  ? <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Currently scheduled: <strong style={{ color: 'var(--text-primary)' }}>{fromValue}</strong></p>
                  : <p className="text-xs mt-2 flex items-center gap-1.5 text-red-500"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> You're not scheduled to work that day — pick a day you actually have a shift.</p>
              )}
            </div>
            <div>
              <label className="label">...to this day instead</label>
              <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} required />
              {checkingTo && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Checking your schedule...</p>}
              {toDate && !checkingTo && (
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Currently scheduled: <strong style={{ color: 'var(--text-primary)' }}>{toValue ?? 'OFF'}</strong></p>
              )}
              {fromDate && toDate && !datesDiffer && (
                <p className="text-xs mt-2 flex items-center gap-1.5 text-red-500"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> Pick two different days.</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Reason</label>
              <input type="text" className="input" placeholder="e.g. Personal appointment, family event..." value={reason} onChange={e => setReason(e.target.value)} required />
            </div>
            {isValidFrom && datesDiffer && (
              <div className="sm:col-span-2 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                Once approved: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(fromDate)}</strong> becomes <strong style={{ color: 'var(--text-primary)' }}>{toValue ?? 'OFF'}</strong>, and <strong style={{ color: 'var(--text-primary)' }}>{formatDate(toDate)}</strong> becomes <strong style={{ color: 'var(--text-primary)' }}>{fromValue}</strong>.
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={loading || !isValidFrom || !datesDiffer} className="btn-primary flex items-center gap-2">
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
          {role === 'admin' ? 'All Shift Move Requests' : 'My Shift Move Requests'}
        </h2>
        {requests.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <Repeat className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No shift move requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="move-card flex items-center justify-between p-4 rounded-xl border transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex-1 min-w-0">
                  {role === 'admin' && (
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--brand-text)' }}>{r.user?.name}</p>
                  )}
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(r.fromDate)} → {formatDate(r.toDate)}</p>
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
