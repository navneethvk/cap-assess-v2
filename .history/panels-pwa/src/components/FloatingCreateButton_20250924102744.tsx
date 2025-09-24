import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingCreateButtonProps {
  /** Target date or datetime to pass through for contextual creation */
  date?: Date | null
  /** Base route to navigate to (defaults to meeting notes compose screen) */
  to?: string
  /** Additional query parameters to include */
  query?: Record<string, string | undefined>
  /** Preferred mode/state for the destination */
  mode?: string
  /** Optional override for click behaviour */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  /** Additional class names for custom placement */
  className?: string
  /** Accessible label for screen readers */
  label?: string
  /** Optional icon to render inside the FAB */
  icon?: React.ComponentType<{ className?: string }>
  /** Optional custom query string transformer */
  buildQuery?: (params: URLSearchParams) => URLSearchParams
  /** Optional size override */
  size?: 'sm' | 'md'
}

const FloatingCreateButton: React.FC<FloatingCreateButtonProps> = ({
  date,
  to = '/meeting-notes/new',
  query,
  mode = 'edit',
  onClick,
  className,
  label = 'Create',
  icon: Icon = Plus,
  buildQuery,
  size = 'md',
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
        .filter(([, value]): value is string => Boolean(value))
        .forEach(([key, value]) => params.set(key, value))
    }

    const finalParams = buildQuery ? buildQuery(params) : params

    navigate(`${to}?${finalParams.toString()}`)
  }

  const sizeClasses = size === 'sm'
    ? 'h-12 w-12'
    : 'h-14 w-14 sm:h-16 sm:w-16'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        'fixed bottom-24 right-6 sm:right-8 z-40 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        sizeClasses,
        className,
      )}
    >
      <Icon className="h-6 w-6 sm:h-7 sm:w-7 m-auto" />
    </button>
  )
}

export default FloatingCreateButton

