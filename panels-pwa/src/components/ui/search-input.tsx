import React from 'react'
import { cn } from '@/lib/utils'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onChangeValue?: (v: string) => void
}

export const SearchInput: React.FC<SearchInputProps> = ({ className, onChangeValue, ...props }) => {
  return (
    <div className={cn('relative', className)}>
      <input
        type="search"
        className={cn(
          'w-full h-10 rounded-full border px-10 text-sm',
          'bg-[hsl(var(--card))] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
        )}
        onChange={(e) => onChangeValue?.(e.target.value)}
        {...props}
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
      </svg>
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
        onClick={(e) => {
          const input = (e.currentTarget.previousSibling as HTMLInputElement)
          if (input) {
            input.value = ''
            onChangeValue?.('')
            input.focus()
          }
        }}
        aria-label="Clear search"
      >
        Clear
      </button>
    </div>
  )
}
