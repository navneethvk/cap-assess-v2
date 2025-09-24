import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

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
  const [tempValue, setTempValue] = React.useState<Date | DateRangeValue | undefined>(value)

  // Update temp value when prop value changes
  React.useEffect(() => {
    setTempValue(value)
  }, [value])

  const handleSelect = (selectedValue: Date | DateRangeValue | undefined) => {
    setTempValue(selectedValue)
    
    // For single mode, close immediately after selection
    if (mode === 'single' && selectedValue && !(selectedValue as DateRangeValue).from) {
      onChange?.(selectedValue as Date)
      setIsOpen(false)
    }
  }

  const handleApply = () => {
    onChange?.(tempValue)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(undefined)
    setTempValue(undefined)
  }

  const getDisplayText = () => {
    if (!value) return placeholder || 'Select date'

    if (mode === 'single') {
      const date = value as Date
      return date ? format(date, 'MMM dd, yyyy') : placeholder || 'Select date'
    } else {
      const range = value as DateRangeValue
      if (range?.from && range?.to) {
        return `${format(range.from, 'MMM dd')} – ${format(range.to, 'MMM dd, yyyy')}`
      } else if (range?.from) {
        return `${format(range.from, 'MMM dd, yyyy')} – ...`
      }
      return placeholder || 'Select date range'
    }
  }

  const isRangeMode = mode === 'range'
  const hasValue = mode === 'single' 
    ? !!(value as Date)
    : !!(value as DateRangeValue)?.from

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            // Compact Material 3 expressive styling
            "h-7 px-2 text-xs font-medium transition-all duration-200",
            "border border-outline/20 hover:border-outline/40",
            "bg-surface-container-low hover:bg-surface-container",
            "text-on-surface shadow-sm hover:shadow-md",
            "rounded-lg backdrop-blur-sm",
            // Focus states
            "focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary",
            // Disabled states
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-container-low",
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
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-error-container/20 text-error rounded-full"
                onClick={handleClear}
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          // Material 3 expressive popover styling
          "w-auto p-0 m-2",
          "bg-surface-container-high border-2 border-outline/20",
          "rounded-2xl shadow-elevation-3",
          "backdrop-blur-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        align={align}
        side={side}
        sideOffset={8}
      >
        <div className="m3-expressive">
          <div className="m3-card">
            <div className="p-4">
              <Calendar
                mode={isRangeMode ? "range" : "single"}
                selected={tempValue}
                onSelect={handleSelect}
                numberOfMonths={isRangeMode ? 2 : 1}
                className="rounded-xl"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium text-on-surface",
                  nav: "space-x-1 flex items-center",
                  nav_button: cn(
                    "h-8 w-8 bg-transparent p-0 text-on-surface-variant",
                    "hover:bg-primary-container/20 hover:text-on-primary-container",
                    "rounded-lg transition-colors duration-200"
                  ),
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-on-surface-variant rounded-lg w-9 font-normal text-xs",
                  row: "flex w-full mt-2",
                  cell: cn(
                    "h-9 w-9 text-center text-sm p-0 relative",
                    "focus-within:relative focus-within:z-20"
                  ),
                  day: cn(
                    "h-9 w-9 p-0 font-normal rounded-lg transition-all duration-200",
                    "hover:bg-primary-container/20 hover:text-on-primary-container",
                    "focus:bg-primary-container/30 focus:text-on-primary-container"
                  ),
                  day_selected: cn(
                    "bg-primary text-on-primary shadow-elevation-1",
                    "hover:bg-primary/90 hover:text-on-primary"
                  ),
                  day_today: "bg-secondary-container text-on-secondary-container font-semibold",
                  day_outside: "text-on-surface-variant/50",
                  day_disabled: "text-on-surface-variant/30 cursor-not-allowed",
                  day_range_middle: "bg-primary-container/30 text-on-primary-container",
                  day_range_start: "bg-primary text-on-primary rounded-l-lg",
                  day_range_end: "bg-primary text-on-primary rounded-r-lg",
                  day_hidden: "invisible",
                }}
              />
            </div>
            
            {isRangeMode && (
              <div className="m3-sticky-bar px-4 py-3 border-t border-outline/20">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className={cn(
                      "flex-1 h-9 rounded-xl",
                      "border-2 border-outline/20 hover:border-outline/40",
                      "bg-surface-container hover:bg-surface-container-high",
                      "text-on-surface font-medium"
                    )}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    className={cn(
                      "flex-1 h-9 rounded-xl",
                      "bg-primary hover:bg-primary/90",
                      "text-on-primary font-medium",
                      "shadow-elevation-1 hover:shadow-elevation-2"
                    )}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
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
