# Migration Guide: SWR to Shared Cache System

This guide explains how to migrate from the SWR-based visit queries to the new shared listener cache system.

## Overview

The new system provides:
- **Real-time updates** via Firestore listeners
- **Shared cache** across all components
- **Range-aware TTL** (recent vs historical data)
- **Persistent cache** that survives page refreshes
- **Intelligent cleanup** and memory management

## Migration Steps

### 1. Replace Hook Imports

**Before:**
```typescript
import { useVisitQueries, useVisitsInRange, useAllVisits } from '@/hooks/useVisitQueries';
```

**After:**
```typescript
import { 
  useSharedVisitQueries, 
  useVisitsInRange, 
  useAllVisits 
} from '@/hooks/useSharedVisitQueries';
```

### 2. Update Hook Usage

**Before (SWR-based):**
```typescript
const { data: visits, error, isLoading, mutate } = useVisitQueries({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  filledByUid: userId
});
```

**After (Shared Cache):**
```typescript
const { visits, error, loading, lastUpdated, refresh } = useSharedVisitQueries({
  dateRange: { 
    start: new Date('2024-01-01'), 
    end: new Date('2024-01-31') 
  },
  userId: userId
});
```

### 3. Handle Loading States

**Before:**
```typescript
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

**After:**
```typescript
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

### 4. Handle Data Updates

**Before:**
```typescript
// Manual refresh
const handleRefresh = () => mutate();

// Optimistic updates
const handleUpdate = async (newData) => {
  mutate(newData, false); // Update UI immediately
  await updateVisit(newData);
  mutate(); // Refresh from server
};
```

**After:**
```typescript
// Manual refresh
const handleRefresh = () => refresh();

// Real-time updates (automatic via listeners)
// No need for optimistic updates - listeners handle real-time sync
```

### 5. Specific Hook Migrations

#### useVisitsInRange
**Before:**
```typescript
const { data: visits } = useVisitsInRange(startDate, endDate, {
  filledByUid: userId
});
```

**After:**
```typescript
const { visits } = useVisitsInRange(startDate, endDate, {
  userId: userId
});
```

#### useAllVisits
**Before:**
```typescript
const { data: visits } = useAllVisits({
  orderBy: 'date',
  orderDirection: 'desc'
});
```

**After:**
```typescript
const { visits } = useAllVisits({
  // Options are handled automatically by the cache
});
```

#### useVisitsForDate
**Before:**
```typescript
const { data: visits } = useVisitsForDate(selectedDate, {
  filledByUid: userId
});
```

**After:**
```typescript
const { visits } = useVisitsForDate(selectedDate, {
  userId: userId
});
```

## Benefits of Migration

### 1. Performance Improvements
- **Shared listeners**: Multiple components share the same Firestore listener
- **Intelligent caching**: Recent data cached for 2 minutes, historical for 10 minutes
- **Persistent cache**: Data survives page refreshes
- **Memory management**: Automatic cleanup of unused listeners

### 2. Real-time Updates
- **Automatic sync**: Changes appear instantly across all components
- **No manual refresh**: Data stays fresh without user intervention
- **Optimistic updates**: UI updates immediately, syncs in background

### 3. Better User Experience
- **Faster loading**: Cached data loads instantly
- **Consistent state**: All components show the same data
- **Offline support**: Cached data available when offline

## Cache Statistics

Monitor cache performance with:

```typescript
import { sharedListenerCache } from '@/services/SharedListenerCache';
import { persistentCache } from '@/services/PersistentCache';

// Get listener cache stats
const listenerStats = sharedListenerCache.getStats();
console.log('Active listeners:', listenerStats.activeListeners);
console.log('Total subscribers:', listenerStats.totalSubscribers);

// Get persistent cache stats
const persistentStats = persistentCache.getStats();
console.log('Cache entries:', persistentStats.totalEntries);
console.log('Cache size:', persistentStats.totalSize);
```

## Troubleshooting

### 1. Data Not Updating
- Check if multiple components are using the same date range
- Verify user permissions and admin status
- Check browser console for Firestore errors

### 2. Memory Issues
- Monitor cache statistics
- Check for memory leaks in component unmounting
- Verify cleanup is working properly

### 3. Performance Issues
- Check TTL settings for your use case
- Monitor listener count and subscriber count
- Consider reducing date ranges for better performance

## Backward Compatibility

The old SWR-based hooks are still available but deprecated. They will be removed in a future version. Migrate as soon as possible to benefit from the new features.

## Testing

Test the migration by:
1. Opening multiple components that use visit data
2. Making changes in one component
3. Verifying changes appear in other components
4. Refreshing the page and checking if data loads from cache
5. Monitoring browser dev tools for network requests (should be fewer)
