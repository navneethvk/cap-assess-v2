import * as React from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIsMobile } from '@/hooks/useIsMobile'

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ value, onChange, className, placeholder = "Pick a date" }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const isMobile = useIsMobile()

  const currentDate = value || new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const currentDay = currentDate.getDate()

  // Generate year options (current year ± 5 years)
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  
  // Generate month options
  const monthOptions = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ]

  // Generate day options for the selected month/year
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const handleDateChange = (year?: number, month?: number, day?: number) => {
    const newDate = new Date(
      year ?? currentYear,
      month ?? currentMonth,
      day ?? currentDay
    )
    onChange?.(newDate)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs font-semibold",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value ? format(value, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "p-3 bg-card border border-border shadow-lg backdrop-blur-none opacity-100",
          isMobile ? "w-[calc(100vw-2rem)] max-w-sm mx-4" : "w-64"
        )} 
        align={isMobile ? "center" : "start"}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Day */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Day</label>
              <Select
                value={currentDay.toString()}
                onValueChange={(value) => handleDateChange(undefined, undefined, parseInt(value))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  className="bg-card border border-border" 
                >
                  {dayOptions.map((day) => (
                    <SelectItem 
                      key={day} 
                      value={day.toString()} 
                      className="bg-card hover:bg-accent"
                    >
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Month</label>
              <Select
                value={currentMonth.toString()}
                onValueChange={(value) => handleDateChange(undefined, parseInt(value), undefined)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  className="bg-card border border-border" 
                >
                  {monthOptions.map((month) => (
                    <SelectItem 
                      key={month.value} 
                      value={month.value.toString()} 
                      className="bg-card hover:bg-accent"
                    >
                      {month.label.slice(0, 3)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Year</label>
              <Select
                value={currentYear.toString()}
                onValueChange={(value) => handleDateChange(parseInt(value), undefined, undefined)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  className="bg-card border border-border" 
                >
                  {yearOptions.map((year) => (
                    <SelectItem 
                      key={year} 
                      value={year.toString()} 
                      className="bg-card hover:bg-accent"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setIsOpen(false)}
            >
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
