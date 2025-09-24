import * as React from 'react'
import { SingleDatePicker, DateRangePicker, type DateRangeValue } from './UnifiedDatePicker'

/**
 * Example showing how to integrate the new UnifiedDatePicker components
 * into existing forms and components
 */
export function DatePickerExample() {
  const [visitDate, setVisitDate] = React.useState<Date | undefined>()
  const [reportPeriod, setReportPeriod] = React.useState<DateRangeValue | undefined>()

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Visit Scheduling</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Visit Date
            </label>
            <SingleDatePicker
              value={visitDate}
              onChange={(value) => {
                if (value && typeof value === 'object' && 'from' in value) {
                  return;
                }
                setVisitDate(value as Date | undefined);
              }}
              placeholder="Select visit date"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Report Period
            </label>
            <DateRangePicker
              value={reportPeriod}
              onChange={setReportPeriod}
              placeholder="Select period"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">Selected Values:</h3>
        <p className="text-sm text-muted-foreground">
          Visit Date: {visitDate ? visitDate.toLocaleDateString() : 'Not selected'}
        </p>
        <p className="text-sm text-muted-foreground">
          Report Period: {reportPeriod?.from && reportPeriod?.to
            ? `${reportPeriod.from.toLocaleDateString()} – ${reportPeriod.to.toLocaleDateString()}`
            : 'Not selected'}
        </p>
      </div>
    </div>
  )
}

export default DatePickerExample
