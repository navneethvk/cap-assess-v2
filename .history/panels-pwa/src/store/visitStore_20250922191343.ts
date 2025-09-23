import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VisitDoc, DocumentWithId } from '@/types/firestore';
import { timestampToDate } from '@/types/firestore';

// Date range for a visit window
interface VisitWindow {
  startDate: Date;
  endDate: Date;
  visits: DocumentWithId<VisitDoc>[];
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

// Central visit store state
interface VisitStoreState {
  // Current user's role and status
  isAdmin: boolean;
  isEM: boolean;
  
  // Visit windows by date range key (e.g., "2024-01-01_2024-01-31")
  windows: Record<string, VisitWindow>;
  
  // Current active window (for UI)
  activeWindow: string | null;
  
  // Expansion settings
  expansionSettings: {
    emWindowDays: number; // ±365 days for EMs
    defaultWindowDays: number; // ±60 days for others
    backgroundLoadDays: number; // ±30 days for background loading
  };
  
  // Actions
  setUserRole: (isAdmin: boolean, isEM: boolean) => void;
  loadWindow: (startDate: Date, endDate: Date, forceRefresh?: boolean) => Promise<void>;
  expandWindow: (direction: 'past' | 'future', days: number) => Promise<void>;
  getVisitsInRange: (startDate: Date, endDate: Date) => DocumentWithId<VisitDoc>[];
  getVisitsForDate: (date: Date) => DocumentWithId<VisitDoc>[];
  clearWindow: (windowKey: string) => void;
  clearAllWindows: () => void;
  
  // Background loading
  startBackgroundLoading: () => void;
  stopBackgroundLoading: () => void;
  isBackgroundLoading: boolean;
}

// Helper function to create window key
const createWindowKey = (startDate: Date, endDate: Date): string => {
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  return `${start}_${end}`;
};

// Helper function to check if date is in range
const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  return date >= startDate && date <= endDate;
};

// Helper function to get date range for a window
const getDateRange = (centerDate: Date, days: number): { startDate: Date; endDate: Date } => {
  const startDate = new Date(centerDate);
  startDate.setDate(startDate.getDate() - days);
  
  const endDate = new Date(centerDate);
  endDate.setDate(endDate.getDate() + days);
  
  return { startDate, endDate };
};

const useVisitStore = create<VisitStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAdmin: false,
      isEM: false,
      windows: {},
      activeWindow: null,
      expansionSettings: {
        emWindowDays: 365,
        defaultWindowDays: 60,
        backgroundLoadDays: 30,
      },
      isBackgroundLoading: false,

      // Set user role
      setUserRole: (isAdmin: boolean, isEM: boolean) => {
        set({ isAdmin, isEM });
      },

      // Load a specific window
      loadWindow: async (startDate: Date, endDate: Date, forceRefresh = false) => {
        const windowKey = createWindowKey(startDate, endDate);
        const state = get();
        
        // Check if window already exists and is recent
        if (!forceRefresh && state.windows[windowKey] && state.windows[windowKey].lastFetched) {
          const timeSinceFetch = Date.now() - state.windows[windowKey].lastFetched!.getTime();
          const maxAge = 5 * 60 * 1000; // 5 minutes
          
          if (timeSinceFetch < maxAge) {
            set({ activeWindow: windowKey });
            return;
          }
        }

        // Set loading state
        set((state) => ({
          windows: {
            ...state.windows,
            [windowKey]: {
              startDate,
              endDate,
              visits: state.windows[windowKey]?.visits || [],
              isLoading: true,
              error: null,
              lastFetched: null,
            },
          },
          activeWindow: windowKey,
        }));

        try {
          // Determine which data source to use based on user role
          const { isAdmin, isEM } = get();
          let visits: DocumentWithId<VisitDoc>[] = [];

          if (isAdmin) {
            // Admin: fetch all visits and filter by date range
            const { data: allVisits } = useFirestoreCollection<VisitDoc>('visits');
            if (allVisits) {
              visits = allVisits.filter(visit => {
                const visitDate = timestampToDate(visit.date) || new Date();
                return isDateInRange(visitDate, startDate, endDate);
              });
            }
          } else {
            // Non-admin: fetch user-specific visits and filter by date range
            const { data: userVisits } = useUserVisits('visits');
            if (userVisits) {
              visits = userVisits.filter(visit => {
                const visitDate = timestampToDate(visit.date) || new Date();
                return isDateInRange(visitDate, startDate, endDate);
              });
            }
          }

          // Update window with loaded data
          set((state) => ({
            windows: {
              ...state.windows,
              [windowKey]: {
                startDate,
                endDate,
                visits,
                isLoading: false,
                error: null,
                lastFetched: new Date(),
              },
            },
          }));

        } catch (error) {
          // Handle error
          set((state) => ({
            windows: {
              ...state.windows,
              [windowKey]: {
                startDate,
                endDate,
                visits: state.windows[windowKey]?.visits || [],
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to load visits',
                lastFetched: null,
              },
            },
          }));
        }
      },

      // Expand window in a direction
      expandWindow: async (direction: 'past' | 'future', days: number) => {
        const state = get();
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
        await get().loadWindow(newStartDate, newEndDate);
      },

      // Get visits in a specific date range
      getVisitsInRange: (startDate: Date, endDate: Date) => {
        const state = get();
        const allVisits: DocumentWithId<VisitDoc>[] = [];

        // Collect visits from all windows that overlap with the range
        Object.values(state.windows).forEach(window => {
          window.visits.forEach(visit => {
            const visitDate = timestampToDate(visit.date) || new Date();
            if (isDateInRange(visitDate, startDate, endDate)) {
              // Avoid duplicates
              if (!allVisits.find(v => v.id === visit.id)) {
                allVisits.push(visit);
              }
            }
          });
        });

        return allVisits.sort((a, b) => {
          const dateA = timestampToDate(a.date) || new Date();
          const dateB = timestampToDate(b.date) || new Date();
          return dateB.getTime() - dateA.getTime(); // Most recent first
        });
      },

      // Get visits for a specific date
      getVisitsForDate: (date: Date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return get().getVisitsInRange(startOfDay, endOfDay);
      },

      // Clear a specific window
      clearWindow: (windowKey: string) => {
        set((state) => {
          const newWindows = { ...state.windows };
          delete newWindows[windowKey];
          return { windows: newWindows };
        });
      },

      // Clear all windows
      clearAllWindows: () => {
        set({ windows: {}, activeWindow: null });
      },

      // Start background loading
      startBackgroundLoading: () => {
        set({ isBackgroundLoading: true });
        
        // Load initial window in background
        const today = new Date();
        const { backgroundLoadDays } = get().expansionSettings;
        const { startDate, endDate } = getDateRange(today, backgroundLoadDays);
        
        get().loadWindow(startDate, endDate);
      },

      // Stop background loading
      stopBackgroundLoading: () => {
        set({ isBackgroundLoading: false });
      },
    }),
    {
      name: 'visit-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist windows data, not loading states
        windows: Object.fromEntries(
          Object.entries(state.windows).map(([key, window]) => [
            key,
            {
              ...window,
              isLoading: false,
              error: null,
            }
          ])
        ),
        expansionSettings: state.expansionSettings,
      }),
      version: 1,
    }
  )
);

export default useVisitStore;
