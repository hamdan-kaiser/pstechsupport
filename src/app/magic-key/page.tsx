'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { COLOR, STYLES } from '@/lib/design'

const SPELLS = ['✨ Alohomora!', '⚡ Lumos!', '🔮 Revelio!', '🪄 Accio Key!']

function MagicKeyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [digits, setDigits] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [spell, setSpell] = useState(SPELLS[0])

  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const wandRef = useRef<HTMLDivElement>(null)
  const starsRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Floating stars background ──
  useEffect(() => {
    if (!starsRef.current) return
    const stars = Array.from({ length: 40 }, (_, i) => {
      const el = document.createElement('div')
      el.className = 'star'
      el.style.cssText = `
        position:absolute;
        width:${Math.random() * 4 + 2}px;
        height:${Math.random() * 4 + 2}px;
        background:${COLOR.magicStars[Math.floor(Math.random()*4)]};
        border-radius:50%;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        opacity:0;
      `
      starsRef.current!.appendChild(el)
      return el
    })

    stars.forEach((star, i) => {
      gsap.to(star, {
        opacity: Math.random() * 0.8 + 0.2,
        y: `${-(Math.random() * 80 + 20)}`,
        x: `${(Math.random() - 0.5) * 60}`,
        duration: Math.random() * 4 + 3,
        repeat: -1,
        yoyo: true,
        delay: Math.random() * 3,
        ease: 'sine.inOut',
      })
    })

    return () => stars.forEach(s => s.remove())
  }, [])

  // ── Wand idle float ──
  useEffect(() => {
    gsap.to(wandRef.current, {
      y: -10,
      rotation: 5,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
  }, [])

  // ── Entrance animation ──
  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 })
      .fromTo(wandRef.current,
        { y: -120, opacity: 0, rotation: -45 },
        { y: 0, opacity: 1, rotation: 0, duration: 1, ease: 'back.out(1.4)' }, '-=0.2')
      .fromTo(cardRef.current,
        { y: 60, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, '-=0.5')
      .fromTo('.digit-box',
        { scale: 0, rotation: 180, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(2)' }, '-=0.3')
  }, [])

  // ── Cycle spell text ──
  useEffect(() => {
    const id = setInterval(() => {
      setSpell(SPELLS[Math.floor(Math.random() * SPELLS.length)])
    }, 2500)
    return () => clearInterval(id)
  }, [])

  function handleDigit(val: string, idx: number) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[idx] = val
    setDigits(next)

    // Animate the box on input
    gsap.fromTo(inputRefs.current[idx],
      { scale: 1.3, borderColor: COLOR.magicAccent },
      { scale: 1, borderColor: '', duration: 0.3, ease: 'back.out(2)' }
    )

    if (val && idx < 3) inputRefs.current[idx + 1]?.focus()
    if (!val && idx > 0) inputRefs.current[idx - 1]?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const magicKey = digits.join('')
    if (magicKey.length < 4) return toast.error('Enter all 4 digits')
    setLoading(true)

    // Wand cast animation
    gsap.timeline()
      .to(wandRef.current, { rotation: -30, x: 20, duration: 0.2, ease: 'power2.in' })
      .to(wandRef.current, { rotation: 30, x: -20, duration: 0.15 })
      .to(wandRef.current, { rotation: 0, x: 0, duration: 0.3, ease: 'elastic.out(1, 0.4)' })

    // Sparkle burst on digit boxes
    gsap.to('.digit-box', {
      boxShadow: STYLES.magicDigitActive.boxShadow,
      borderColor: STYLES.magicDigitActive.borderColor,
      duration: 0.3,
      stagger: 0.05,
      yoyo: true,
      repeat: 1,
    })

    const res = await fetch('/api/auth/verify-magic-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, magicKey }),
    })
    const data = await res.json()

    if (res.ok) {
      // Success burst
      gsap.to(cardRef.current, {
        boxShadow: STYLES.magicSuccess.boxShadow,
        duration: 0.4,
        yoyo: true,
        repeat: 1,
        onComplete: () => router.push(`/reset-password?userId=${data.userId}`),
      })
      toast.success('✨ Magic key accepted!')
    } else {
      toast.error(data.error || 'Wrong magic key')
      gsap.fromTo(cardRef.current, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
      gsap.to('.digit-box', { borderColor: COLOR.magicError, duration: 0.2, yoyo: true, repeat: 1 })
      setDigits(['', '', '', ''])
      inputRefs.current[0]?.focus()
    }
    setLoading(false)
  }

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={STYLES.magicPage}>

      {/* Stars layer */}
      <div ref={starsRef} className="absolute inset-0 pointer-events-none" />

      {/* Magical orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-900/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md px-4 relative z-10 flex flex-col items-center">

        {/* Wand */}
        <div ref={wandRef} className="mb-6 text-center select-none">
          <div className="text-7xl mb-2">🪄</div>
          <p className="text-purple-300 text-sm font-medium tracking-widest animate-pulse">{spell}</p>
        </div>

        <div ref={cardRef} className="w-full rounded-2xl p-8 border border-purple-800/40"
          style={STYLES.magicCard}>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Enter Your Magic Key</h1>
            <p className="text-purple-300/70 text-sm">A 4-digit key known only to you</p>
            <p className="text-slate-500 text-xs mt-2 truncate">{email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-center gap-2 sm:gap-4">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigit(e.target.value, i)}
                  onKeyDown={e => handleKeyDown(e, i)}
                  className="digit-box w-14 h-14 sm:w-16 sm:h-16 text-center text-2xl font-bold text-white rounded-xl border-2 border-purple-700/50 focus:outline-none focus:border-purple-400 transition-colors"
                  style={{ background: COLOR.magicAccentBg }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || digits.some(d => !d)}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2"
              style={STYLES.magicButton}
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>🔮</span> Reveal the Magic</>
              }
            </button>
          </form>

          <Link href="/login" className="flex items-center justify-center gap-2 mt-6 text-sm text-purple-400/60 hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function MagicKeyPage() {
  return (
    <Suspense>
      <MagicKeyContent />
    </Suspense>
  )
}
