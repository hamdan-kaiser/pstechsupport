'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { ArrowLeftRight, Plus, X, Check, Clock, Sun, Moon, AlertCircle } from 'lucide-react'
import { formatDate, avatarColor, getWeekStart, getDayKey, splitShiftValue } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/design'

interface Props { swaps: any[]; employees: any[]; role: string; currentUserId: string }

const SHIFT_OPTIONS = [
  { value: '8am (08:00-16:00)',  label: '8am (08:00–16:00)',  icon: Sun,  color: 'text-amber-400' },
  { value: '9am (09:00-17:00)',  label: '9am (09:00–17:00)',  icon: Sun,  color: 'text-yellow-400' },
  { value: '10am (10:00-18:00)', label: '10am (10:00–18:00)', icon: Sun,  color: 'text-orange-400' },
  { value: '5pm (17:00-01:00)',  label: '5pm (17:00–01:00)',  icon: Moon, color: 'text-indigo-400' },
]

/** Matches a raw timetable value (e.g. "8am" or "8am (08:00-16:00)") to one of the 4 standard
 *  shift options by comparing labels — returns '' for OFF/Holiday/Sick/unscheduled/unrecognized. */
function matchShiftOption(rawValue: string | null | undefined): string {
  if (!rawValue) return ''
  const rawLabel = splitShiftValue(rawValue).label.trim().toLowerCase()
  const match = SHIFT_OPTIONS.find(opt => splitShiftValue(opt.value).label.trim().toLowerCase() === rawLabel)
  return match ? match.value : ''
}

export function ShiftSwapClient({ swaps: initial, employees, role, currentUserId }: Props) {
  const [swaps, setSwaps] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [swapDate, setSwapDate] = useState('')
  const [targetId, setTargetId] = useState('')
  const [requesterShift, setRequesterShift] = useState('')
  const [targetShift, setTargetShift] = useState('')
  const [weekEntries, setWeekEntries] = useState<any[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Load the relevant week's real timetable whenever the chosen date changes
  useEffect(() => {
    setWeekEntries([]) // clear stale data from a previous date immediately, so no wrong default flashes
    if (!swapDate) return
    let cancelled = false
    setLoadingSchedule(true)
    const weekStart = getWeekStart(new Date(swapDate))
    fetch(`/api/timetable?week=${weekStart.toISOString()}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (!cancelled) setWeekEntries(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setWeekEntries([]) })
      .finally(() => { if (!cancelled) setLoadingSchedule(false) })
    return () => { cancelled = true }
  }, [swapDate])

  // Auto-fill "your shift" from your actual schedule that day — blank if off/unscheduled
  useEffect(() => {
    if (!swapDate) { setRequesterShift(''); return }
    const dayKey = getDayKey(new Date(swapDate))
    const myEntry = weekEntries.find(e => e.userId === currentUserId)
    setRequesterShift(matchShiftOption(myEntry ? myEntry[dayKey] : null))
  }, [weekEntries, swapDate, currentUserId])

  // Auto-fill the target's shift the same way, once a target is picked
  useEffect(() => {
    if (!swapDate || !targetId) { setTargetShift(''); return }
    const dayKey = getDayKey(new Date(swapDate))
    const targetEntry = weekEntries.find(e => e.userId === targetId)
    setTargetShift(matchShiftOption(targetEntry ? targetEntry[dayKey] : null))
  }, [weekEntries, swapDate, targetId])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.swap-card', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' })
    }, listRef)
    return () => ctx.revert()
  }, [swaps])

  // Keep the list fresh — otherwise an already-open tab (e.g. admin's) keeps showing a stale
  // status after someone else accepts/declines/approves elsewhere.
  useEffect(() => {
    async function refresh() {
      const res = await fetch('/api/shift-swap')
      if (res.ok) setSwaps(await res.json())
    }
    const interval = setInterval(refresh, 20000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [])

  useEffect(() => {
    if (showForm && formRef.current)
      gsap.fromTo(formRef.current, { y: -15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' })
  }, [showForm])

  useEffect(() => {
    if (!targetId || !swapDate) { setConflict(null); return }
    setChecking(true)
    const timer = setTimeout(async () => {
      const existing = swaps.find(s =>
        (s.targetId === targetId || s.requesterId === targetId) &&
        new Date(s.swapDate).toDateString() === new Date(swapDate).toDateString() &&
        ['pending', 'approved'].includes(s.status)
      )
      setConflict(existing ? 'User already has a pending or approved swap on that date.' : null)
      setChecking(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [targetId, swapDate, swaps])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (conflict) return toast.error(conflict)
    setLoading(true)
    const res = await fetch('/api/shift-swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, swapDate, requesterShift, targetShift }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Request sent! Waiting for their acceptance.')
      const target = employees.find(e => e.id === targetId)
      setSwaps(prev => [{ ...data, requester: { id: currentUserId, name: 'You', shift: 'day' }, target: { id: targetId, name: target?.name, shift: target?.shift } }, ...prev])
      setShowForm(false); setTargetId(''); setSwapDate('')
    } else {
      toast.error(data.error || 'Failed to send request')
      gsap.fromTo(formRef.current, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' })
    }
    setLoading(false)
  }

  async function handleAction(id: string, action: string) {
    const res = await fetch(`/api/shift-swap/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast.success('Done!')
      const r = await fetch('/api/shift-swap')
      if (r.ok) setSwaps(await r.json())
    } else {
      const d = await res.json()
      toast.error(d.error || 'Failed')
    }
  }

  const getStatusBadge = (swap: any) => {
    if (swap.status === 'approved') return <span className="badge-approved">Approved ✅</span>
    if (swap.status === 'rejected') return <span className="badge-rejected">Rejected ❌</span>
    if (!swap.targetAccepted) return <span className="badge-pending">Awaiting Response</span>
    return <span className="badge-pending">Awaiting Admin</span>
  }

  const selectedTarget = employees.find(e => e.id === targetId)

  const shiftBtn = (value: string, selected: string, onClick: () => void, opt: typeof SHIFT_OPTIONS[0]) => (
    <button key={opt.value} type="button" onClick={onClick}
      className="p-3 rounded-xl border text-left transition-all duration-200"
      style={{
        borderColor: selected === value ? 'var(--brand)' : 'var(--border-subtle)',
        backgroundColor: selected === value ? 'var(--brand-subtle)' : 'var(--bg-elevated)',
      }}>
      <opt.icon className={cn('w-4 h-4 mb-1', opt.color)} />
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
    </button>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Shift Swap</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Request to swap shifts with a colleague</p>
        </div>
        {role === 'employee' && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Swap
          </button>
        )}
      </div>

      {showForm && role === 'employee' && (
        <div ref={formRef} className="card" style={STYLES.brandCard}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ArrowLeftRight className="w-4 h-4" style={{ color: 'var(--brand-text)' }} /> New Shift Swap Request
            </h2>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">📅 Date you want to swap</label>
              <input type="date" className="input" value={swapDate} onChange={e => setSwapDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
              {loadingSchedule && (
                <p className="flex items-center gap-2 text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                  Loading the real schedule for that day...
                </p>
              )}
            </div>

            <div>
              <label className="label">🕐 Your shift on that day</label>
              <div className="grid grid-cols-2 gap-3">
                {SHIFT_OPTIONS.map(opt => shiftBtn(opt.value, requesterShift, () => setRequesterShift(opt.value), opt))}
              </div>
              {swapDate && !loadingSchedule && !requesterShift && (
                <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> You're not scheduled to work that day — select the shift you'd be covering.
                </p>
              )}
            </div>

            <div>
              <label className="label">👤 Who do you want to swap with?</label>
              <select className="input" value={targetId} onChange={e => setTargetId(e.target.value)} required>
                <option value="">Select employee...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.shift} shift)</option>)}
              </select>
            </div>

            {targetId && (
              <div>
                <label className="label">🔄 Shift {selectedTarget?.name} will cover</label>
                <div className="grid grid-cols-2 gap-3">
                  {SHIFT_OPTIONS.map(opt => shiftBtn(opt.value, targetShift, () => setTargetShift(opt.value), opt))}
                </div>
                {swapDate && !loadingSchedule && !targetShift && (
                  <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {selectedTarget?.name} isn't scheduled to work that day — select the shift manually.
                  </p>
                )}
              </div>
            )}

            {checking && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
                Checking availability...
              </div>
            )}
            {conflict && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {conflict}
              </div>
            )}

            {targetId && swapDate && requesterShift && targetShift && !conflict && (
              <div className="p-4 rounded-xl text-sm space-y-1" style={STYLES.brandSummary}>
                <p className="font-medium" style={{ color: 'var(--brand-text)' }}>Swap Summary</p>
                <p style={{ color: 'var(--text-primary)' }}>📅 Date: <strong>{new Date(swapDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></p>
                <p style={{ color: 'var(--text-primary)' }}>You will cover: <strong className="text-amber-400">{requesterShift}</strong></p>
                <p style={{ color: 'var(--text-primary)' }}>{selectedTarget?.name} will cover: <strong className="text-indigo-400">{targetShift}</strong></p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={loading || !!conflict || !targetId || !swapDate || !requesterShift || !targetShift} className="btn-primary flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                Send Request
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div ref={listRef} className="space-y-4">
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {role === 'admin' ? 'All Swap Requests' : role === 'viewer' ? 'All Swap Requests' : 'My Swap Requests'}
        </h2>

        {swaps.length === 0 ? (
          <div className="card text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No shift swap requests</p>
          </div>
        ) : (
          swaps.map(swap => {
            const isTarget = swap.targetId === currentUserId
            const isRequester = swap.requesterId === currentUserId
            const canTargetAct = isTarget && !swap.targetAccepted && swap.status === 'pending'
            const canAdminAct = role === 'admin' && swap.targetAccepted && swap.status === 'pending'

            return (
              <div key={swap.id} className="swap-card card transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold', avatarColor(swap.requester?.name ?? ''))}>
                          {swap.requester?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{swap.requester?.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Requester</p>
                        </div>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <div className="flex items-center gap-2">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold', avatarColor(swap.target?.name ?? ''))}>
                          {swap.target?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{swap.target?.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Target</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Date</p>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(swap.swapDate)}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10">
                        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{swap.requester?.name} covers</p>
                        <p className="text-amber-400 font-medium text-xs">{swap.requesterShift}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-indigo-500/10">
                        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{swap.target?.name} covers</p>
                        <p className="text-indigo-400 font-medium text-xs">{swap.targetShift}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1 text-emerald-400"><Check className="w-3 h-3" /> {swap.requester?.name} requested</span>
                      <span style={{ color: 'var(--text-faint)' }}>→</span>
                      <span className={cn('flex items-center gap-1', swap.targetAccepted ? 'text-emerald-400' : 'text-amber-400')}>
                        {swap.targetAccepted ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {swap.target?.name} {swap.targetAccepted ? 'accepted' : 'pending'}
                      </span>
                      <span style={{ color: 'var(--text-faint)' }}>→</span>
                      <span className={cn('flex items-center gap-1', swap.adminApproved === 'approved' ? 'text-emerald-400' : swap.adminApproved === 'rejected' ? 'text-red-400' : 'text-amber-400')}>
                        {swap.adminApproved === 'approved' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        Admin {swap.adminApproved === 'pending' ? 'pending' : swap.adminApproved}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {getStatusBadge(swap)}
                    {canTargetAct && (
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => handleAction(swap.id, 'accept')} className="btn-success py-1.5 px-3 text-xs flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button onClick={() => handleAction(swap.id, 'reject')} className="btn-danger py-1.5 px-3 text-xs flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    )}
                    {canAdminAct && (
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => handleAction(swap.id, 'admin_approve')} className="btn-success py-1.5 px-3 text-xs flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => handleAction(swap.id, 'admin_reject')} className="btn-danger py-1.5 px-3 text-xs flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                    {isRequester && swap.status === 'pending' && !swap.targetAccepted && (
                      <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> Waiting for {swap.target?.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
