'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { ArrowLeftRight, Plus, X, Check } from 'lucide-react'
import { formatDate, SHIFT_CHOICES } from '@/lib/utils'

interface Props { requests: any[]; employees: { id: string; name: string }[] }

export function ShiftChangeClient({ requests: initial, employees }: Props) {
  const [requests, setRequests] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [userId, setUserId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [newShift, setNewShift] = useState(SHIFT_CHOICES[0])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo('.shiftchange-card', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, ease: 'power2.out' })
  }, [])

  useEffect(() => {
    if (showForm && formRef.current)
      gsap.fromTo(formRef.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' })
  }, [showForm])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !date || !newShift || !reason) return toast.error('Please fill in all fields')
    setLoading(true)
    const res = await fetch('/api/shift-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date, newShift, reason }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Shift changed and timetable updated!')
      const owner = employees.find(e => e.id === userId)
      setRequests(prev => [{ ...data, user: owner }, ...prev])
      setShowForm(false); setUserId(''); setDate(new Date().toISOString().split('T')[0]); setNewShift(SHIFT_CHOICES[0]); setReason('')
    } else toast.error(data.error || 'Failed to submit')
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Change Shift</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Reassign an employee to a different shift on a specific date — updates the timetable for that day only
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Change Shift
        </button>
      </div>

      {showForm && (
        <div ref={formRef} className="card overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>New Shift Change</h2>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Employee</label>
              <select className="input" value={userId} onChange={e => setUserId(e.target.value)}>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">New shift</label>
              <select className="input" value={newShift} onChange={e => setNewShift(e.target.value)}>
                {SHIFT_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reason</label>
              <input type="text" className="input" placeholder="e.g. Covering a gap, business need..." value={reason} onChange={e => setReason(e.target.value)} required />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={loading || !userId} className="btn-primary flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Change & Update Timetable
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Shift Change History</h2>
        {requests.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No shift changes recorded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="shiftchange-card flex items-center justify-between p-4 rounded-xl border transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--brand-text)' }}>{r.user?.name}</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(r.date)} · Changed to {r.newShift}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.reason}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Recorded {formatDate(r.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
