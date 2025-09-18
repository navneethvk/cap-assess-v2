import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { cn } from '@/lib/utils'

export interface SegItem {
  value: string
  label: React.ReactNode
}

interface SegmentedTabsProps {
  items: SegItem[]
  value: string
  onValueChange: (val: string) => void
  className?: string
}

// Mobile-friendly segmented tabs with liquid motion indicator and swipe support
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({ items, value, onValueChange, className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState<{ x: number; width: number }>({ x: 0, width: 0 })
  const [dims, setDims] = useState<{ fullTop: number; fullHeight: number; underlineTop: number; underlineHeight: number }>({ fullTop: 4, fullHeight: 28, underlineTop: 30, underlineHeight: 3 })
  const controls = useAnimationControls()

  // Measure the active tab button and set indicator position/size
  const measure = () => {
    const btn = btnRefs.current[value]
    const container = containerRef.current
    if (!btn || !container) return
    const cRect = container.getBoundingClientRect()
    const bRect = btn.getBoundingClientRect()
    setIndicator({ x: bRect.left - cRect.left, width: bRect.width })
    // compute heights for liquid animation
    const pad = 4 // matches container class top/bottom padding
    const fullTop = pad
    const fullHeight = Math.max(20, cRect.height - pad * 2)
    const underlineHeight = 3
    const underlineTop = cRect.height - underlineHeight - 2
    setDims({ fullTop, fullHeight, underlineTop, underlineHeight })
  }

  useLayoutEffect(() => {
    measure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  useEffect(() => {
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Liquid transition sequence on value change
  const prevValueRef = useRef<string>(value)
  useEffect(() => {
    if (!containerRef.current) return
    const run = async () => {
      // collapse to underline at current x
      await controls.start({ top: dims.underlineTop, height: dims.underlineHeight, transition: { duration: 0.14, ease: 'easeIn' } })
      // slide underline to new x/width
      await controls.start({ x: indicator.x, width: indicator.width, transition: { type: 'spring', stiffness: 600, damping: 32, mass: 0.9 } })
      // expand to full pill under new tab
      await controls.start({ top: dims.fullTop, height: dims.fullHeight, transition: { duration: 0.18, ease: 'easeOut' } })
    }
    if (prevValueRef.current !== value) {
      run()
      prevValueRef.current = value
    } else {
      // first render or no change: snap to position/size
      controls.set({ x: indicator.x, width: indicator.width, top: dims.fullTop, height: dims.fullHeight })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, indicator.x, indicator.width, dims.fullTop, dims.fullHeight, dims.underlineTop, dims.underlineHeight])

  // Simple swipe handling on the segmented control (left/right)
  const touchStartX = useRef<number | null>(null)
  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    const threshold = 40
    const idx = items.findIndex((it) => it.value === value)
    if (dx <= -threshold && idx < items.length - 1) {
      onValueChange(items[idx + 1].value)
    } else if (dx >= threshold && idx > 0) {
      onValueChange(items[idx - 1].value)
    }
    touchStartX.current = null
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn(
        'relative w-full max-w-md mx-auto rounded-full bg-white/90 backdrop-blur border border-[hsl(var(--border))] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_20px_rgba(0,0,0,0.06)]',
        'px-1 py-1 flex items-center gap-1 overflow-hidden',
        className,
      )}
    >
      {/* Liquid indicator */}
      <motion.div
        className="absolute rounded-full bg-[hsl(var(--primary))]"
        animate={controls}
        style={{ x: 0, width: indicator.width, top: dims.fullTop, height: dims.fullHeight }}
      />

      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            ref={(el) => {
              btnRefs.current[it.value] = el;
            }}
            onClick={() => onValueChange(it.value)}
            className={cn(
              'group relative z-10 flex-1 min-w-0 h-9 rounded-full px-3 text-sm font-medium transition-colors',
              'text-foreground/70',
              active && 'text-[hsl(var(--primary-foreground))]'
            )}
          >
            {/* State layer (press effect) */}
            <span
              className={cn(
                'pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-150',
                active ? 'bg-white/20' : 'bg-black/10',
                'group-active:opacity-100',
              )}
            />
            <span className="truncate relative z-10">{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}
