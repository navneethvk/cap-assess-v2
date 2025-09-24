import * as React from 'react'
import { UnifiedDatePicker, SingleDatePicker, DateRangePicker, type DateRangeValue } from './UnifiedDatePicker'

export function DatePickerDemo() {
  const [singleDate, setSingleDate] = React.useState<Date | undefined>()
  const [dateRange, setDateRange] = React.useState<DateRangeValue | undefined>()

  return (
    <div className="m3-expressive p-8 space-y-8 bg-surface min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-on-surface">Unified Date Picker Demo</h1>
          <p className="text-on-surface-variant">Material 3 Expressive styling with shadcn/ui compatibility</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Single Date Picker */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-on-surface">Single Date Picker</h2>
              <p className="text-sm text-on-surface-variant">
                Select a single date with immediate selection
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Basic Single Date
                </label>
                <SingleDatePicker
                  value={singleDate}
                  onChange={(value) => {
                    if (value && typeof value === 'object' && 'from' in value) {
                      // Ignore DateRangeValue in single mode
                      return;
                    }
                    setSingleDate(value as Date | undefined);
                  }}
                  placeholder="Pick a date"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  With Clear Button
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
                  showClearButton={true}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Disabled State
                </label>
                <SingleDatePicker
                  value={singleDate}
                  onChange={(value) => {
                    if (value && typeof value === 'object' && 'from' in value) {
                      return;
                    }
                    setSingleDate(value as Date | undefined);
                  }}
                  placeholder="Disabled picker"
                  disabled={true}
                />
              </div>
            </div>
            
            <div className="p-4 bg-surface-container rounded-xl">
              <p className="text-sm text-on-surface-variant">
                <strong>Selected:</strong> {singleDate ? singleDate.toLocaleDateString() : 'None'}
              </p>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-on-surface">Date Range Picker</h2>
              <p className="text-sm text-on-surface-variant">
                Select a date range with apply/cancel actions
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Basic Date Range
                </label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select date range"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  With Clear Button
                </label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Pick date range"
                  showClearButton={true}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Disabled State
                </label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Disabled range picker"
                  disabled={true}
                />
              </div>
            </div>
            
            <div className="p-4 bg-surface-container rounded-xl">
              <p className="text-sm text-on-surface-variant">
                <strong>Selected Range:</strong>{' '}
                {dateRange?.from && dateRange?.to
                  ? `${dateRange.from.toLocaleDateString()} – ${dateRange.to.toLocaleDateString()}`
                  : dateRange?.from
                  ? `${dateRange.from.toLocaleDateString()} – ...`
                  : 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Unified Date Picker Examples */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-on-surface">Unified Date Picker</h2>
            <p className="text-sm text-on-surface-variant">
              The main component that can switch between single and range modes
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">
                Single Mode
              </label>
              <UnifiedDatePicker
                mode="single"
                value={singleDate}
                onChange={(value) => setSingleDate(value as Date)}
                placeholder="Single date"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">
                Range Mode
              </label>
              <UnifiedDatePicker
                mode="range"
                value={dateRange}
                onChange={(value) => setDateRange(value as DateRangeValue)}
                placeholder="Date range"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">
                Different Alignment
              </label>
              <UnifiedDatePicker
                mode="single"
                value={singleDate}
                onChange={(value) => setSingleDate(value as Date)}
                placeholder="Top aligned"
                side="top"
                align="end"
              />
            </div>
          </div>
        </div>

        {/* Features Showcase */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-on-surface">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-surface-container rounded-xl">
              <h3 className="font-semibold text-on-surface mb-2">✨ Material 3 Expressive</h3>
              <ul className="text-sm text-on-surface-variant space-y-1">
                <li>• Modern elevation and shadows</li>
                <li>• Smooth transitions and animations</li>
                <li>• Expressive color system</li>
                <li>• Rounded corners and glass effects</li>
              </ul>
            </div>
            
            <div className="p-4 bg-surface-container rounded-xl">
              <h3 className="font-semibold text-on-surface mb-2">🎯 Smart UX</h3>
              <ul className="text-sm text-on-surface-variant space-y-1">
                <li>• Single date: immediate selection</li>
                <li>• Date range: apply/cancel workflow</li>
                <li>• Clear button for easy reset</li>
                <li>• Keyboard and touch friendly</li>
              </ul>
            </div>
            
            <div className="p-4 bg-surface-container rounded-xl">
              <h3 className="font-semibold text-on-surface mb-2">🔧 Flexible API</h3>
              <ul className="text-sm text-on-surface-variant space-y-1">
                <li>• Unified component for both modes</li>
                <li>• Convenience components (Single/Range)</li>
                <li>• Customizable alignment and positioning</li>
                <li>• Full TypeScript support</li>
              </ul>
            </div>
            
            <div className="p-4 bg-surface-container rounded-xl">
              <h3 className="font-semibold text-on-surface mb-2">🎨 Theme Integration</h3>
              <ul className="text-sm text-on-surface-variant space-y-1">
                <li>• Respects shadcn/ui themes</li>
                <li>• Dark/light mode support</li>
                <li>• CSS custom properties</li>
                <li>• Consistent with existing components</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatePickerDemo
