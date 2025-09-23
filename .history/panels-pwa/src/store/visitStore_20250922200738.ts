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
  setWindowData: (windowKey: string, data: Partial<VisitWindow>) => void;
  setWindowLoading: (windowKey: string, isLoading: boolean) => void;
  setWindowError: (windowKey: string, error: string | null) => void;
  setActiveWindow: (windowKey: string | null) => void;
  getVisitsInRange: (startDate: Date, endDate: Date) => DocumentWithId<VisitDoc>[];
  getVisitsForDate: (date: Date) => DocumentWithId<VisitDoc>[];
  clearWindow: (windowKey: string) => void;
  clearAllWindows: () => void;
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

      // Set user role
      setUserRole: (isAdmin: boolean, isEM: boolean) => {
        set({ isAdmin, isEM });
      },

      // Set window data
      setWindowData: (windowKey: string, data: Partial<VisitWindow>) => {
        set((state) => ({
          windows: {
            ...state.windows,
            [windowKey]: {
              ...state.windows[windowKey],
              ...data,
            } as VisitWindow,
          },
        }));
      },

      // Set window loading state
      setWindowLoading: (windowKey: string, isLoading: boolean) => {
        set((state) => ({
          windows: {
            ...state.windows,
            [windowKey]: {
              ...state.windows[windowKey],
              isLoading,
            } as VisitWindow,
          },
        }));
      },

      // Set window error
      setWindowError: (windowKey: string, error: string | null) => {
        set((state) => ({
          windows: {
            ...state.windows,
            [windowKey]: {
              ...state.windows[windowKey],
              error,
            } as VisitWindow,
          },
        }));
      },

      // Set active window
      setActiveWindow: (windowKey: string | null) => {
        set({ activeWindow: windowKey });
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
              // Do not persist lastFetched to avoid Date -> string serialization issues
              lastFetched: null,
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
export { createWindowKey, isDateInRange };