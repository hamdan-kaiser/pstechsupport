'use client'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { COLOR } from '@/lib/design'

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore()
  const btnRef = useRef<HTMLButtonElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)

  // Apply persisted theme on mount
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
  }, [])

  function handleToggle() {
    const tl = gsap.timeline()
    // Spin + scale out
    tl.to(iconRef.current, {
      rotation: 180,
      scale: 0,
      duration: 0.25,
      ease: 'power2.in',
    })
    // Flip the theme mid-animation
    .call(() => toggleTheme())
    // Scale back in
    .to(iconRef.current, {
      rotation: 360,
      scale: 1,
      duration: 0.3,
      ease: 'back.out(2)',
    })
    // Ripple on the button
    gsap.fromTo(btnRef.current,
      { boxShadow: `0 0 0 0px ${COLOR.ripple}` },
      { boxShadow: `0 0 0 12px ${COLOR.rippleFade}`, duration: 0.5, ease: 'power2.out' }
    )
  }

  return (
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
  )
}
