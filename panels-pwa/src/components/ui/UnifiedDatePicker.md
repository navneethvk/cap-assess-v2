# UnifiedDatePicker Component

A modern, centralized date picker component with Material 3 expressive styling and shadcn/ui compatibility.

## Features

✨ **Material 3 Expressive Design**
- Modern elevation and shadows
- Smooth transitions and animations
- Expressive color system with proper contrast
- Rounded corners and glass effects

🎯 **Smart UX**
- Single date: immediate selection and close
- Date range: apply/cancel workflow
- Clear button for easy reset
- Keyboard and touch friendly

🔧 **Flexible API**
- Unified component for both single and range modes
- Convenience components for specific use cases
- Customizable alignment and positioning
- Full TypeScript support

🎨 **Theme Integration**
- Respects shadcn/ui themes
- Dark/light mode support
- CSS custom properties
- Consistent with existing components

## Usage

### Basic Single Date Picker

```tsx
import { SingleDatePicker } from '@/components/ui'

function MyComponent() {
  const [date, setDate] = useState<Date | undefined>()
  
  return (
    <SingleDatePicker
      value={date}
      onChange={setDate}
      placeholder="Select a date"
    />
  )
}
```

### Basic Date Range Picker

```tsx
import { DateRangePicker, type DateRangeValue } from '@/components/ui'

function MyComponent() {
  const [range, setRange] = useState<DateRangeValue | undefined>()
  
  return (
    <DateRangePicker
      value={range}
      onChange={setRange}
      placeholder="Select date range"
    />
  )
}
```

### Unified Component (Both Modes)

```tsx
import { UnifiedDatePicker } from '@/components/ui'

function MyComponent() {
  const [singleDate, setSingleDate] = useState<Date | undefined>()
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>()
  
  return (
    <div>
      {/* Single date mode */}
      <UnifiedDatePicker
        mode="single"
        value={singleDate}
        onChange={(value) => setSingleDate(value as Date)}
        placeholder="Pick a date"
      />
      
      {/* Range mode */}
      <UnifiedDatePicker
        mode="range"
        value={dateRange}
        onChange={(value) => setDateRange(value as DateRangeValue)}
        placeholder="Select range"
      />
    </div>
  )
}
```

## Props

### UnifiedDatePickerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `'single' \| 'range'` | `'single'` | Picker mode |
| `value` | `Date \| DateRangeValue \| undefined` | `undefined` | Current value |
| `onChange` | `(value: Date \| DateRangeValue \| undefined) => void` | - | Change handler |
| `placeholder` | `string` | `'Select date'` | Placeholder text |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disabled state |
| `showClearButton` | `boolean` | `true` | Show clear button |
| `align` | `'start' \| 'center' \| 'end'` | `'start'` | Popover alignment |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'` | Popover side |

### DateRangeValue

```tsx
interface DateRangeValue {
  from?: Date
  to?: Date
}
```

## Styling

The component uses Material 3 expressive design tokens that are scoped under the `.m3-expressive` class. The styling automatically adapts to your existing shadcn/ui theme.

### CSS Custom Properties

The component uses these Material 3 color tokens:

```css
.m3-expressive {
  --m3-surface: #FFFBFE;
  --m3-on-surface: #1C1B1F;
  --m3-surface-container: #F3EDF7;
  --m3-surface-container-high: #ECE6F0;
  --m3-surface-container-low: #F7F2FA;
  --m3-primary: #6750A4;
  --m3-on-primary: #FFFFFF;
  --m3-primary-container: #EADDFF;
  --m3-on-primary-container: #21005D;
  --m3-outline: #79747E;
  --m3-on-surface-variant: #49454F;
  --m3-error: #BA1A1A;
  --m3-error-container: #FFDAD6;
}
```

## Examples

### Form Integration

```tsx
function VisitForm() {
  const [visitDate, setVisitDate] = useState<Date | undefined>()
  const [reportPeriod, setReportPeriod] = useState<DateRangeValue | undefined>()
  
  return (
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Visit Date
        </label>
        <SingleDatePicker
          value={visitDate}
          onChange={setVisitDate}
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
    </form>
  )
}
```

### Custom Positioning

```tsx
<UnifiedDatePicker
  mode="single"
  value={date}
  onChange={setDate}
  side="top"
  align="end"
  placeholder="Top-aligned picker"
/>
```

### Disabled State

```tsx
<SingleDatePicker
  value={date}
  onChange={setDate}
  disabled={true}
  placeholder="Disabled picker"
/>
```

## Migration from Existing Components

If you're currently using the existing `DatePicker` or `DateRangePicker` components, you can migrate to the new unified system:

### Before (Old DatePicker)
```tsx
import { DatePicker } from '@/components/ui/DatePicker'

<DatePicker
  value={date}
  onChange={setDate}
  placeholder="Pick a date"
/>
```

### After (New UnifiedDatePicker)
```tsx
import { SingleDatePicker } from '@/components/ui'

<SingleDatePicker
  value={date}
  onChange={setDate}
  placeholder="Pick a date"
/>
```

### Before (Old DateRangePicker)
```tsx
import { DateRangePicker } from '@/components/ui/DateRangePicker'

<DateRangePicker
  value={range}
  onChange={setRange}
  className="custom-class"
/>
```

### After (New UnifiedDatePicker)
```tsx
import { DateRangePicker } from '@/components/ui'

<DateRangePicker
  value={range}
  onChange={setRange}
  className="custom-class"
/>
```

## Dependencies

- `react-day-picker` - Calendar component
- `date-fns` - Date formatting
- `lucide-react` - Icons
- `@radix-ui/react-popover` - Popover functionality

## Browser Support

- Modern browsers with CSS Grid support
- Touch devices with proper touch targets
- Keyboard navigation support
- Screen reader compatible
