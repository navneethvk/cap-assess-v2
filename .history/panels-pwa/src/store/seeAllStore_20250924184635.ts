import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SeeAllState {
  seeAll: boolean;
  setSeeAll: (seeAll: boolean) => void;
  toggleSeeAll: () => void;
  getInitialSeeAllState: (isEM: boolean) => boolean;
}

const useSeeAllStore = create<SeeAllState>()(
  persist(
    (set, get) => ({
      seeAll: true, // Default value, will be overridden by getInitialSeeAllState
      setSeeAll: (seeAll) => set({ seeAll }),
      toggleSeeAll: () => set((state) => ({ seeAll: !state.seeAll })),
      getInitialSeeAllState: (isEM: boolean) => {
        // Default to "on" for EMs and "off" for other users
        const defaultState = isEM;
        const currentState = get().seeAll;
        
        // If this is the first time (no persisted state), use the default
        if (currentState === true && !localStorage.getItem('see-all-storage')) {
          set({ seeAll: defaultState });
          return defaultState;
        }
        
        return currentState;
      }
    }),
    {
      name: 'see-all-storage',
      // Only persist the seeAll value, not the functions
      partialize: (state) => ({ seeAll: state.seeAll }),
    }
  )
);

export default useSeeAllStore;
