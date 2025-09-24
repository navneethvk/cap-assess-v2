import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  Timestamp,
  QueryConstraint,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase';
import type { VisitDoc, DocumentWithId } from '@/types/firestore';
import { timestampToDate } from '@/types/firestore';
import type { User } from 'firebase/auth';

/**
 * Centralized Visit Query Manager
 * 
 * This service provides a single source of truth for all visit queries
 * with intelligent caching, query optimization, and consistent data access.
 */

export interface VisitQueryOptions {
  // Date filtering
  startDate?: Date;
  endDate?: Date;
  
  // User filtering
  filledByUid?: string;
  
  // CCI filtering
  cciId?: string;
  
  // Status filtering
  status?: VisitDoc['status'];
  
  // Pagination
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
  
  // Sorting
  orderBy?: 'date' | 'createdAt' | 'order';
  orderDirection?: 'asc' | 'desc';
  
  // Cache options
  cacheKey?: string;
  forceRefresh?: boolean;
  
  // User context for permissions (internal use)
  _user?: User | null;
  _isAdmin?: boolean;
  _respectPermissions?: boolean; // Default: true
  _seeAllVisits?: boolean; // See All toggle setting
}

export interface VisitQueryResult {
  visits: DocumentWithId<VisitDoc>[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
  totalCount?: number;
}

export interface CachedQueryResult {
  data: VisitQueryResult;
  timestamp: number;
  cacheKey: string;
}

class VisitQueryManager {
  private cache = new Map<string, CachedQueryResult>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_LIMIT = 500;
  private readonly MAX_LIMIT = 1000;

  /**
   * Apply See All filtering at application level
   */
  private async applySeeAllFiltering(result: VisitQueryResult, options: VisitQueryOptions): Promise<VisitQueryResult> {
    // If user is admin, return all results
    if (options._isAdmin) {
      return result;
    }

    // If no user context, return as-is
    if (!options._user) {
      return result;
    }

    try {
      // Get user's CCI assignments
      const userCciLinksDoc = await this.getUserCciLinks(options._user.uid);
      const userCciIds = userCciLinksDoc?.cci_id || [];

      if (options._seeAllVisits === true) {
        // See All is enabled - fetch additional visits for CCIs the user is assigned to
        if (userCciIds.length > 0) {
          const additionalVisits = await this.fetchVisitsForCCIs(userCciIds, options);
          
          // Combine user's own visits with visits for their assigned CCIs
          const allVisits = [...result.visits, ...additionalVisits];
          
          // Remove duplicates based on visit ID
          const uniqueVisits = allVisits.filter((visit, index, self) => 
            index === self.findIndex(v => v.id === visit.id)
          );

          return {
            ...result,
            visits: uniqueVisits
          };
        }
        return result;
      } else {
        // See All is disabled - filter to only show visits for CCIs the user is assigned to
        const filteredVisits = result.visits.filter(visit => {
          return userCciIds.includes(visit.cci_id);
        });

        return {
          ...result,
          visits: filteredVisits
        };
      }
    } catch (error) {
      console.warn('Failed to apply See All filtering, returning all results:', error);
      return result;
    }
  }

  /**
   * Get user's CCI links from Firestore
   */
  private async getUserCciLinks(userId: string): Promise<any> {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/firebase');
    
    const userCciLinksRef = doc(db, 'cci_user_links', userId);
    const userCciLinksSnap = await getDoc(userCciLinksRef);
    
    return userCciLinksSnap.exists() ? userCciLinksSnap.data() : null;
  }

  /**
   * Apply permissions logic to query options
   */
  private applyPermissions(options: VisitQueryOptions): VisitQueryOptions {
    // If permissions are disabled, return as-is
    if (options._respectPermissions === false) {
      return options;
    }

    // If no user context, return as-is (will likely fail at Firestore level)
    if (!options._user) {
      return options;
    }

    // If user is admin, they can see all visits (no additional filtering needed)
    if (options._isAdmin) {
      return options;
    }

    // For non-admin users, we need to fetch their own visits first
    // The See All functionality will be handled by fetching additional visits
    // for CCIs they are assigned to, but we start with their own visits
    return {
      ...options,
      filledByUid: options._user.uid
    };
  }

  /**
   * Generate a cache key for the query options
   */
  private generateCacheKey(options: VisitQueryOptions): string {
    const keyParts = [
      'visits',
      options.startDate?.toISOString() || 'all',
      options.endDate?.toISOString() || 'all',
      options.filledByUid || 'all',
      options.cciId || 'all',
      options.status || 'all',
      options.limit || this.DEFAULT_LIMIT,
      options.orderBy || 'date',
      options.orderDirection || 'desc',
      // Include user context in cache key for permission-aware caching
      options._user?.uid || 'anonymous',
      options._isAdmin ? 'admin' : 'user',
      options._respectPermissions !== false ? 'secured' : 'unsecured',
      options._seeAllVisits ? 'seeAll' : 'seeOwn'
    ];
    
    return keyParts.join('|');
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cached: CachedQueryResult): boolean {
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  /**
   * Build Firestore query constraints from options
   */
  private buildQueryConstraints(options: VisitQueryOptions): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];

    // Date filtering
    if (options.startDate) {
      constraints.push(where('date', '>=', Timestamp.fromDate(options.startDate)));
    }
    if (options.endDate) {
      constraints.push(where('date', '<=', Timestamp.fromDate(options.endDate)));
    }

    // User filtering
    if (options.filledByUid) {
      constraints.push(where('filledByUid', '==', options.filledByUid));
    }

    // CCI filtering
    if (options.cciId) {
      constraints.push(where('cci_id', '==', options.cciId));
    }

    // Status filtering
    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }

    // Ordering
    const orderField = options.orderBy || 'date';
    const orderDir = options.orderDirection || 'desc';
    constraints.push(orderBy(orderField, orderDir));

    // Pagination
    if (options.startAfterDoc) {
      constraints.push(startAfter(options.startAfterDoc));
    }

    // Limit
    const queryLimit = Math.min(options.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
    constraints.push(limit(queryLimit + 1)); // +1 to check if there are more results

    return constraints;
  }

  /**
   * Execute the Firestore query
   */
  private async executeQuery(constraints: QueryConstraint[]): Promise<VisitQueryResult> {
    const visitsQuery = query(collection(db, 'visits'), ...constraints);
    const snapshot = await getDocs(visitsQuery);
    
    const docs = snapshot.docs;
    const hasMore = docs.length > (constraints.find(c => c.type === 'limit') as any)?.limit - 1;
    
    // Remove the extra doc if we fetched one more than requested
    const visits = docs.slice(0, hasMore ? docs.length - 1 : docs.length).map((docSnap) => {
      const raw = docSnap.data() as VisitDoc;
      const { id: _ignored, ...rest } = (raw ?? {}) as VisitDoc & { id?: string };
      return { id: docSnap.id, ...(rest as Omit<VisitDoc, "id">) };
    });

    // Sort by date if not already sorted by date
    const orderField = constraints.find(c => c.type === 'orderBy') as any;
    if (!orderField || orderField.field !== 'date') {
      visits.sort((a, b) => {
        const aDate = timestampToDate(a.date)?.getTime() ?? 0;
        const bDate = timestampToDate(b.date)?.getTime() ?? 0;
        return bDate - aDate; // Most recent first
      });
    }

    return {
      visits,
      hasMore,
      lastDoc: hasMore ? docs[docs.length - 2] : undefined
    };
  }

  /**
   * Main query method with caching and automatic permissions
   */
  async queryVisits(options: VisitQueryOptions = {}): Promise<VisitQueryResult> {
    // Apply permissions logic first
    const permissionAwareOptions = this.applyPermissions(options);
    
    const cacheKey = options.cacheKey || this.generateCacheKey(permissionAwareOptions);
    
    // Check cache first (unless force refresh is requested)
    if (!options.forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached.data;
      }
    }

    // Execute query with permission-aware options
    const constraints = this.buildQueryConstraints(permissionAwareOptions);
    const result = await this.executeQuery(constraints);

    // Apply See All filtering at application level
    const filteredResult = await this.applySeeAllFiltering(result, options);

    // Cache the result
    this.cache.set(cacheKey, {
      data: filteredResult,
      timestamp: Date.now(),
      cacheKey
    });

    return filteredResult;
  }

  /**
   * Get visits for a specific date range (optimized for NotesView)
   */
  async getVisitsInRange(
    startDate: Date, 
    endDate: Date, 
    options: Omit<VisitQueryOptions, 'startDate' | 'endDate'> = {}
  ): Promise<DocumentWithId<VisitDoc>[]> {
    const result = await this.queryVisits({
      ...options,
      startDate,
      endDate,
      orderBy: 'date',
      orderDirection: 'desc'
    });
    return result.visits;
  }

  /**
   * Get visits for a specific user
   */
  async getUserVisits(
    userId: string, 
    options: Omit<VisitQueryOptions, 'filledByUid'> = {}
  ): Promise<DocumentWithId<VisitDoc>[]> {
    const result = await this.queryVisits({
      ...options,
      filledByUid: userId,
      orderBy: 'date',
      orderDirection: 'desc'
    });
    return result.visits;
  }

  /**
   * Get visits for a specific date (optimized for timeline)
   */
  async getVisitsForDate(
    date: Date, 
    options: Omit<VisitQueryOptions, 'startDate' | 'endDate'> = {}
  ): Promise<DocumentWithId<VisitDoc>[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getVisitsInRange(startOfDay, endOfDay, options);
  }

  /**
   * Get all visits (admin only)
   */
  async getAllVisits(options: Omit<VisitQueryOptions, 'filledByUid'> = {}): Promise<DocumentWithId<VisitDoc>[]> {
    const result = await this.queryVisits({
      ...options,
      orderBy: 'date',
      orderDirection: 'desc'
    });
    return result.visits;
  }

  /**
   * Clear cache for specific patterns or all cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear cache entries matching pattern
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Preload common queries
   */
  async preloadCommonQueries(userId?: string): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const preloadPromises = [
      // Current month visits
      this.getVisitsInRange(startOfMonth, endOfMonth),
    ];

    if (userId) {
      preloadPromises.push(
        // User's current month visits
        this.getVisitsInRange(startOfMonth, endOfMonth, { filledByUid: userId })
      );
    }

    await Promise.all(preloadPromises);
  }
}

// Export singleton instance
export const visitQueryManager = new VisitQueryManager();

// Types are already exported above
