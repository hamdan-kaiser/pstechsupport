'use client'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { COLOR } from '@/lib/design'

// Sky-color gradients for the transition sweep — warm sunrise/sunset hues bridging into the
// destination theme's own palette, rather than a plain instant color swap.
const SWEEP_TO_LIGHT = 'radial-gradient(circle at var(--sweep-x) var(--sweep-y), rgba(251,191,36,0.55), rgba(125,211,252,0.35) 45%, transparent 75%)'
const SWEEP_TO_DARK = 'radial-gradient(circle at var(--sweep-x) var(--sweep-y), rgba(249,115,22,0.5), rgba(30,27,75,0.55) 50%, transparent 78%)'

export function ThemeToggle() {
  const { theme, darkBgIndex, toggleTheme } = useAppStore()
  const btnRef = useRef<HTMLButtonElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Apply persisted theme (and, in dark mode, its randomly-chosen background) on mount — the
  // inline bootstrap script in layout.tsx already did this before hydration to avoid a flash,
  // this just keeps the DOM in sync with whatever Zustand ends up hydrating.
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
    if (theme === 'dark') document.documentElement.setAttribute('data-dark-bg', String(darkBgIndex))
  }, [])

  function handleToggle() {
    const goingToLight = theme === 'dark' // toggling FROM dark TO light
    const html = document.documentElement
    const rect = btnRef.current?.getBoundingClientRect()
    const overlay = overlayRef.current

    if (overlay && rect) {
      overlay.style.setProperty('--sweep-x', `${rect.left + rect.width / 2}px`)
      overlay.style.setProperty('--sweep-y', `${rect.top + rect.height / 2}px`)
      overlay.style.background = goingToLight ? SWEEP_TO_LIGHT : SWEEP_TO_DARK
    }

    // A slow, deliberate sweep for the moment of the flip — layered over the app's normal fast
    // hover transitions, which resume once this settles.
    html.classList.add('theme-transitioning')

    const tl = gsap.timeline({
      onComplete: () => html.classList.remove('theme-transitioning'),
    })
    tl.to(overlay, { opacity: 1, duration: 0.45, ease: 'power2.out' })
    // Spin + scale out
    .to(iconRef.current, { rotation: 180, scale: 0, duration: 0.25, ease: 'power2.in' }, 0)
    // Flip the theme mid-animation
    .call(() => toggleTheme())
    // Scale back in
    .to(iconRef.current, { rotation: 360, scale: 1, duration: 0.3, ease: 'back.out(2)' })
    .to(overlay, { opacity: 0, duration: 0.6, ease: 'power2.inOut' }, '-=0.1')

    // Ripple on the button
    gsap.fromTo(btnRef.current,
      { boxShadow: `0 0 0 0px ${COLOR.ripple}` },
      { boxShadow: `0 0 0 12px ${COLOR.rippleFade}`, duration: 0.5, ease: 'power2.out' }
    )
  }

  return (
    <>
      <div ref={overlayRef} className="theme-sweep-overlay" />
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <div ref={iconRef}>
          {theme === 'dark'
            ? <Sun className="w-5 h-5 text-amber-400" />
            : <Moon className="w-5 h-5 text-indigo-400" />
          }
        </div>
      </button>
    </>
  )
}
