import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface AppState {
  currentTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const applyThemeToDocument = (effectiveTheme: 'light' | 'dark') => {
  if (typeof document !== 'undefined') {
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
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
