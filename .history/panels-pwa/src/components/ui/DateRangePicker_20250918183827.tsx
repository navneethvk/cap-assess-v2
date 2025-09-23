import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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

  const toInput = (d?: Date) => (d ? format(d, 'yyyy-MM-dd') : '')
  const fromValue = toInput(range?.from)
  const toValue = toInput(range?.to)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <input
          type="date"
          className="h-7 px-8 pl-8 rounded-md border text-xs"
          value={fromValue}
          onChange={(e) => {
            const d = e.target.value ? new Date(e.target.value) : undefined
            const newVal = { from: d, to: range?.to }
            setRange(newVal)
            onChange?.(newVal)
          }}
        />
        <CalendarIcon className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
      <span className="text-xs text-muted-foreground">to</span>
      <div className="relative">
        <input
          type="date"
          className="h-7 px-8 pl-8 rounded-md border text-xs"
          value={toValue}
          onChange={(e) => {
            const d = e.target.value ? new Date(e.target.value) : undefined
            const newVal = { from: range?.from, to: d }
            setRange(newVal)
            onChange?.(newVal)
          }}
        />
        <CalendarIcon className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}

export default DateRangePicker


