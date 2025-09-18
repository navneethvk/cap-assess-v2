import React from 'react'
import { cn } from '@/lib/utils'

interface StickyActionBarProps {
  children: React.ReactNode
  className?: string
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 px-3 py-2 sm:px-4 sm:py-3',
        'bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70',
        'border-t border-[hsl(var(--border))]',
        'safe-area-inset-bottom',
        className,
      )}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        {children}
      </div>
    </div>
  )}

