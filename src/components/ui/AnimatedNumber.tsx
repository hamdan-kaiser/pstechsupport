'use client'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
  value: number
  duration?: number
  decimals?: number
  suffix?: string
  className?: string
  style?: React.CSSProperties
}

/** Counts up to `value` whenever it changes, using GSAP to tween a proxy object. */
export function AnimatedNumber({ value, duration = 0.9, decimals = 0, suffix = '', className, style }: Props) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const proxy = useRef({ val: 0 })

  useEffect(() => {
    const tween = gsap.to(proxy.current, {
      val: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (spanRef.current) spanRef.current.textContent = proxy.current.val.toFixed(decimals) + suffix
      },
    })
    return () => { tween.kill() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span ref={spanRef} className={className} style={style}>{(0).toFixed(decimals)}{suffix}</span>
}
