import { useEffect, useState } from 'react'

const DEFAULT_BREAKPOINT = 640

const getMatches = (breakpoint: number) => {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${breakpoint}px)`).matches
}

export function useIsMobile(breakpoint: number = DEFAULT_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState<boolean>(() => getMatches(breakpoint))

  useEffect(() => {
    if (typeof window === 'undefined') return

    const query = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile('matches' in event ? event.matches : event.matches)
    }

    handler(query)

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handler)
      return () => query.removeEventListener('change', handler)
    }

    // Fallback for Safari
    query.addListener(handler)
    return () => query.removeListener(handler)
  }, [breakpoint])

  return isMobile
}

export default useIsMobile

