import { useState, useEffect, useRef } from 'react'

export function useCountUp(target, duration = 800) {
  const [displayed, setDisplayed] = useState(target)
  const rafRef = useRef(null)
  const startValRef = useRef(target)

  useEffect(() => {
    const startVal = startValRef.current
    const diff = target - startVal

    if (diff === 0) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const startTime = performance.now()

    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setDisplayed(startVal + diff * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayed(target)
        startValRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return displayed
}
