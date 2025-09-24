import { useState, useEffect, useMemo } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);

  const {
    dataType = 'weekly_visits_count',
    startDate,
    endDate,
    limit: queryLimit = 50,
    orderBy: orderByField = 'data.weekStart',
    orderDirection = 'desc'
  } = options;

  const MAX_RETRIES = 2;

  useEffect(() => {
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
        if (insightData.length === 0 && retryCount < MAX_RETRIES) {
          console.log(`No insight data found. Retrying in 5 seconds... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 5000); // Wait 5 seconds before retry
        } else if (insightData.length === 0 && retryCount >= MAX_RETRIES) {
          console.log('No insight data found after maximum retries. Data may not be available yet.');
          setError(new Error('No insight data available. The Cloud Function may not have run yet.'));
        } else if (insightData.length > 0) {
          console.log(`Successfully loaded ${insightData.length} insight data records.`);
          setRetryCount(0); // Reset retry count on success
        }
      } catch (err) {
        console.error('Error fetching insight data:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch insight data'));
        
        // Retry on error if we haven't reached max retries
        if (retryCount < MAX_RETRIES) {
          console.log(`Error occurred. Retrying in 5 seconds... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 5000); // Wait 5 seconds before retry
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInsightData();
  }, [dataType, startDate, endDate, queryLimit, orderByField, orderDirection, retryCount]);

  // Separate effect to handle retries without causing loops
  useEffect(() => {
    if (retryCount > 0 && retryCount <= MAX_RETRIES) {
      // This effect will trigger when retryCount changes, but only for actual retries
      console.log(`Retry effect triggered for attempt ${retryCount}`);
    }
  }, [retryCount]);

  return {
    data,
    loading,
    error,
    lastFetched,
    refetch: () => {
      setLastFetched(null);
      setRetryCount(0); // Reset retry count on manual refetch
      setError(null);
      // Trigger refetch by updating a dependency
      setLoading(true);
    }
  };
};

/**
 * Hook for getting weekly visits count data specifically
 */
export const useWeeklyVisitsCount = (weeks: number = 12) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7)); // Go back N weeks

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
      userBreakdown: doc.data.userBreakdown,
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
