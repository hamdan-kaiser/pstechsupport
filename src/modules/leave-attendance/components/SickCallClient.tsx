'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { Thermometer, Plus, X, Check, Trash2 } from 'lucide-react'
import { formatDate, diffDays } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props { requests: any[]; role: string }

export function SickCallClient({ requests: initial, role }: Props) {
  const [requests, setRequests] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo('.sick-card', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, ease: 'power2.out' })
  }, [])

  useEffect(() => {
    if (showForm && formRef.current)
      gsap.fromTo(formRef.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' })
  }, [showForm])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!startDate || !endDate) return toast.error('Please select dates')
    if (new Date(endDate) < new Date(startDate)) return toast.error('End date must be after start date')
    setLoading(true)
    const res = await fetch('/api/sick-calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, reason }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Sick call submitted!')
      setRequests(prev => [{ ...data, user: { name: 'You' } }, ...prev])
      setShowForm(false); setStartDate(''); setEndDate(''); setReason('')
    } else toast.error(data.error)
    setLoading(false)
  }

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    const res = await fetch(`/api/sick-calls/${id}`, {
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
    const res = await fetch(`/api/sick-calls/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Request deleted')
      setRequests(prev => prev.filter(r => r.id !== id))
    } else toast.error('Cannot delete this request')
  }

  const days = startDate && endDate ? diffDays(new Date(startDate), new Date(endDate)) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sick Calls</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {role === 'admin' ? 'Review and manage sick call reports' : 'Report sickness and track your requests'}
          </p>
        </div>
        {role === 'employee' && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Report Sick
          </button>
        )}
      </div>

      {showForm && role === 'employee' && (
        <div ref={formRef} className="card overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>New Sick Call</h2>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Reason</label>
              <input type="text" className="input" placeholder="e.g. Flu, migraine, medical appointment..." value={reason} onChange={e => setReason(e.target.value)} required />
            </div>
            {days > 0 && (
              <div className="sm:col-span-2 p-3 rounded-xl text-sm bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                This report covers <strong>{days}</strong> day{days > 1 ? 's' : ''}. Admin will review and your timetable will update once approved.
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Submit Sick Call
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {role === 'admin' ? 'All Sick Calls' : 'My Sick Calls'}
        </h2>
        {requests.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <Thermometer className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No sick calls reported</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="sick-card flex items-center justify-between p-4 rounded-xl border transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex-1 min-w-0">
                  {role === 'admin' && (
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--brand-text)' }}>{r.user?.name}</p>
                  )}
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(r.startDate)} – {formatDate(r.endDate)}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.days} day{r.days > 1 ? 's' : ''} · {r.reason}</p>
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
