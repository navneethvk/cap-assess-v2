import * as React from 'react'
import { SingleDatePicker, DateRangePicker, type DateRangeValue } from './UnifiedDatePicker'

/**
 * Simple integration test component to verify the new date pickers work
 * in the context of the existing app
 */
export function DatePickerIntegrationTest() {
  const [singleDate, setSingleDate] = React.useState<Date | undefined>()
  const [dateRange, setDateRange] = React.useState<DateRangeValue | undefined>()

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Date Picker Integration Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Single Date Picker (like in DayView/MonthCalendar)
          </label>
          <SingleDatePicker
            value={singleDate}
            onChange={(value) => {
              if (value && typeof value === 'object' && 'from' in value) {
                return;
              }
              setSingleDate(value as Date | undefined);
            }}
            placeholder="Select date"
            className="min-w-[100px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Selected: {singleDate ? singleDate.toLocaleDateString() : 'None'}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Date Range Picker (for future use)
          </label>
          <DateRangePicker
            value={dateRange}
            onChange={(value) => {
              if (value && typeof value === 'object' && 'from' in value) {
                setDateRange(value as DateRangeValue | undefined);
              } else if (value instanceof Date) {
                return;
              }
            }}
            placeholder="Select date range"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Selected: {dateRange?.from && dateRange?.to
              ? `${dateRange.from.toLocaleDateString()} – ${dateRange.to.toLocaleDateString()}`
              : 'None'}
          </p>
        </div>
      </div>
      
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">Integration Status</h3>
        <ul className="text-sm space-y-1">
          <li>✅ DayView component updated</li>
          <li>✅ MonthCalendar component updated</li>
          <li>✅ CreateVisitForm component updated</li>
          <li>✅ MeetingNotes component updated</li>
          <li>✅ Material 3 expressive styling applied</li>
          <li>✅ shadcn/ui theme compatibility maintained</li>
        </ul>
      </div>
    </div>
  )
}

export default DatePickerIntegrationTest
