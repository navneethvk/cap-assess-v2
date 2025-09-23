import { useEffect, useCallback, useMemo, useState } from 'react';
import useAuthStore from '@/store/authStore';
import useVisitStore as useVisitStoreStore, { createWindowKey } from '@/store/visitStore';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useUserVisits } from '@/hooks/useUserVisits';
import type { VisitDoc, DocumentWithId } from '@/types/firestore';
import { timestampToDate } from '@/types/firestore';

// Hook for components to interact with the central visit store
export const useVisitStore = () => {
  const { user } = useAuthStore();
  const store = useVisitStoreStore();

  // Fetch data based on user role
  const { data: allVisits } = useFirestoreCollection<VisitDoc>('visits');
  const { data: userVisits } = useUserVisits('visits');

  // Determine user role
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEM, setIsEM] = useState(false);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((result: any) => {
        const role = result.claims.role as string;
        const admin = role === 'Admin';
        const em = role === 'EM';
        setIsAdmin(admin);
        setIsEM(em);
        store.setUserRole(admin, em);
      });
    }
  }, [user, store]);

  // Get the appropriate visits data based on user role
  const visitsData = useMemo(() => {
    if (isAdmin) {
      return allVisits || [];
    } else {
      return userVisits || [];
    }
  }, [isAdmin, allVisits, userVisits]);

  // Load a specific window
  const loadWindow = useCallback(async (startDate: Date, endDate: Date, forceRefresh = false) => {
    const windowKey = createWindowKey(startDate, endDate);
    
    // Check if window already exists and is recent
    if (!forceRefresh && store.windows[windowKey] && store.windows[windowKey].lastFetched) {
      const timeSinceFetch = Date.now() - store.windows[windowKey].lastFetched!.getTime();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      if (timeSinceFetch < maxAge) {
        store.setActiveWindow(windowKey);
        return;
      }
    }

    // Set loading state
    store.setWindowLoading(windowKey, true);
    store.setWindowError(windowKey, null);
    store.setActiveWindow(windowKey);

    try {
      // Filter visits by date range
      const visits = visitsData.filter(visit => {
        const visitDate = timestampToDate(visit.date) || new Date();
        return visitDate >= startDate && visitDate <= endDate;
      });

      // Update window with loaded data
      store.setWindowData(windowKey, {
        startDate,
        endDate,
        visits,
        isLoading: false,
        error: null,
        lastFetched: new Date(),
      });

    } catch (error) {
      // Handle error
      store.setWindowData(windowKey, {
        startDate,
        endDate,
        visits: store.windows[windowKey]?.visits || [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load visits',
        lastFetched: null,
      });
    }
  }, [store, visitsData]);

  // Expand current window
  const expandWindow = useCallback(async (direction: 'past' | 'future', days: number) => {
    const state = store;
    if (!state.activeWindow) return;

    const currentWindow = state.windows[state.activeWindow];
    if (!currentWindow) return;

    let newStartDate = new Date(currentWindow.startDate);
    let newEndDate = new Date(currentWindow.endDate);

    if (direction === 'past') {
      newStartDate.setDate(newStartDate.getDate() - days);
    } else {
      newEndDate.setDate(newEndDate.getDate() + days);
    }

    // Load the expanded window
    await loadWindow(newStartDate, newEndDate);
  }, [store, loadWindow]);

  // Get visits in a specific date range
  const getVisitsInRange = useCallback((startDate: Date, endDate: Date) => {
    return store.getVisitsInRange(startDate, endDate);
  }, [store]);

  // Get visits for a specific date
  const getVisitsForDate = useCallback((date: Date) => {
    return store.getVisitsForDate(date);
  }, [store]);

  // Get all visits (for admin users)
  const getAllVisits = useCallback(() => {
    if (!isAdmin) return [];
    
    const allVisits: DocumentWithId<VisitDoc>[] = [];
    Object.values(store.windows).forEach((window: any) => {
      allVisits.push(...window.visits);
    });
    
    return allVisits;
  }, [isAdmin, store.windows]);

  // Get user's visits (for EM users)
  const getUserVisits = useCallback(() => {
    if (isAdmin) return getAllVisits();
    
    const userVisits: DocumentWithId<VisitDoc>[] = [];
    Object.values(store.windows).forEach(window => {
      window.visits.forEach(visit => {
        if (visit.filledByUid === user?.uid) {
          userVisits.push(visit);
        }
      });
    });
    
    return userVisits;
  }, [isAdmin, getAllVisits, store.windows, user?.uid]);

  // Check if a window is loading
  const isWindowLoading = useCallback((startDate: Date, endDate: Date) => {
    const windowKey = createWindowKey(startDate, endDate);
    return store.windows[windowKey]?.isLoading || false;
  }, [store.windows]);

  // Get window error
  const getWindowError = useCallback((startDate: Date, endDate: Date) => {
    const windowKey = createWindowKey(startDate, endDate);
    return store.windows[windowKey]?.error || null;
  }, [store.windows]);

  // Smart loading for timeline view
  const loadTimelineData = useCallback(async (centerDate: Date) => {
    const { expansionSettings } = store;
    const windowDays = isEM ? expansionSettings.emWindowDays : expansionSettings.defaultWindowDays;
    
    const startDate = new Date(centerDate);
    startDate.setDate(startDate.getDate() - windowDays);
    
    const endDate = new Date(centerDate);
    endDate.setDate(endDate.getDate() + windowDays);
    
    await loadWindow(startDate, endDate);
  }, [store, isEM, loadWindow]);

  // Smart loading for calendar view
  const loadCalendarData = useCallback(async (month: Date) => {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    await loadWindow(startDate, endDate);
  }, [loadWindow]);

  // Smart loading for notes view
  const loadNotesData = useCallback(async (startDate: Date, endDate: Date) => {
    await loadWindow(startDate, endDate);
  }, [loadWindow]);

  return {
    // Data
    visits: store.windows,
    isAdmin,
    isEM,
    isBackgroundLoading: false, // TODO: Implement background loading
    
    // Actions
    getVisitsInRange,
    getVisitsForDate,
    loadWindow,
    expandWindow,
    getAllVisits,
    getUserVisits,
    loadTimelineData,
    loadCalendarData,
    loadNotesData,
    
    // Utilities
    isWindowLoading,
    getWindowError,
    clearWindow: store.clearWindow,
    clearAllWindows: store.clearAllWindows,
  };
};

export default useVisitStore;