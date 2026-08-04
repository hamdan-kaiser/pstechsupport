'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { DoorOpen, Plus, X, Check, Trash2, AlertCircle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props { requests: any[]; role: string; todayShift: string | null; shiftEnd: string | null }

export function SuddenLeaveClient({ requests: initial, role, todayShift, shiftEnd }: Props) {
  const [requests, setRequests] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [leaveTime, setLeaveTime] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const isValidTime = shiftEnd !== null && leaveTime !== '' && leaveTime < shiftEnd

  useEffect(() => {
    gsap.fromTo('.leave-card', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, ease: 'power2.out' })
  }, [])

  useEffect(() => {
    if (showForm && formRef.current)
      gsap.fromTo(formRef.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' })
  }, [showForm])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!leaveTime || !reason) return toast.error('Please fill in all fields')
    if (!shiftEnd) return toast.error("You don't have a recognized shift scheduled today")
    if (leaveTime >= shiftEnd) return toast.error(`Leave time must be before your shift ends at ${shiftEnd}`)
    setLoading(true)
    const res = await fetch('/api/sudden-leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaveTime, reason }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Sudden leave request submitted!')
      setRequests(prev => [{ ...data, user: { name: 'You' } }, ...prev])
      setShowForm(false); setLeaveTime(''); setReason('')
    } else toast.error(data.error || 'Failed to submit')
    setLoading(false)
  }

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    const res = await fetch(`/api/sudden-leave/${id}`, {
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
    const res = await fetch(`/api/sudden-leave/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Request deleted')
      setRequests(prev => prev.filter(r => r.id !== id))
    } else toast.error('Cannot delete this request')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sudden Leave</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {role === 'admin' ? 'Review same-day early leave requests' : 'Need to leave early today? Request it here'}
          </p>
        </div>
        {role === 'employee' && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Request Early Leave
          </button>
        )}
      </div>

      {role === 'employee' && (
        <div className="p-4 rounded-xl text-sm flex items-center gap-2 bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Sudden leave counts against your Overall Performance score this month — use it only when genuinely needed.
        </div>
      )}

      {showForm && role === 'employee' && (
        <div ref={formRef} className="card overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>New Sudden Leave Request</h2>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>

          {shiftEnd ? (
            <p className="text-sm mb-4 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Clock className="w-4 h-4" /> Today's shift: <strong style={{ color: 'var(--text-primary)' }}>{todayShift}</strong>, ending at <strong style={{ color: 'var(--text-primary)' }}>{shiftEnd}</strong>
            </p>
          ) : (
            <p className="text-sm mb-4 text-red-500 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> You don't have a recognized shift scheduled today, so an early leave time can't be validated.
            </p>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">What time do you need to leave?</label>
              <input type="time" className="input" value={leaveTime} onChange={e => setLeaveTime(e.target.value)} required disabled={!shiftEnd} />
              {leaveTime && shiftEnd && !isValidTime && (
                <p className="text-xs mt-2 flex items-center gap-1.5 text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Must be before your shift ends at {shiftEnd}.
                </p>
              )}
            </div>
            <div>
              <label className="label">Reason</label>
              <input type="text" className="input" placeholder="e.g. Family emergency, appointment..." value={reason} onChange={e => setReason(e.target.value)} required />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={loading || !isValidTime} className="btn-primary flex items-center gap-2">
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
          {role === 'admin' ? 'All Sudden Leave Requests' : 'My Sudden Leave Requests'}
        </h2>
        {requests.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <DoorOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No sudden leave requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="leave-card flex items-center justify-between p-4 rounded-xl border transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex-1 min-w-0">
                  {role === 'admin' && (
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--brand-text)' }}>{r.user?.name}</p>
                  )}
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(r.date)} · Leaving at {r.leaveTime} (shift ends {r.shiftEnd})</p>
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
