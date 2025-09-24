import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { WeeklyVisitsCountDoc, InsightQueryOptions } from '@/types/insights';

/**
 * Hook for fetching insight data with caching and fallback logic
 */
export const useInsightData = (options: InsightQueryOptions = {}) => {
  const [data, setData] = useState<WeeklyVisitsCountDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    dataType = 'weekly_visits_count',
    startDate,
    endDate,
    limit: queryLimit = 50,
    orderBy: orderByField = 'data.weekStart',
    orderDirection = 'desc'
  } = options;

  const MAX_RETRIES = 2;

  const fetchInsightData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query
      let q = query(
        collection(db, 'insight_data'),
        where('dataType', '==', dataType),
        orderBy(orderByField, orderDirection),
        limit(queryLimit)
      );

      // Add date filters if provided
      if (startDate || endDate) {
        if (startDate) {
          q = query(q, where(orderByField, '>=', Timestamp.fromDate(startDate)));
        }
        if (endDate) {
          q = query(q, where(orderByField, '<=', Timestamp.fromDate(endDate)));
        }
      }

      const snapshot = await getDocs(q);
      const insightData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WeeklyVisitsCountDoc[];

      setData(insightData);
      setLastFetched(new Date());
      
      // If no data found and we haven't reached max retries, schedule a retry
      if (insightData.length === 0 && retryCountRef.current < MAX_RETRIES) {
        console.log(`No insight data found. Retrying in 5 seconds... (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);
        retryCountRef.current += 1;
        
        // Clear any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchInsightData();
        }, 5000); // Wait 5 seconds before retry
      } else if (insightData.length === 0 && retryCountRef.current >= MAX_RETRIES) {
        console.log('No insight data found after maximum retries. Data may not be available yet.');
        setError(new Error('No insight data available. The Cloud Function may not have run yet.'));
      } else if (insightData.length > 0) {
        console.log(`Successfully loaded ${insightData.length} insight data records.`);
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (err) {
      console.error('Error fetching insight data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch insight data'));
      
      // Retry on error if we haven't reached max retries
      if (retryCountRef.current < MAX_RETRIES) {
        console.log(`Error occurred. Retrying in 5 seconds... (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);
        retryCountRef.current += 1;
        
        // Clear any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchInsightData();
        }, 5000); // Wait 5 seconds before retry
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear any existing timeout when component unmounts or dependencies change
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Reset retry count when dependencies change
    retryCountRef.current = 0;
    
    fetchInsightData();
  }, [dataType, startDate, endDate, queryLimit, orderByField, orderDirection]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastFetched,
    refetch: () => {
      // Clear any existing timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Reset retry count and error state
      retryCountRef.current = 0;
      setError(null);
      setLastFetched(null);
      
      // Trigger refetch
      fetchInsightData();
    }
  };
};

/**
 * Hook for getting weekly visits count data specifically
 */
export const useWeeklyVisitsCount = (weeks: number = 12) => {
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (weeks * 7));
    return { startDate: start, endDate: end };
  }, [weeks]);

  const { data, loading, error, lastFetched, refetch } = useInsightData({
    dataType: 'weekly_visits_count',
    startDate,
    endDate,
    orderBy: 'data.weekStart',
    orderDirection: 'desc',
    limit: weeks
  });

  // Process data for easier consumption
  const processedData = useMemo(() => {
    return data.map(doc => ({
      weekId: doc.data.weekId,
      weekStart: doc.data.weekStart.toDate(),
      weekEnd: doc.data.weekEnd.toDate(),
      counts: doc.data.counts,
      userBreakdown: {
        ...doc.data.userBreakdown,
        topUsers: doc.data.userBreakdown.topUsers?.map(user => ({
          ...user,
          firstVisitDate: user.firstVisitDate?.toDate() || null,
          lastVisitDate: user.lastVisitDate?.toDate() || null
        })) || [],
        userStats: Object.fromEntries(
          Object.entries(doc.data.userBreakdown.userStats || {}).map(([uid, user]) => [
            uid,
            {
              ...user,
              firstVisitDate: user.firstVisitDate?.toDate() || null,
              lastVisitDate: user.lastVisitDate?.toDate() || null
            }
          ])
        )
      },
      cciBreakdown: doc.data.cciBreakdown,
      lastUpdated: doc.lastUpdated.toDate(),
      lastUpdatedDisplay: doc.lastUpdatedDisplay
    }));
  }, [data]);

  return {
    data: processedData,
    loading,
    error,
    lastFetched,
    refetch
  };
};

/**
 * Hook for getting the latest insight data with fallback to real-time data
 */
export const useInsightDataWithFallback = (options: InsightQueryOptions = {}) => {
  const [useFallback, setUseFallback] = useState(false);
  
  const insightData = useInsightData(options);
  
  // If insight data is available and fresh (less than 24 hours old), use it
  const isInsightDataFresh = insightData.lastFetched && 
    (Date.now() - insightData.lastFetched.getTime()) < (24 * 60 * 60 * 1000);

  useEffect(() => {
    // If insight data is loading or has error, or is not fresh, use fallback
    if (insightData.loading || insightData.error || !isInsightDataFresh) {
      setUseFallback(true);
    } else {
      setUseFallback(false);
    }
  }, [insightData.loading, insightData.error, isInsightDataFresh]);

  return {
    ...insightData,
    useFallback,
    dataSource: useFallback ? 'real-time' : 'insights'
  };
};
