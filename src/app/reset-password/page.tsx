'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { Eye, EyeOff, KeyRound, Check, X } from 'lucide-react'
import Link from 'next/link'

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {text}
    </li>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)

  const hasLength = password.length >= 11
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  const hasMatch = password === confirm && password.length > 0
  const isValid = hasLength && hasSpecial && hasMatch

  useEffect(() => {
    if (!userId) { router.replace('/login'); return }
    const tl = gsap.timeline()
    tl.fromTo(logoRef.current, { scale: 0, rotation: -180, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' })
      .fromTo(cardRef.current, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, '-=0.3')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    })
    const data = await res.json()
    if (res.ok) {
      gsap.to(cardRef.current, { scale: 1.02, duration: 0.15, yoyo: true, repeat: 1 })
      toast.success('Password reset! Please log in.')
      setTimeout(() => router.push('/login'), 1200)
    } else {
      toast.error(data.error || 'Failed to reset password')
      gsap.fromTo(cardRef.current, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md px-4 relative z-10">
        <div ref={logoRef} className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-600/30">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-slate-400 text-sm mt-1">Choose a strong password</p>
        </div>
        <div ref={cardRef} className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="Min. 11 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {password.length > 0 && (
              <ul className="space-y-1.5 p-3 bg-slate-800/50 rounded-xl">
                <Rule ok={hasLength} text="At least 11 characters" />
                <Rule ok={hasSpecial} text="At least one special character (!@#$%...)" />
                <Rule ok={hasMatch} text="Passwords match" />
              </ul>
            )}

            <button type="submit" disabled={loading || !isValid} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><KeyRound className="w-4 h-4" /> Reset Password</>
              }
            </button>
          </form>
          <Link href="/login" className="flex items-center justify-center gap-2 mt-5 text-sm text-slate-400 hover:text-white transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
