'use client'
import { useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { COLOR, STYLES } from '@/lib/design'

/* ─── Matrix rain canvas ─── */
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    const cols = Math.floor(w / 20)
    const drops: number[] = Array(cols).fill(1)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()アイウエオカキクケコ'

    const draw = () => {
      ctx.fillStyle = 'rgba(2,6,23,0.05)' // canvas fade — intentionally raw
      ctx.fillRect(0, 0, w, h)
      ctx.font = '14px monospace'
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillStyle = Math.random() > 0.95 ? '#ffffff' : COLOR.matrixBlue
        ctx.globalAlpha = Math.random() * 0.5 + 0.1
        ctx.fillText(char, i * 20, y * 20)
        ctx.globalAlpha = 1
        if (y * 20 > h && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      })
    }

    const id = setInterval(draw, 50)
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    return () => { clearInterval(id); window.removeEventListener('resize', onResize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.70 }} />
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [typedText, setTypedText] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  const FULL_TEXT = '> AUTHENTICATE TO CONTINUE_'

  // Powershell typing animation — types out, pauses, deletes, repeats
  useEffect(() => {
    let i = 0
    let deleting = false
    let timeout: ReturnType<typeof setTimeout>

    function tick() {
      if (!deleting) {
        i++
        setTypedText(FULL_TEXT.slice(0, i))
        if (i === FULL_TEXT.length) {
          timeout = setTimeout(() => { deleting = true; tick() }, 2200)
          return
        }
      } else {
        i--
        setTypedText(FULL_TEXT.slice(0, i))
        if (i === 0) {
          deleting = false
          timeout = setTimeout(tick, 500)
          return
        }
      }
      timeout = setTimeout(tick, deleting ? 30 : 55)
    }

    timeout = setTimeout(tick, 800)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    // Set initial state then animate in
    gsap.set(titleRef.current, { y: -30, opacity: 0 })
    gsap.set(cardRef.current, { y: 40, opacity: 0 })
    gsap.to(titleRef.current, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.1 })
    gsap.to(cardRef.current, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.3 })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setIsError(false)
    gsap.to(cardRef.current, { scale: 0.98, duration: 0.1 })
    const res = await signIn('credentials', { email, password, redirect: false })
    gsap.to(cardRef.current, { scale: 1, duration: 0.2, ease: 'back.out(2)' })
    if (res?.ok) {
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    } else {
      toast.error('Invalid email or password')
      setIsError(true)
      setTimeout(() => setIsError(false), 2000)
      gsap.fromTo(cardRef.current, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">

      <MatrixRain />

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={STYLES.scanlineOverlay} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={STYLES.orbLeft} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={STYLES.orbRight} />

      {/* Corner HUD */}
      <div className="absolute top-4 left-4 text-cyan-500/30 font-mono text-xs pointer-events-none z-10 select-none leading-5">
        <div>SYS://PORTAL.AUTH</div>
        <div>STATUS: ONLINE ▮</div>
        <div>ENCRYPTION: AES-256</div>
      </div>
      <div className="absolute top-4 right-4 text-cyan-500/30 font-mono text-xs pointer-events-none z-10 select-none text-right leading-5">
        <div>v2.4.1</div>
        <div suppressHydrationWarning>{new Date().toLocaleDateString('en-GB')}</div>
        <div className="animate-pulse">● SECURE</div>
      </div>
      <div className="absolute bottom-4 left-4 text-cyan-500/20 font-mono text-xs pointer-events-none z-10 select-none">
        {'> AWAITING_INPUT_'}<span className="animate-pulse">▮</span>
      </div>
      <div className="absolute bottom-4 right-4 text-cyan-500/20 font-mono text-xs pointer-events-none z-10 select-none">
        TEAM_PORTAL © 2025
      </div>

      {/* Main content */}
      <div className="w-full max-w-md px-4 relative z-20 flex flex-col items-center">

        {/* Title */}
        <div ref={titleRef} className="text-center mb-8">
          <img src="/paymentsave-logo.png" alt="Paymentsave" className="h-16 w-auto mx-auto mb-3" />
          <p className="text-base font-semibold text-white mb-1">Paymentsave Tech Support Team</p>
          <p className="text-sm font-mono" style={{ color: COLOR.cyan }}>
            {typedText}<span className="animate-pulse">▮</span>
          </p>
        </div>

        {/* Card */}
        <div ref={cardRef} className="w-full rounded-2xl p-8 border"
          style={{ ...(isError ? STYLES.loginCardError : STYLES.loginCard), transition: 'border-color 0.3s, box-shadow 0.3s' }}>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono mb-2" style={{ color: COLOR.cyan }}>
                {'> EMAIL_ADDRESS'}
              </label>
              <input
                type="email"
                className="w-full rounded-xl px-4 py-3 text-sm font-mono focus:outline-none transition-all duration-200"
                style={STYLES.loginInput}
                placeholder="user@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-mono mb-2" style={{ color: COLOR.cyan }}>
                {'> PASSWORD'}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full rounded-xl px-4 py-3 pr-16 text-sm font-mono focus:outline-none transition-all duration-200"
                  style={STYLES.loginInput}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono px-1 transition-colors"
                  style={{ color: COLOR.cyan }}
                >
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-mono font-semibold text-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95"
              style={STYLES.loginButton}
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> AUTHENTICATING...</>
                : <><LogIn className="w-4 h-4" /> SIGN_IN ▶</>
              }
            </button>
          </form>

          <div className="flex justify-end mt-4">
            <Link href="/forgot-password" className="text-xs font-mono transition-colors hover:opacity-100" style={{ color: COLOR.cyanDim }}>
              {'> FORGOT_PASSWORD?'}
            </Link>
          </div>
        </div>

        <p className="mt-6 glow-credit">
          Designed and Developed by Hamdan Kaiser
        </p>
      </div>
    </div>
  )
}
