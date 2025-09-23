import * as React from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ value, onChange, className, placeholder = "Pick a date" }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs font-semibold bg-white border-gray-300 hover:bg-gray-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value ? format(value, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1 bg-white border border-gray-200 shadow-lg" align="start">
        <div className="scale-75 origin-top-left">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange?.(date)
              setIsOpen(false)
            }}
            initialFocus
            className="bg-white"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
