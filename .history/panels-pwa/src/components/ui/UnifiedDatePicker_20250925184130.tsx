import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useIsMobile } from '@/hooks/useIsMobile'

import 'react-day-picker/dist/style.css'

export interface DateRangeValue {
  from?: Date
  to?: Date
}

export type DatePickerMode = 'single' | 'range'

interface UnifiedDatePickerProps {
  mode?: DatePickerMode
  value?: Date | DateRangeValue
  onChange?: (value: Date | DateRangeValue | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showClearButton?: boolean
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function UnifiedDatePicker({
  mode = 'single',
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  showClearButton = true,
  align = 'start',
  side = 'bottom',
}: UnifiedDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [draftValue, setDraftValue] = React.useState<Date | DateRangeValue | undefined>(value)
  const isMobile = useIsMobile()

  React.useEffect(() => {
    if (isOpen) {
      setDraftValue(value)
    }
  }, [isOpen, value])

  const handleSelect = (selectedValue: Date | DateRangeValue | undefined) => {
    if (mode === 'range') {
      setDraftValue(selectedValue as DateRangeValue | undefined)
    } else {
      setDraftValue(selectedValue as Date | undefined)
    }
  }

  const handleClear = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    const clearedValue: Date | DateRangeValue | undefined =
      mode === 'range'
        ? { from: undefined, to: undefined }
        : new Date()
    setDraftValue(clearedValue)
    onChange?.(clearedValue)
    setIsOpen(false)
  }

  const handleApply = () => {
    onChange?.(draftValue)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setDraftValue(value)
    setIsOpen(false)
  }

  const getDisplayText = () => {
    if (!value) return placeholder || 'Select date'

    if (mode === 'single') {
      const date = value as Date
      return date ? format(date, 'MMM dd') : placeholder || 'Select date'
    } else {
      const range = value as DateRangeValue
      if (range?.from && range?.to) {
        return `${format(range.from, 'MMM dd')} – ${format(range.to, 'MMM dd')}`
      } else if (range?.from) {
        return `${format(range.from, 'MMM dd')} – ...`
      }
      return placeholder || 'Select range'
    }
  }

  const hasValue = mode === 'single' 
    ? Boolean(value as Date | undefined)
    : Boolean((value as DateRangeValue | undefined)?.from)

  const selectedValue = mode === 'range'
    ? (draftValue as DateRangeValue | undefined)
    : (draftValue as Date | undefined)

  const canApply = mode === 'range'
    ? Boolean((selectedValue as DateRangeValue | undefined)?.from && (selectedValue as DateRangeValue | undefined)?.to)
    : Boolean(selectedValue as Date | undefined)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            // Compact Material 3 expressive styling
            "h-7 px-2 text-xs font-medium transition-all duration-200",
            "border border-outline/20 hover:border-outline/40",
            "bg-surface-container-low hover:bg-surface-container",
            "text-on-surface shadow-sm hover:shadow-md",
            "rounded-lg backdrop-blur-sm",
            // Value states
            !hasValue && "text-on-surface-variant",
            hasValue && "text-on-surface",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-1.5 w-full">
            <CalendarIcon className="h-3 w-3 text-primary flex-shrink-0" />
            <span className="flex-1 text-left truncate text-xs">
              {getDisplayText()}
            </span>
            {showClearButton && hasValue && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  handleClear(e)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClear(e)
                  }
                }}
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded-full",
                  "text-error hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
                )}
              >
                <X className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
        <PopoverContent 
          className={cn(
            "w-auto p-3 border border-border",
            "bg-background text-foreground rounded-md",
            "animate-in fade-in-0 zoom-in-90 duration-150",
            // Mobile responsive sizing
            isMobile ? "max-w-[calc(100vw-2rem)] mx-4" : "max-w-sm"
          )}
          align={isMobile ? "center" : align}
          side={isMobile ? "bottom" : side}
          sideOffset={isMobile ? 8 : 4}
          style={{ 
            backgroundColor: 'hsl(var(--background))',
            boxShadow: 'none'
          }}
        >
          <DayPicker
            mode={mode}
            selected={selectedValue as any}
            onSelect={handleSelect}
            navLayout="after"
            numberOfMonths={isMobile ? 1 : (mode === 'range' ? 2 : 1)}
            pagedNavigation={mode === 'range'}
            fixedWeeks
            required={false}
            className={cn(
              "[&_.rdp]:!m-0 [&_.rdp-months]:!mb-0 [&_.rdp-month]:!mb-0 [&_.rdp-table]:!mb-0",
              // Mobile-specific styling
              isMobile && "[&_.rdp-caption]:text-sm [&_.rdp-head_cell]:text-xs [&_.rdp-cell]:text-sm [&_.rdp-button]:h-8 [&_.rdp-button]:w-8"
            )}
            styles={{
              root: { margin: 0, padding: 0 },
              months: { marginBottom: 0, paddingBottom: 0 },
              month: { marginBottom: 0, paddingBottom: 0 },
              table: { marginBottom: 0 },
              caption: { marginBottom: 8 },
              // Mobile-specific styles
              ...(isMobile && {
                caption: { fontSize: '0.875rem', marginBottom: 6 },
                head_cell: { fontSize: '0.75rem', padding: '0.25rem' },
                cell: { fontSize: '0.875rem' },
                button: { height: '2rem', width: '2rem' }
              })
            }}
          />
          <div className={cn(
            "flex justify-end gap-2 pt-3",
            isMobile && "gap-3"
          )}>
            <Button 
              size={isMobile ? "default" : "sm"} 
              variant="ghost" 
              onClick={handleCancel}
              className={isMobile ? "h-9 px-4" : ""}
            >
              Cancel
            </Button>
            <Button
              size={isMobile ? "default" : "sm"}
              onClick={handleApply}
              disabled={!canApply}
              className={isMobile ? "h-9 px-4" : ""}
            >
              Apply
            </Button>
          </div>
      </PopoverContent>
    </Popover>
  )
}

// Convenience components for specific use cases
export function SingleDatePicker(props: Omit<UnifiedDatePickerProps, 'mode'>) {
  return <UnifiedDatePicker {...props} mode="single" />
}

export function DateRangePicker(props: Omit<UnifiedDatePickerProps, 'mode'>) {
  return <UnifiedDatePicker {...props} mode="range" />
}

export default UnifiedDatePicker
