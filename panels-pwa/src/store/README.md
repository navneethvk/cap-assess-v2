# State Management Guidelines

## Overview

This document outlines the state management patterns used in this application to ensure consistency and prevent duplication.

## State Management Strategy

### Primary Pattern: Zustand Stores

**Use Zustand for all global state management.**

Zustand is our primary state management solution because it provides:
- Simple, lightweight API
- No provider setup required
- Excellent TypeScript support
- Minimal boilerplate
- Good performance characteristics

### When to Use Each Pattern

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Zustand Store** | Global state shared across components | Selected date, user authentication, UI state |
| **React State** | Component-local state | Form inputs, modal visibility, temporary UI state |
| **React Context** | ❌ **Avoid** - Use Zustand instead | N/A |

## Store Structure

### File Naming Convention
- Store files: `storeName.ts` (e.g., `selectedDate.ts`, `authStore.ts`)
- Export pattern: `useStoreName` (e.g., `useSelectedDateStore`, `useAuthStore`)

### Store Template
```typescript
import { create } from 'zustand';

interface StoreNameState {
  // State properties
  property: Type;
  
  // Actions
  setProperty: (value: Type) => void;
  resetProperty: () => void;
}

export const useStoreName = create<StoreNameState>((set) => ({
  // Initial state
  property: defaultValue,
  
  // Actions
  setProperty: (value) => set({ property: value }),
  resetProperty: () => set({ property: defaultValue }),
}));
```

## Current Stores

### 1. Selected Date Store (`selectedDate.ts`)
**Purpose**: Manages the currently selected date across the application.

```typescript
interface SelectedDateState {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}
```

**Used by**:
- `useVisitsTimeline` - Filters visits by selected date
- `GlobalTitleBar` - Displays and allows date selection
- `AddVisit` - Uses selected date for new visits
- `DateCarousel` - Updates selected date on navigation

### 2. Auth Store (`authStore.ts`)
**Purpose**: Manages user authentication state.

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  // ... other auth-related state
}
```

### 3. Title Bar Slots Store (`titleBarSlots.ts`)
**Purpose**: Manages global title bar content slots.

```typescript
interface TitleBarSlotsState {
  customLeft: React.ReactNode;
  customCenter: React.ReactNode;
  customRight: React.ReactNode;
  // ... slot management
}
```

### 4. Reorder Store (`reorderStore.ts`)
**Purpose**: Manages drag-and-drop reordering state for timeline visits.

```typescript
interface ReorderState {
  localOrderIdsByDate: Record<string, string[]>;
  // ... reordering logic
}
```

## Anti-Patterns to Avoid

### ❌ Don't: Duplicate State Management
```typescript
// BAD: Multiple implementations for the same state
// selectedDate.tsx (React Context) - REMOVED
// selectedDate.ts (Zustand) - CORRECT
```

### ❌ Don't: Use React Context for Global State
```typescript
// BAD: React Context for global state
const MyContext = createContext<MyState | undefined>(undefined);
export const MyProvider = ({ children }) => { /* ... */ };

// GOOD: Zustand store
export const useMyStore = create<MyState>((set) => ({ /* ... */ }));
```

### ❌ Don't: Mix State Management Patterns
```typescript
// BAD: Using both Zustand and Context for the same data
const useMyData = () => {
  const contextData = useContext(MyContext);
  const storeData = useMyStore();
  // Confusing and error-prone
};
```

## Migration Guidelines

### From React Context to Zustand

If you find existing React Context implementations:

1. **Identify the state and actions**
2. **Create a Zustand store** with the same interface
3. **Update all consumers** to use the new store
4. **Remove the context** and provider
5. **Test thoroughly** to ensure no breaking changes

### Example Migration

**Before (React Context)**:
```typescript
// selectedDate.tsx - REMOVED
const SelectedDateContext = createContext<SelectedDateCtx | undefined>(undefined);
export const SelectedDateProvider = ({ value, children }) => (
  <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>
);
export const useSelectedDate = () => {
  const ctx = useContext(SelectedDateContext);
  if (!ctx) throw new Error('useSelectedDate must be used within SelectedDateProvider');
  return ctx;
};
```

**After (Zustand)**:
```typescript
// selectedDate.ts - CURRENT
import { create } from 'zustand';

interface SelectedDateState {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

export const useSelectedDateStore = create<SelectedDateState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
```

## Best Practices

### 1. Single Source of Truth
- Each piece of global state should have exactly one store
- Avoid duplicating state across multiple stores
- Use derived state when possible

### 2. Type Safety
- Always define TypeScript interfaces for store state
- Use proper typing for actions and selectors
- Leverage Zustand's excellent TypeScript support

### 3. Performance
- Use selectors to prevent unnecessary re-renders
- Keep stores focused and minimal
- Avoid storing derived data that can be computed

### 4. Testing
- Test stores in isolation
- Mock stores in component tests
- Use Zustand's testing utilities

### 5. Documentation
- Document the purpose of each store
- List which components use each store
- Keep this README updated when adding new stores

## Adding New Stores

### Step 1: Create the Store File
```typescript
// src/store/newStore.ts
import { create } from 'zustand';

interface NewStoreState {
  // Define your state and actions
}

export const useNewStore = create<NewStoreState>((set) => ({
  // Implement your store
}));
```

### Step 2: Update Documentation
- Add the new store to the "Current Stores" section above
- Document its purpose and usage
- List which components use it

### Step 3: Follow Naming Conventions
- File name: `storeName.ts`
- Hook name: `useStoreName`
- Interface name: `StoreNameState`

## Troubleshooting

### Common Issues

1. **Store not updating components**
   - Check if you're using the correct hook name
   - Verify the store is properly exported
   - Ensure components are importing from the right file

2. **Type errors in stores**
   - Verify interface definitions match the store implementation
   - Check that all actions are properly typed
   - Ensure state properties have correct types

3. **Performance issues**
   - Use selectors to prevent unnecessary re-renders
   - Avoid storing large objects in stores
   - Consider splitting large stores into smaller ones

### Debugging Tips

1. **Use Zustand DevTools** (in development)
2. **Add console logs** to store actions
3. **Check React DevTools** for re-render patterns
4. **Verify imports** are correct

## Future Considerations

### Potential Enhancements
1. **Persistence**: Add persistence for certain stores using Zustand middleware
2. **DevTools**: Integrate Redux DevTools for better debugging
3. **Testing**: Add comprehensive store testing utilities
4. **Performance**: Implement store selectors for better performance

### Migration Path
- Continue using Zustand as the primary state management solution
- Gradually migrate any remaining React Context usage
- Consider Zustand middleware for advanced features (persistence, devtools)

## Conclusion

By following these guidelines, we ensure:
- ✅ Consistent state management across the application
- ✅ No duplicate state implementations
- ✅ Better performance and developer experience
- ✅ Easier testing and debugging
- ✅ Clear patterns for future development

Remember: **Zustand for global state, React state for local state, avoid React Context for global state.**





