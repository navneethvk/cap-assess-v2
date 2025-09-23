# Button System Migration Guide

## Overview

The button system has been consolidated from two competing variant definitions into a single, unified system. This guide helps developers migrate from the old system to the new unified API.

## What Changed

### Before (Competing Systems)
- `button-variants.ts` - Complex system with custom styling, font-mono, uppercase, tracking-wider
- `button-variants.tsx` - Simple shadcn/ui system with basic variants
- Inconsistent imports and styling across the app

### After (Unified System)
- Single `button-variants.ts` file with comprehensive variant system
- Predefined configurations for common use cases
- Consistent API across all components
- Better TypeScript support

## Migration Steps

### 1. Update Imports

**Before:**
```tsx
import { Button } from '@/components/ui/button'
```

**After:**
```tsx
import { Button, buttonConfigs } from '@/components/ui/button'
```

### 2. Use Predefined Configurations

Instead of manually specifying variants and sizes, use predefined configurations:

**Before:**
```tsx
<Button variant="default" size="default">Click me</Button>
<Button variant="outline" size="sm">Small button</Button>
```

**After:**
```tsx
<Button {...buttonConfigs.standard}>Click me</Button>
<Button {...buttonConfigs.primarySmall}>Small button</Button>
```

### 3. Available Configurations

```tsx
// Standard UI buttons
buttonConfigs.standard     // variant="default", size="default"
buttonConfigs.primary      // variant="primary", size="primary-default", typography="mono"
buttonConfigs.primaryPopup // variant="tab", size="primary-sm", typography="mono"
buttonConfigs.icon         // size="icon"
buttonConfigs.primarySmall // variant="primary", size="primary-sm", typography="mono"
```

### 4. New Variants Available

The unified system includes both standard and custom variants:

**Standard Variants:**
- `default` - Primary button styling
- `destructive` - For dangerous actions
- `outline` - Secondary actions
- `secondary` - Alternative primary
- `ghost` - Minimal styling
- `link` - Text link styling

**Custom Variants:**
- `primary` - Tab-like primary buttons with custom styling
- `primary-outline` - Outlined primary buttons
- `primary-ghost` - Ghost primary buttons
- `tab` - Tab-like buttons (inactive state)
- `tab-active` - Tab-like buttons (active state)

**Sizes:**
- `default`, `sm`, `lg`, `icon` - Standard sizes
- `primary-sm`, `primary-default`, `primary-lg`, `primary-icon` - Primary button sizes

**Additional Options:**
- `typography` - `default`, `mono`, `bold`
- `shadow` - `none`, `sm`, `md`, `lg`, `custom`

## Common Migration Patterns

### 1. Standard Buttons
```tsx
// Before
<Button variant="default" size="default">Save</Button>

// After
<Button {...buttonConfigs.standard}>Save</Button>
// or
<Button>Save</Button> // defaults to standard
```

### 2. Primary Buttons (Tab-like)
```tsx
// Before
<Button variant="primary" size="sm" className="font-mono uppercase tracking-wider">
  Primary Action
</Button>

// After
<Button {...buttonConfigs.primarySmall}>Primary Action</Button>
```

### 3. Icon Buttons
```tsx
// Before
<Button size="icon" variant="outline">+</Button>

// After
<Button {...buttonConfigs.icon} variant="outline">+</Button>
```

### 4. Dropdown Triggers
```tsx
// Before
<Button variant="outline" size="sm" className="text-xs px-2">
  User Menu
</Button>

// After
<Button {...buttonConfigs.primaryPopup}>User Menu</Button>
```

## Best Practices

### 1. Use Predefined Configurations
Always prefer predefined configurations over manual variant/size combinations:

```tsx
// ✅ Good
<Button {...buttonConfigs.primary}>Primary Action</Button>

// ❌ Avoid
<Button variant="primary" size="primary-default" typography="mono">Primary Action</Button>
```

### 2. Consistent Styling
Use the same configuration for similar buttons across your component:

```tsx
// ✅ Good - consistent styling
<Button {...buttonConfigs.primarySmall}>Save</Button>
<Button {...buttonConfigs.primarySmall}>Cancel</Button>

// ❌ Avoid - inconsistent styling
<Button variant="primary" size="primary-sm">Save</Button>
<Button variant="outline" size="sm">Cancel</Button>
```

### 3. Semantic Usage
Choose variants based on their semantic meaning:

```tsx
// ✅ Good - semantic usage
<Button {...buttonConfigs.standard}>Save Changes</Button>        // Primary action
<Button variant="outline">Cancel</Button>                        // Secondary action
<Button variant="destructive">Delete</Button>                    // Dangerous action
<Button {...buttonConfigs.primaryPopup}>User Menu</Button>       // Tab-like trigger
```

### 4. Accessibility
Ensure buttons meet accessibility requirements:

```tsx
// ✅ Good - proper touch targets
<Button {...buttonConfigs.primarySmall}>Action</Button>  // At least 44px height

// ✅ Good - descriptive text
<Button {...buttonConfigs.icon} title="Add new item">+</Button>
```

## Testing Your Migration

### 1. Visual Testing
- Check that buttons look consistent across the app
- Verify hover and focus states work correctly
- Test on different screen sizes

### 2. Functional Testing
- Ensure all button interactions work as expected
- Test keyboard navigation
- Verify screen reader compatibility

### 3. Use the Playground
Import and use the `ButtonPlayground` component to test all variants:

```tsx
import ButtonPlayground from '@/components/ui/ButtonPlayground'

// Add to your development page
<ButtonPlayground />
```

## Troubleshooting

### Common Issues

1. **Button looks different after migration**
   - Check if you're using the correct predefined configuration
   - Verify no conflicting CSS classes

2. **TypeScript errors**
   - Ensure you're importing `buttonConfigs` from the button module
   - Check that variant/size combinations are valid

3. **Styling conflicts**
   - Remove any custom className overrides that conflict with the unified system
   - Use the `className` prop for additional styling only

### Getting Help

- Check the `ButtonPlayground` component for examples
- Review the `button-variants.ts` file for all available options
- Test your changes in the playground before deploying

## Future Enhancements

The unified button system is designed to be extensible. Future enhancements may include:

- Additional predefined configurations
- Theme-specific variants
- Animation presets
- Accessibility improvements

## Examples

See `ButtonPlayground.tsx` for comprehensive examples of all button variants and configurations.
