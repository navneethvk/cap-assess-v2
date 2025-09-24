import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { WeeklyVisitsCountDoc, InsightQueryOptions } from '@/types/insights';
import { isFirestoreNetworkError, logFirestoreError } from '@/utils/firestoreErrorHandler';

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
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000); // Exponential backoff, max 10 seconds
        console.log(`No insight data found. Retrying in ${retryDelay/1000} seconds... (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);
        retryCountRef.current += 1;
        
        // Clear any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000); // Exponential backoff, max 10 seconds
        retryTimeoutRef.current = setTimeout(() => {
          fetchInsightData();
        }, retryDelay);
      } else if (insightData.length === 0 && retryCountRef.current >= MAX_RETRIES) {
        console.log('No insight data found after maximum retries. Data may not be available yet.');
        setError(new Error('No insight data available. The Cloud Function may not have run yet.'));
      } else if (insightData.length > 0) {
        console.log(`Successfully loaded ${insightData.length} insight data records.`);
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (err) {
      console.error('Error fetching insight data:', err);
      
      // Check if it's a Firestore listener timeout/fetch error
      if (isFirestoreNetworkError(err)) {
        logFirestoreError('useInsightData', err);
      } else {
        console.error('Error fetching insight data:', err);
      }
      
      setError(err instanceof Error ? err : new Error('Failed to fetch insight data'));
      
      // Retry on error if we haven't reached max retries with exponential backoff
      if (retryCountRef.current < MAX_RETRIES) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000); // Exponential backoff, max 10 seconds
        console.log(`Error occurred. Retrying in ${retryDelay/1000} seconds... (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);
        retryCountRef.current += 1;
        
        // Clear any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchInsightData();
        }, retryDelay);
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
            perUserStats: Object.fromEntries(
              Object.entries(doc.data.userBreakdown.perUserStats || {}).map(([userKey, userData]) => [
                userKey,
                {
                  ...userData,
                  firstVisitDate: userData.firstVisitDate?.toDate() || null,
                  lastVisitDate: userData.lastVisitDate?.toDate() || null
                }
              ])
            ),
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
 * Hook for getting user-level statistics from insight data
 */
/**
 * Hook for accessing per-user statistics organized by email/username
 */
export const usePerUserStats = (weeks: number = 12) => {
  const { data: weeklyData, loading, error } = useWeeklyVisitsCount(weeks);

  const perUserStats = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return {
        usersByEmail: {},
        usersByUsername: {},
        totalUsers: 0,
        roleDistribution: { em: 0, visitor: 0, admin: 0 }
      };
    }

    const usersByEmail = new Map<string, any>();
    const usersByUsername = new Map<string, any>();
    let roleDistribution = { em: 0, visitor: 0, admin: 0 };

    weeklyData.forEach(week => {
      if (week.userBreakdown?.perUserStats) {
        Object.entries(week.userBreakdown.perUserStats).forEach(([userKey, userData]) => {
          const email = userData.email;
          const username = userData.username;
          
          // Track by email if available
          if (email) {
            if (!usersByEmail.has(email)) {
              usersByEmail.set(email, {
                uid: userData.uid,
                email: userData.email,
                username: userData.username,
                role: userData.role,
                totalVisits: 0,
                totalCompleteVisits: 0,
                totalScheduledVisits: 0,
                totalCancelledVisits: 0,
                cciCount: 0,
                firstVisitDate: null,
                lastVisitDate: null,
                weeklyBreakdown: []
              });
            }

            const user = usersByEmail.get(email);
            user.totalVisits += userData.weeklyStats.totalVisits;
            user.totalCompleteVisits += userData.weeklyStats.completeVisits;
            user.totalScheduledVisits += userData.weeklyStats.scheduledVisits;
            user.totalCancelledVisits += userData.weeklyStats.cancelledVisits;
            user.cciCount = Math.max(user.cciCount, userData.weeklyStats.cciCount);
            
            if (!user.firstVisitDate || (userData.firstVisitDate && userData.firstVisitDate < user.firstVisitDate)) {
              user.firstVisitDate = userData.firstVisitDate;
            }
            if (!user.lastVisitDate || (userData.lastVisitDate && userData.lastVisitDate > user.lastVisitDate)) {
              user.lastVisitDate = userData.lastVisitDate;
            }

            user.weeklyBreakdown.push({
              weekId: week.weekId,
              weekStart: week.weekStart,
              weekEnd: week.weekEnd,
              totalVisits: userData.weeklyStats.totalVisits,
              completeVisits: userData.weeklyStats.completeVisits,
              scheduledVisits: userData.weeklyStats.scheduledVisits,
              cancelledVisits: userData.weeklyStats.cancelledVisits,
              visitsByQuality: userData.weeklyStats.visitsByQuality,
              visitsByPersonMet: userData.weeklyStats.visitsByPersonMet,
              visitsByHours: userData.weeklyStats.visitsByHours,
              cciIds: userData.weeklyStats.cciIds,
              cciCount: userData.weeklyStats.cciCount
            });
          }

          // Track by username if available and different from email
          if (username && username !== email) {
            if (!usersByUsername.has(username)) {
              usersByUsername.set(username, {
                uid: userData.uid,
                email: userData.email,
                username: userData.username,
                role: userData.role,
                totalVisits: 0,
                totalCompleteVisits: 0,
                totalScheduledVisits: 0,
                totalCancelledVisits: 0,
                cciCount: 0,
                firstVisitDate: null,
                lastVisitDate: null,
                weeklyBreakdown: []
              });
            }

            const user = usersByUsername.get(username);
            user.totalVisits += userData.weeklyStats.totalVisits;
            user.totalCompleteVisits += userData.weeklyStats.completeVisits;
            user.totalScheduledVisits += userData.weeklyStats.scheduledVisits;
            user.totalCancelledVisits += userData.weeklyStats.cancelledVisits;
            user.cciCount = Math.max(user.cciCount, userData.weeklyStats.cciCount);
            
            if (!user.firstVisitDate || (userData.firstVisitDate && userData.firstVisitDate < user.firstVisitDate)) {
              user.firstVisitDate = userData.firstVisitDate;
            }
            if (!user.lastVisitDate || (userData.lastVisitDate && userData.lastVisitDate > user.lastVisitDate)) {
              user.lastVisitDate = userData.lastVisitDate;
            }

            user.weeklyBreakdown.push({
              weekId: week.weekId,
              weekStart: week.weekStart,
              weekEnd: week.weekEnd,
              totalVisits: userData.weeklyStats.totalVisits,
              completeVisits: userData.weeklyStats.completeVisits,
              scheduledVisits: userData.weeklyStats.scheduledVisits,
              cancelledVisits: userData.weeklyStats.cancelledVisits,
              visitsByQuality: userData.weeklyStats.visitsByQuality,
              visitsByPersonMet: userData.weeklyStats.visitsByPersonMet,
              visitsByHours: userData.weeklyStats.visitsByHours,
              cciIds: userData.weeklyStats.cciIds,
              cciCount: userData.weeklyStats.cciCount
            });
          }
        });
      }

      if (week.userBreakdown?.usersByRole) {
        roleDistribution = week.userBreakdown.usersByRole;
      }
    });

    return {
      usersByEmail: Object.fromEntries(usersByEmail),
      usersByUsername: Object.fromEntries(usersByUsername),
      totalUsers: Math.max(usersByEmail.size, usersByUsername.size),
      roleDistribution
    };
  }, [weeklyData]);

  return {
    ...perUserStats,
    loading,
    error
  };
};

export const useUserInsights = (weeks: number = 12) => {
  const { data: weeklyData, loading, error } = useWeeklyVisitsCount(weeks);

  const userInsights = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return {
        topUsers: [],
        userStats: {},
        roleDistribution: { em: 0, visitor: 0, admin: 0 },
        totalUsers: 0
      };
    }

    // Aggregate user data across all weeks
    const userStatsMap = new Map<string, any>();
    let roleDistribution = { em: 0, visitor: 0, admin: 0 };

    weeklyData.forEach(week => {
      if (week.userBreakdown?.userStats) {
        Object.entries(week.userBreakdown.userStats).forEach(([uid, userStat]) => {
          if (!userStatsMap.has(uid)) {
            userStatsMap.set(uid, {
              uid,
              email: userStat.email,
              username: userStat.username,
              role: userStat.role,
              totalVisits: 0,
              completeVisits: 0,
              cciCount: 0,
              firstVisitDate: null,
              lastVisitDate: null,
              weeks: []
            });
          }

          const user = userStatsMap.get(uid);
          user.totalVisits += userStat.visitCount;
          user.completeVisits += userStat.visitsByStatus?.complete || 0;
          user.cciCount = Math.max(user.cciCount, userStat.cciCount);
          
          if (!user.firstVisitDate || (userStat.firstVisitDate && userStat.firstVisitDate < user.firstVisitDate)) {
            user.firstVisitDate = userStat.firstVisitDate;
          }
          if (!user.lastVisitDate || (userStat.lastVisitDate && userStat.lastVisitDate > user.lastVisitDate)) {
            user.lastVisitDate = userStat.lastVisitDate;
          }

          user.weeks.push({
            weekId: week.weekId,
            visitCount: userStat.visitCount,
            completeCount: userStat.visitsByStatus?.complete || 0
          });
        });
      }

      // Update role distribution from the most recent week
      if (week.userBreakdown?.usersByRole) {
        roleDistribution = week.userBreakdown.usersByRole;
      }
    });

    const topUsers = Array.from(userStatsMap.values())
      .sort((a, b) => b.totalVisits - a.totalVisits)
      .slice(0, 20); // Top 20 users

    return {
      topUsers,
      userStats: Object.fromEntries(userStatsMap),
      roleDistribution,
      totalUsers: userStatsMap.size
    };
  }, [weeklyData]);

  return {
    ...userInsights,
    loading,
    error
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
