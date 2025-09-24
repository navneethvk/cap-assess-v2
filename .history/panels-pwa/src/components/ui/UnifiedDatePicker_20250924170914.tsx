import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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
            "w-auto p-0 border border-border",
            "bg-card text-foreground shadow-xl rounded-md",
            "animate-in fade-in-0 zoom-in-90 duration-150"
          )}
          align={align}
          side={side}
          sideOffset={4}
        >
        <div className="space-y-3 bg-card">
          <DayPicker
            mode={mode}
            selected={selectedValue as any}
            onSelect={handleSelect}
            navLayout="after"
            numberOfMonths={mode === 'range' ? 2 : 1}
            pagedNavigation={mode === 'range'}
            fixedWeeks
            className="p-3"
            styles={{
              root: { margin: 0 },
              caption: { marginBottom: 8 },
            }}
          />
          <div className="flex justify-end gap-2 border-t border-border bg-card px-3 py-2">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!canApply}
            >
              Apply
            </Button>
          </div>
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
