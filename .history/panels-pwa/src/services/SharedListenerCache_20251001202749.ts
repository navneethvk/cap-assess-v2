import { 
  Query, 
  QuerySnapshot, 
  type Unsubscribe, 
  onSnapshot, 
  Timestamp,
  where,
  orderBy,
  query,
  limit,
  collection
} from 'firebase/firestore';
import { db } from '@/firebase';
import type { VisitDoc } from '@/types/firestore';
import { persistentCache } from './PersistentCache';

interface DateRange {
  start: Date;
  end: Date;
}

interface ListenerCacheEntry {
  // Core data
  query: Query;
  unsubscribe: Unsubscribe;
  data: VisitDoc[];
  lastUpdated: number;
  
  // Metadata
  dateRange: DateRange;
  userId: string | null;
  isAdmin: boolean;
  seeAllVisits: boolean;
  
  // TTL and lifecycle
  ttl: number; // Time to live in milliseconds
  subscribers: Set<string>; // Component IDs that are subscribed
  isActive: boolean;
  
  // Lazy loading
  isInitialLoad: boolean;
  hasExtendedRange: boolean;
  maxRange?: DateRange; // Maximum range this listener can cover
}

interface ListenerSubscription {
  componentId: string;
  dateRange: DateRange;
  callback: (data: VisitDoc[]) => void;
  onError?: (error: Error) => void;
}

class SharedListenerCache {
  private listeners: Map<string, ListenerCacheEntry> = new Map();
  private subscriptions: Map<string, ListenerSubscription> = new Map();
  
  // TTL Strategy: Different TTLs based on data age and user activity
  private readonly TTL_STRATEGY = {
    RECENT_DATA: 2 * 60 * 1000,        // 2 minutes for recent data (last 7 days)
    HISTORICAL_DATA: 10 * 60 * 1000,    // 10 minutes for older data
    ADMIN_DATA: 1 * 60 * 1000,          // 1 minute for admin data (more critical)
    INACTIVE_USER: 30 * 60 * 1000,      // 30 minutes for inactive users
    DEFAULT: 5 * 60 * 1000              // 5 minutes default
  };
  
  private readonly LAZY_EXTENSION_BUFFER = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly RECENT_DATA_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  /**
   * Generate a cache key for a listener based on its parameters
   */
  private generateCacheKey(
    userId: string | null,
    isAdmin: boolean,
    seeAllVisits: boolean,
    dateRange: DateRange
  ): string {
    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];
    return `${userId || 'anonymous'}_${isAdmin ? 'admin' : 'user'}_${seeAllVisits ? 'seeAll' : 'own'}_${startStr}_${endStr}`;
  }
  
  /**
   * Create a Firestore query for visits within a date range
   */
  private createVisitQuery(
    userId: string | null,
    isAdmin: boolean,
    seeAllVisits: boolean,
    dateRange: DateRange
  ): Query {
    const startTimestamp = Timestamp.fromDate(dateRange.start);
    const endTimestamp = Timestamp.fromDate(dateRange.end);
    
    let baseQuery = query(
      collection(db, 'visits'),
      where('date', '>=', startTimestamp),
      where('date', '<=', endTimestamp),
      orderBy('date', 'desc'),
      limit(1000) // Reasonable limit for performance
    );
    
    // Apply user-specific filtering if not admin and not seeing all visits
    if (!isAdmin && !seeAllVisits && userId) {
      baseQuery = query(
        collection(db, 'visits'),
        where('date', '>=', startTimestamp),
        where('date', '<=', endTimestamp),
        where('filledByUid', '==', userId),
        orderBy('date', 'desc'),
        limit(1000)
      );
    }
    
    return baseQuery;
  }
  
  /**
   * Get the optimal date range for initial loading
   * Start with one week before and after today, extend lazily as needed
   */
  private getInitialDateRange(): DateRange {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 7); // One week before
    
    const end = new Date(today);
    end.setDate(today.getDate() + 7); // One week after
    
    return { start, end };
  }
  
  /**
   * Check if a date range needs to be extended to cover a requested range
   */
  private needsRangeExtension(
    currentRange: DateRange,
    requestedRange: DateRange
  ): boolean {
    return (
      requestedRange.start < currentRange.start ||
      requestedRange.end > currentRange.end
    );
  }
  
  /**
   * Extend a date range to cover the requested range with buffer
   */
  private extendDateRange(
    currentRange: DateRange,
    requestedRange: DateRange
  ): DateRange {
    const start = new Date(Math.min(
      currentRange.start.getTime(),
      requestedRange.start.getTime() - this.LAZY_EXTENSION_BUFFER
    ));
    
    const end = new Date(Math.max(
      currentRange.end.getTime(),
      requestedRange.end.getTime() + this.LAZY_EXTENSION_BUFFER
    ));
    
    return { start, end };
  }
  
  /**
   * Subscribe to visits data for a specific date range
   */
  subscribe(
    componentId: string,
    userId: string | null,
    isAdmin: boolean,
    seeAllVisits: boolean,
    dateRange: DateRange,
    callback: (data: VisitDoc[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    // Store the subscription
    this.subscriptions.set(componentId, {
      componentId,
      dateRange,
      callback,
      onError
    });
    
    // Find or create appropriate listener
    const listenerKey = this.findOrCreateListener(
      userId,
      isAdmin,
      seeAllVisits,
      dateRange
    );
    
    const listener = this.listeners.get(listenerKey)!;
    listener.subscribers.add(componentId);
    
    // Immediately call callback with current data if available
    if (listener.data.length > 0) {
      const filteredData = this.filterDataByDateRange(listener.data, dateRange);
      callback(filteredData);
    }
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(componentId, listenerKey);
    };
  }
  
  /**
   * Find existing listener or create new one for the given parameters
   */
  private findOrCreateListener(
    userId: string | null,
    isAdmin: boolean,
    seeAllVisits: boolean,
    dateRange: DateRange
  ): string {
    // First, try to find an existing listener that can cover this range
    for (const [key, listener] of this.listeners) {
      if (
        listener.userId === userId &&
        listener.isAdmin === isAdmin &&
        listener.seeAllVisits === seeAllVisits &&
        listener.isActive &&
        !this.needsRangeExtension(listener.dateRange, dateRange)
      ) {
        // Found a compatible listener, extend it if needed
        if (this.needsRangeExtension(listener.dateRange, dateRange)) {
          this.extendListenerRange(listener, dateRange);
        }
        return key;
      }
    }
    
    // No compatible listener found, create new one
    return this.createNewListener(userId, isAdmin, seeAllVisits, dateRange);
  }
  
  /**
   * Determine appropriate TTL based on data characteristics
   */
  private calculateTTL(
    _userId: string | null,
    isAdmin: boolean,
    dateRange: DateRange,
    subscriberCount: number
  ): number {
    const now = Date.now();
    const isRecentData = dateRange.start.getTime() > (now - this.RECENT_DATA_THRESHOLD);
    const isHistoricalData = !isRecentData;
    const hasMultipleSubscribers = subscriberCount > 1;
    
    // Admin data needs fresher updates
    if (isAdmin) {
      return this.TTL_STRATEGY.ADMIN_DATA;
    }
    
    // Recent data should be fresher
    if (isRecentData) {
      return this.TTL_STRATEGY.RECENT_DATA;
    }
    
    // Historical data can be cached longer
    if (isHistoricalData) {
      return this.TTL_STRATEGY.HISTORICAL_DATA;
    }
    
    // Multiple subscribers = more active usage = shorter TTL
    if (hasMultipleSubscribers) {
      return this.TTL_STRATEGY.RECENT_DATA;
    }
    
    return this.TTL_STRATEGY.DEFAULT;
  }
  
  /**
   * Create a new listener for the given parameters
   */
  private createNewListener(
    userId: string | null,
    isAdmin: boolean,
    seeAllVisits: boolean,
    dateRange: DateRange
  ): string {
    // Use initial range for new listeners to start small
    const initialRange = this.getInitialDateRange();
    const actualRange = this.needsRangeExtension(initialRange, dateRange)
      ? this.extendDateRange(initialRange, dateRange)
      : initialRange;
    
    const cacheKey = this.generateCacheKey(userId, isAdmin, seeAllVisits, actualRange);
    const query = this.createVisitQuery(userId, isAdmin, seeAllVisits, actualRange);
    
    // Calculate appropriate TTL
    const ttl = this.calculateTTL(userId, isAdmin, actualRange, 1);
    
    const listener: ListenerCacheEntry = {
      query,
      unsubscribe: () => {}, // Will be set below
      data: [],
      lastUpdated: Date.now(),
      dateRange: actualRange,
      userId,
      isAdmin,
      seeAllVisits,
      ttl,
      subscribers: new Set(),
      isActive: true,
      isInitialLoad: true,
      hasExtendedRange: actualRange !== initialRange,
      maxRange: this.extendDateRange(actualRange, dateRange)
    };
    
    // Try to load from persistent cache first
    const persistentKey = `listener_${cacheKey}`;
    const cachedData = persistentCache.get<VisitDoc[]>(persistentKey);
    if (cachedData && cachedData.length > 0) {
      listener.data = cachedData;
      listener.lastUpdated = Date.now();
      console.log(`Loaded ${cachedData.length} visits from persistent cache for ${cacheKey}`);
    }
    
    // Set up the actual Firestore listener
    listener.unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot) => {
        this.handleSnapshotUpdate(listener, snapshot);
      },
      (error) => {
        console.error('Firestore listener error:', error);
        this.handleListenerError(listener, error);
      }
    );
    
    this.listeners.set(cacheKey, listener);
    return cacheKey;
  }
  
  /**
   * Extend an existing listener's range
   */
  private extendListenerRange(
    listener: ListenerCacheEntry,
    requestedRange: DateRange
  ): void {
    const newRange = this.extendDateRange(listener.dateRange, requestedRange);
    
    // Create new query with extended range
    const newQuery = this.createVisitQuery(
      listener.userId,
      listener.isAdmin,
      listener.seeAllVisits,
      newRange
    );
    
    // Unsubscribe from old listener
    listener.unsubscribe();
    
    // Update listener with new range and query
    listener.dateRange = newRange;
    listener.query = newQuery;
    listener.hasExtendedRange = true;
    
    // Set up new listener
    listener.unsubscribe = onSnapshot(
      newQuery,
      (snapshot: QuerySnapshot) => {
        this.handleSnapshotUpdate(listener, snapshot);
      },
      (error) => {
        console.error('Extended Firestore listener error:', error);
        this.handleListenerError(listener, error);
      }
    );
  }
  
  /**
   * Handle snapshot updates from Firestore
   */
  private handleSnapshotUpdate(
    listener: ListenerCacheEntry,
    snapshot: QuerySnapshot
  ): void {
    const newData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as VisitDoc[];
    
    listener.data = newData;
    listener.lastUpdated = Date.now();
    listener.isInitialLoad = false;
    
    // Notify all subscribers with their filtered data
    for (const componentId of listener.subscribers) {
      const subscription = this.subscriptions.get(componentId);
      if (subscription) {
        const filteredData = this.filterDataByDateRange(newData, subscription.dateRange);
        subscription.callback(filteredData);
      }
    }
  }
  
  /**
   * Handle listener errors
   */
  private handleListenerError(
    listener: ListenerCacheEntry,
    error: Error
  ): void {
    // Notify all subscribers of the error
    for (const componentId of listener.subscribers) {
      const subscription = this.subscriptions.get(componentId);
      if (subscription?.onError) {
        subscription.onError(error);
      }
    }
  }
  
  /**
   * Filter data by date range for a specific subscription
   */
  private filterDataByDateRange(
    data: VisitDoc[],
    dateRange: DateRange
  ): VisitDoc[] {
    return data.filter(visit => {
      const visitDate = visit.date instanceof Timestamp ? visit.date.toDate() : visit.date;
      return visitDate >= dateRange.start && visitDate <= dateRange.end;
    });
  }
  
  /**
   * Unsubscribe a component from a listener
   */
  private unsubscribe(componentId: string, listenerKey: string): void {
    const listener = this.listeners.get(listenerKey);
    if (listener) {
      listener.subscribers.delete(componentId);
      
      // If no more subscribers, mark for cleanup
      if (listener.subscribers.size === 0) {
        listener.isActive = false;
        // Don't immediately unsubscribe, let TTL handle cleanup
      }
    }
    
    this.subscriptions.delete(componentId);
  }
  
  /**
   * Clean up expired listeners with intelligent TTL management
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, listener] of this.listeners) {
      const isExpired = now - listener.lastUpdated > listener.ttl;
      const hasNoSubscribers = listener.subscribers.size === 0;
      const isInactive = !listener.isActive;
      
      // Recalculate TTL for active listeners with multiple subscribers
      if (listener.subscribers.size > 1 && !isExpired) {
        const newTTL = this.calculateTTL(
          listener.userId,
          listener.isAdmin,
          listener.dateRange,
          listener.subscribers.size
        );
        
        // Update TTL if it changed significantly
        if (Math.abs(newTTL - listener.ttl) > 60000) { // 1 minute threshold
          listener.ttl = newTTL;
          console.log(`Updated TTL for ${key}: ${newTTL}ms (${listener.subscribers.size} subscribers)`);
        }
      }
      
      // Clean up conditions:
      // 1. Expired listeners
      // 2. Listeners with no subscribers that have been inactive for a while
      // 3. Very old listeners (> 1 hour) regardless of activity
      const isVeryOld = now - listener.lastUpdated > 60 * 60 * 1000; // 1 hour
      
      if (isExpired || isVeryOld || (hasNoSubscribers && isInactive && now - listener.lastUpdated > 10 * 60 * 1000)) {
        listener.unsubscribe();
        this.listeners.delete(key);
        console.log(`Cleaned up listener: ${key} (expired: ${isExpired}, very old: ${isVeryOld}, inactive: ${isInactive})`);
      }
    }
  }
  
  /**
   * Get cache statistics for debugging and monitoring
   */
  getStats(): {
    activeListeners: number;
    totalSubscribers: number;
    memoryUsage: number;
    averageDataAge: number;
    staleListeners: number;
    ttlDistribution: Record<string, number>;
  } {
    let totalSubscribers = 0;
    let memoryUsage = 0;
    let totalDataAge = 0;
    let staleListeners = 0;
    const ttlDistribution: Record<string, number> = {};
    const now = Date.now();
    
    for (const listener of this.listeners.values()) {
      totalSubscribers += listener.subscribers.size;
      memoryUsage += listener.data.length;
      
      const dataAge = now - listener.lastUpdated;
      totalDataAge += dataAge;
      
      // Check if data is stale (older than 50% of TTL)
      if (dataAge > listener.ttl * 0.5) {
        staleListeners++;
      }
      
      // Track TTL distribution
      const ttlCategory = this.getTTLCategory(listener.ttl);
      ttlDistribution[ttlCategory] = (ttlDistribution[ttlCategory] || 0) + 1;
    }
    
    return {
      activeListeners: this.listeners.size,
      totalSubscribers,
      memoryUsage,
      averageDataAge: this.listeners.size > 0 ? Math.round(totalDataAge / this.listeners.size) : 0,
      staleListeners,
      ttlDistribution
    };
  }
  
  /**
   * Get TTL category for statistics
   */
  private getTTLCategory(ttl: number): string {
    if (ttl <= this.TTL_STRATEGY.ADMIN_DATA) return 'admin';
    if (ttl <= this.TTL_STRATEGY.RECENT_DATA) return 'recent';
    if (ttl <= this.TTL_STRATEGY.DEFAULT) return 'default';
    if (ttl <= this.TTL_STRATEGY.HISTORICAL_DATA) return 'historical';
    return 'inactive';
  }
  
  /**
   * Force refresh all active listeners
   */
  refreshAll(): void {
    for (const listener of this.listeners.values()) {
      if (listener.isActive && listener.subscribers.size > 0) {
        // Re-trigger the listener by updating TTL
        listener.lastUpdated = Date.now();
      }
    }
  }
  
  /**
   * Clear all listeners (for testing or app shutdown)
   */
  destroy(): void {
    for (const listener of this.listeners.values()) {
      listener.unsubscribe();
    }
    this.listeners.clear();
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const sharedListenerCache = new SharedListenerCache();

// Set up periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    sharedListenerCache.cleanup();
  }, 60000); // Clean up every minute
}
