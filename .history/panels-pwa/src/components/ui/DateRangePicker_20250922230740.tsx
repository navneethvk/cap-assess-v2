import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Helper function to compare dates
const areDatesEqual = (date1?: Date, date2?: Date): boolean => {
  if (!date1 && !date2) return true;
  if (!date1 || !date2) return false;
  return date1.getTime() === date2.getTime();
}

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
  const [tempRange, setTempRange] = React.useState<DateRangeValue>({ from: value?.from, to: value?.to })
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setRange({ from: value?.from, to: value?.to })
    setTempRange({ from: value?.from, to: value?.to })
  }, [value?.from, value?.to])

  const label = React.useMemo(() => {
    const fmt = (d?: Date) => (d ? format(d, 'dd/MM/yyyy') : 'dd/mm/yyyy')
    if (range?.from && range?.to) return `${fmt(range.from)} – ${fmt(range.to)}`
    if (range?.from) return `${fmt(range.from)} – …`
    return 'Select dates'
  }, [range?.from, range?.to])

  const handleApply = () => {
    setRange(tempRange)
    onChange?.(tempRange)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempRange(range)
    setIsOpen(false)
  }

  const formatDateForInput = (date?: Date) => {
    if (!date) return ''
    return format(date, 'yyyy-MM-dd')
  }

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    const date = value ? new Date(value) : undefined
    setTempRange(prev => ({ ...prev, [field]: date }))
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('h-7 px-2 text-xs font-normal gap-2', className)}>
          <CalendarIcon className="h-3 w-3" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 z-50 bg-white border border-gray-200 shadow-lg" align="start">
        <div className="space-y-4 bg-white">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <input
              type="date"
              value={formatDateForInput(tempRange.from)}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <input
              type="date"
              value={formatDateForInput(tempRange.to)}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleApply} 
              size="sm" 
              className="flex-1"
            >
              Apply
            </Button>
            <Button 
              onClick={handleCancel} 
              variant="outline" 
              size="sm" 
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DateRangePicker


