import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface FilterPreferences {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  cci?: string[];
  quality?: string[];
  personMet?: string[];
}

interface PreferencesState {
  // Theme preferences
  currentTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  getEffectiveTheme: () => 'light' | 'dark';
  
  // See All toggle
  seeAllVisits: boolean;
  setSeeAllVisits: (seeAll: boolean) => void;
  getDefaultSeeAllSetting: (isEM: boolean) => boolean;
  
  // Default filters
  defaultFilters: FilterPreferences;
  setDefaultFilters: (filters: FilterPreferences) => void;
  resetDefaultFilters: () => void;
  
  // UI preferences
  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
  
  showTooltips: boolean;
  setShowTooltips: (show: boolean) => void;
  
  autoSave: boolean;
  setAutoSave: (auto: boolean) => void;
  
  // Notification preferences
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
  };
  setNotificationPreference: (type: keyof PreferencesState['notifications'], enabled: boolean) => void;
  
  // Data preferences
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  
  sortPreference: {
    field: string;
    direction: 'asc' | 'desc';
  };
  setSortPreference: (field: string, direction: 'asc' | 'desc') => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export const applyThemeToDocument = (effectiveTheme: 'light' | 'dark') => {
  if (typeof document !== 'undefined') {
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

export const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  
  try {
    // Try to get theme from localStorage
    const stored = localStorage.getItem('preferences-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      const currentTheme = parsed?.state?.currentTheme;
      
      if (currentTheme === 'dark') {
        return 'dark';
      } else if (currentTheme === 'system') {
        return getSystemTheme();
      }
    }
  } catch (error) {
    console.warn('Failed to parse stored theme:', error);
  }
  
  // Default to light theme
  return 'light';
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Theme preferences
      currentTheme: 'light',
      setTheme: (theme: ThemeMode) => {
        set({ currentTheme: theme });
        
        // Determine effective theme
        let effectiveTheme: 'light' | 'dark';
        if (theme === 'system') {
          effectiveTheme = getSystemTheme();
          
          // Set up system theme listener if not already set
          if (typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleSystemThemeChange = () => {
              const newEffectiveTheme = getSystemTheme();
              applyThemeToDocument(newEffectiveTheme);
            };
            
            // Remove any existing listener and add new one
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
            mediaQuery.addEventListener('change', handleSystemThemeChange);
          }
        } else {
          effectiveTheme = theme;
        }
        
        // Apply theme to document
        applyThemeToDocument(effectiveTheme);
      },
      getEffectiveTheme: () => {
        const { currentTheme } = get();
        if (currentTheme === 'system') {
          return getSystemTheme();
        }
        return currentTheme;
      },
      
      // See All toggle
      seeAllVisits: true, // Default to true, will be overridden based on user role
      setSeeAllVisits: (seeAll: boolean) => set({ seeAllVisits: seeAll }),
      getDefaultSeeAllSetting: (isEM: boolean) => {
        // EMs default to 'on' (true), other users default to 'off' (false)
        return isEM;
      },
      
      // Default filters
      defaultFilters: {},
      setDefaultFilters: (filters: FilterPreferences) => set({ defaultFilters: filters }),
      resetDefaultFilters: () => set({ defaultFilters: {} }),
      
      // UI preferences
      compactMode: false,
      setCompactMode: (compact: boolean) => set({ compactMode: compact }),
      
      showTooltips: true,
      setShowTooltips: (show: boolean) => set({ showTooltips: show }),
      
      autoSave: true,
      setAutoSave: (auto: boolean) => set({ autoSave: auto }),
      
      // Notification preferences
      notifications: {
        email: true,
        push: true,
        sound: false
      },
      setNotificationPreference: (type: keyof PreferencesState['notifications'], enabled: boolean) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [type]: enabled
          }
        })),
      
      // Data preferences
      itemsPerPage: 25,
      setItemsPerPage: (count: number) => set({ itemsPerPage: count }),
      
      sortPreference: {
        field: 'date',
        direction: 'desc'
      },
      setSortPreference: (field: string, direction: 'asc' | 'desc') =>
        set({ sortPreference: { field, direction } })
    }),
    {
      name: 'preferences-storage',
      // Only persist user preferences, not computed values
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        seeAllVisits: state.seeAllVisits,
        defaultFilters: state.defaultFilters,
        compactMode: state.compactMode,
        showTooltips: state.showTooltips,
        autoSave: state.autoSave,
        notifications: state.notifications,
        itemsPerPage: state.itemsPerPage,
        sortPreference: state.sortPreference
      }),
      merge: (persistedState: any, currentState: any) => {
        const merged = {
          ...currentState,
          ...(persistedState || {}),
        };
        
        // Apply theme on load
        let effectiveTheme: 'light' | 'dark';
        if (merged.currentTheme === 'system') {
          effectiveTheme = getSystemTheme();
        } else {
          effectiveTheme = merged.currentTheme;
        }
        applyThemeToDocument(effectiveTheme);
        
        return merged;
      }
    }
  )
);
