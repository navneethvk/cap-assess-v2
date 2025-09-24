import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingCreateVisitButtonProps {
  /** Target date to seed the new visit with */
  date?: Date | null
  /** Route path to navigate to. Defaults to the new meeting notes route */
  to?: string
  /** Query parameters to pass along */
  query?: Record<string, string | undefined>
  /** Editing mode for the meeting notes page */
  mode?: 'edit' | 'view'
  /** Optional override for click behaviour */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  /** Additional class names for positioning/size */
  className?: string
  /** Optional accessible label; defaults to "Create visit" */
  label?: string
  /** Optional icon component to render inside the button */
  icon?: React.ComponentType<{ className?: string }>
}

const FloatingCreateVisitButton: React.FC<FloatingCreateVisitButtonProps> = ({
  date,
  to = '/meeting-notes/new',
  query,
  mode = 'edit',
  onClick,
  className,
  label = 'Create visit',
  icon: Icon = Plus,
}) => {
  const navigate = useNavigate()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(event)
      return
    }

    const params = new URLSearchParams()
    if (mode) params.set('mode', mode)
    if (date) params.set('date', date.toISOString())
    if (query) {
      Object.entries(query)
        .filter(([, value]) => Boolean(value))
        .forEach(([key, value]) => params.set(key, value as string))
    }

    navigate(`${to}?${params.toString()}`)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        'fixed bottom-24 right-6 sm:right-8 z-40 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      <Icon className="h-6 w-6 sm:h-7 sm:w-7 m-auto" />
    </button>
  )
}

export default FloatingCreateVisitButton

