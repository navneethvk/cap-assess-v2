import * as React from 'react'
import { addDays, format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface DateRangeValue {
  from?: Date
  to?: Date
}

interface Props {
  value?: DateRangeValue
  onChange?: (value: DateRangeValue) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = React.useState(false)
  const [range, setRange] = React.useState<DateRangeValue>({ from: value?.from, to: value?.to })

  React.useEffect(() => {
    setRange({ from: value?.from, to: value?.to })
  }, [value?.from, value?.to])

  const label = React.useMemo(() => {
    if (range?.from && range?.to) return `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}`
    if (range?.from) return `${format(range.from, 'dd/MM/yyyy')} – …`
    return 'Select dates'
  }, [range])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="outline"
          className={cn('h-7 px-2 text-xs justify-start w-[220px] font-normal', !range?.from && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 h-3 w-3" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={range?.from}
          selected={{ from: range?.from, to: range?.to } as any}
          onSelect={(v: any) => {
            const newVal: DateRangeValue = { from: v?.from, to: v?.to }
            setRange(newVal)
            onChange?.(newVal)
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DateRangePicker


