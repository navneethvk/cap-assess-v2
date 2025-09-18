import React from 'react'
import { cn } from '@/lib/utils'

export interface SegmentOption {
  label: string
  value: string
}

interface SegmentedControlProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}) => {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border border-[hsl(var(--border))] bg-background p-1 gap-1 overflow-x-auto overflow-y-visible no-scrollbar py-1',
        className,
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              // base chip
              'inline-flex items-center justify-center px-3 rounded-full whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-xs sm:text-sm h-8 leading-none select-none overflow-visible',
              // neutral border, no transforms (prevents vertical misalignment on press/selected)
              'border border-[hsl(var(--border))] text-foreground bg-transparent',
              // selected state (supports M3 scope via CSS vars if present)
              selected && 'bg-[var(--m3-secondary-container,transparent)] text-[var(--m3-on-secondary-container,inherit)] border-[color:var(--m3-outline,_hsl(var(--border)))]',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
