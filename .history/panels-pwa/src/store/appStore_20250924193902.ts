import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

// Permission cache for visit editing
interface VisitPermissions {
  [visitId: string]: {
    canEdit: boolean;
    canView: boolean;
    checkedAt: number; // timestamp for cache invalidation
  };
}

interface AppState {
  currentTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  getEffectiveTheme: () => 'light' | 'dark';
  seeAllVisits: boolean;
  setSeeAllVisits: (seeAll: boolean) => void;
  getDefaultSeeAllSetting: (isEM: boolean) => boolean;
  
  // Centralized permission management
  visitPermissions: VisitPermissions;
  currentUserId: string | null;
  isAdmin: boolean;
  setCurrentUser: (userId: string | null, isAdmin: boolean) => void;
  canEditVisit: (visitId: string, filledByUid: string) => boolean;
  canViewVisit: (visitId: string, filledByUid: string) => boolean;
  clearPermissionsCache: () => void;
  invalidateVisitPermissions: (visitId: string) => void;
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
    const stored = localStorage.getItem('app-storage');
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

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentTheme: 'light',
      seeAllVisits: true, // Default to true, will be overridden based on user role
      
      // Permission management state
      visitPermissions: {},
      currentUserId: null,
      isAdmin: false,
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
      setSeeAllVisits: (seeAll: boolean) => {
        set({ seeAllVisits: seeAll });
      },
      getDefaultSeeAllSetting: (isEM: boolean) => {
        // EMs default to 'on' (true), other users default to 'off' (false)
        return isEM;
      },
      
      // Permission management functions
      setCurrentUser: (userId: string | null, isAdmin: boolean) => {
        set({ 
          currentUserId: userId, 
          isAdmin,
          // Clear permissions cache when user changes
          visitPermissions: {}
        });
      },
      
      canEditVisit: (visitId: string, filledByUid: string) => {
        const state = get();
        const { currentUserId, isAdmin, visitPermissions } = state;
        
        // Admin can edit any visit
        if (isAdmin) return true;
        
        // No user logged in
        if (!currentUserId) return false;
        
        // Check cache first (valid for 5 minutes)
        const cached = visitPermissions[visitId];
        const now = Date.now();
        if (cached && (now - cached.checkedAt) < 5 * 60 * 1000) {
          return cached.canEdit;
        }
        
        // Business rule: Only the creator can edit their visit
        const canEdit = currentUserId === filledByUid;
        
        // Cache the result
        set({
          visitPermissions: {
            ...visitPermissions,
            [visitId]: {
              canEdit,
              canView: true, // Everyone can view visits they can see
              checkedAt: now
            }
          }
        });
        
        return canEdit;
      },
      
      canViewVisit: (visitId: string, filledByUid: string) => {
        const state = get();
        const { currentUserId, isAdmin, visitPermissions } = state;
        
        // Admin can view any visit
        if (isAdmin) return true;
        
        // No user logged in
        if (!currentUserId) return false;
        
        // Check cache first
        const cached = visitPermissions[visitId];
        const now = Date.now();
        if (cached && (now - cached.checkedAt) < 5 * 60 * 1000) {
          return cached.canView;
        }
        
        // Business rule: Users can view visits they can see (handled by Firestore rules)
        const canView = true; // If they can see it, they can view it
        
        // Cache the result
        set({
          visitPermissions: {
            ...visitPermissions,
            [visitId]: {
              canEdit: currentUserId === filledByUid,
              canView,
              checkedAt: now
            }
          }
        });
        
        return canView;
      },
      
      clearPermissionsCache: () => {
        set({ visitPermissions: {} });
      },
      
      invalidateVisitPermissions: (visitId: string) => {
        const { visitPermissions } = get();
        const newPermissions = { ...visitPermissions };
        delete newPermissions[visitId];
        set({ visitPermissions: newPermissions });
      },
      
      getEffectiveTheme: () => {
        const { currentTheme } = get();
        if (currentTheme === 'system') {
          return getSystemTheme();
        }
        return currentTheme;
      },
    }),
    {
      name: 'app-storage',
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
          effectiveTheme = merged.currentTheme === 'dark' ? 'dark' : 'light';
        }
        
        applyThemeToDocument(effectiveTheme);
        return merged;
      },
    }
  )
);

export default useAppStore;
