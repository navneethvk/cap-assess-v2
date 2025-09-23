import React from 'react'
import { cn } from '@/lib/utils'

export interface ChipOption {
  label: string
  value: string
}

interface FilterChipsProps {
  options: ChipOption[]
  values: string[]
  onChange: (vals: string[]) => void
  className?: string
}

export const FilterChips: React.FC<FilterChipsProps> = ({ options, values, onChange, className }) => {
  const toggle = (val: string) => {
    if (val.toLowerCase() === 'all') { onChange([]); return }
    if (values.includes(val)) onChange(values.filter(v => v !== val))
    else onChange([...values, val])
  }

  return (
    <div className={cn('flex items-center gap-2 whitespace-nowrap', className)}>
      {options.map(opt => {
        const active = opt.value.toLowerCase() === 'all' ? values.length === 0 : values.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-checked={active}
            role="checkbox"
            className={cn(
              'h-8 px-3 rounded-full border text-xs sm:text-sm transition-colors',
              active
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-card text-foreground border-border hover:bg-accent/50'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

