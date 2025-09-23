import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

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
  const [range, setRange] = React.useState<DateRangeValue>({ from: value?.from, to: value?.to })

  React.useEffect(() => {
    setRange({ from: value?.from, to: value?.to })
  }, [value?.from, value?.to])

  const label = React.useMemo(() => {
    if (range?.from && range?.to) return `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}`
    if (range?.from) return `${format(range.from, 'dd/MM/yyyy')} – …`
    return 'Select dates'
  }, [range])

  const label = React.useMemo(() => {
    const fmt = (d?: Date) => (d ? format(d, 'dd/MM/yyyy') : 'dd/mm/yyyy')
    return `${fmt(range?.from)} – ${fmt(range?.to)}`
  }, [range?.from, range?.to])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('h-7 px-2 text-xs font-normal gap-2', className)}>
          <CalendarIcon className="h-3 w-3" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={{ from: range?.from, to: range?.to } as any}
          onSelect={(v: any) => {
            const newVal = { from: v?.from, to: v?.to }
            setRange(newVal)
            onChange?.(newVal)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DateRangePicker


