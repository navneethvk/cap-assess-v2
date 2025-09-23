# Primary Button System Guide

## Overview

The Primary Button system provides a consistent, modular way to create buttons with the distinctive "tab-like" styling used throughout the application. These buttons feature oval/pill shapes with physics-based interactions.

## Components

### `PrimaryButton`
The main component for creating primary-styled buttons.

### `PrimaryPopupButton`
A convenience component specifically for dropdown/popup triggers.

## Usage Examples

### 1. Basic Primary Button
```tsx
import { PrimaryButton } from '@/components/ui/primary-button';

<PrimaryButton onClick={handleClick}>
  Click Me
</PrimaryButton>
```

### 2. Primary Popup Button (for dropdowns)
```tsx
import { PrimaryPopupButton } from '@/components/ui/primary-button';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <PrimaryPopupButton 
      className="text-xs sm:text-sm px-2 sm:px-3"
      asChild={true}
    >
      User Menu
    </PrimaryPopupButton>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {/* Menu items */}
  </DropdownMenuContent>
</DropdownMenu>
```

### 3. Custom Styling
```tsx
<PrimaryButton 
  variant="popup" 
  className="text-sm px-4 py-2"
  onClick={handleClick}
>
  Custom Button
</PrimaryButton>
```

### 4. Using with asChild prop
```tsx
<PrimaryPopupButton asChild>
  <Link to="/somewhere">
    Navigation Link
  </Link>
</PrimaryPopupButton>
```

## Props

### PrimaryButtonProps
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Button content |
| `variant` | `'default' \| 'popup'` | `'default'` | Button variant |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | Button size |
| `className` | `string` | - | Additional CSS classes |
| `onClick` | `() => void` | - | Click handler |
| `disabled` | `boolean` | `false` | Disabled state |
| `asChild` | `boolean` | `false` | Render as child component |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type |

## Styling Features

- **Oval/Pill Shape**: Consistent `border-radius: 9999px` styling
- **Button Physics**: Hover and press animations with transforms and shadows
- **Responsive**: Works with responsive text sizing (`text-xs sm:text-sm`)
- **Themeable**: Inherits from CSS custom properties

## Current Implementation

The system is currently used in:
- **Home Component**: User dropdown menu and example primary button
- **BottomNavBar Component**: User menu trigger
- **Future Components**: Can be easily adopted anywhere tab-like buttons are needed

## Migration from TabsTrigger

When you need tab-like button styling but can't use `TabsTrigger` (due to context requirements), use `PrimaryButton` instead:

```tsx
// Instead of this (which requires Tabs context):
<TabsTrigger value="user" className="text-xs sm:text-sm px-2 sm:px-3">
  User
</TabsTrigger>

// Use this:
<PrimaryButton className="text-xs sm:text-sm px-2 sm:px-3">
  User
</PrimaryButton>
```

## Best Practices

1. **Use PrimaryPopupButton for dropdowns** - It's semantically clearer
2. **Keep responsive classes consistent** - Use `text-xs sm:text-sm px-2 sm:px-3` pattern
3. **Use asChild when composing** - Especially with Radix UI components
4. **Test on mobile** - Ensure buttons are at least 44px tall for touch targets

## CSS Classes Used

The components use the `.tabstrigger` CSS class which provides:
- Oval shape with `border-radius: 9999px`
- Button physics with transforms and shadows
- Proper hover and active states
- Consistent spacing and typography