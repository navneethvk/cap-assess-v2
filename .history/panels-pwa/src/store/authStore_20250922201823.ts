import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';

// Minimal user data that's safe to persist
interface PersistedUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: string;
  status?: string;
}

// Helper function to extract safe user data for persistence
const extractSafeUserData = (user: User | null): PersistedUserData | null => {
  if (!user) return null;
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    // Note: role and status are not available on the Firebase User object
    // They would need to be fetched separately from Firestore if needed
  };
};

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
  logout: () => Promise<void>;
  clearStore: () => void;
  refreshToken: () => Promise<void>;
  // Helper to check if we have persisted user data
  hasPersistedUser: () => boolean;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      initializeAuth: () => {
        onAuthStateChanged(auth, (user) => {
          get().setUser(user);
          get().setLoading(false);
        });
      },
      logout: async () => {
        get().clearStore();
        await auth.signOut();
      },
      clearStore: () => {
        set({ user: null, loading: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      },
      refreshToken: async () => {
        const currentUser = get().user;
        if (currentUser) {
          try {
            await currentUser.getIdToken(true);
            set({ user: currentUser });
          } catch (error) {
            console.error('Failed to refresh token:', error);
            get().clearStore();
          }
        }
      },
      hasPersistedUser: () => {
        const state = get();
        // Check if we have persisted user data (not a full Firebase User object)
        return state.user !== null && typeof state.user === 'object' && 'uid' in state.user && !('getIdToken' in state.user);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Only persist minimal, non-sensitive user data
        const safeUserData = extractSafeUserData(state.user);
        return { user: safeUserData };
      },
      // Add versioning + migration to clear incompatible payloads
      version: 3,
      migrate: (persistedState: any) => {
        // For previous versions, ensure we only keep the minimal persisted shape
        if (!persistedState) return { user: null } as any
        const persistedUser = persistedState.user || null
        if (!persistedUser) return { user: null } as any
        // If the object looks like a full Firebase User (has getIdToken or stsTokenManager), drop it
        if (typeof persistedUser === 'object' && ('getIdToken' in persistedUser || 'stsTokenManager' in persistedUser)) {
          return { user: null } as any
        }
        // Otherwise keep only uid/email/displayName
        const migrated = {
          user: {
            uid: persistedUser.uid || null,
            email: persistedUser.email ?? null,
            displayName: persistedUser.displayName ?? null,
          },
        }
        return migrated as any
      },
      onRehydrateStorage: () => (state) => {
        // When rehydrating, we only have persisted user data, not a full Firebase User object
        // The actual Firebase User object will be set by onAuthStateChanged
        if (state && state.user && typeof state.user === 'object' && 'uid' in state.user) {
          // Clear the persisted data since we'll get the real user from Firebase
          state.user = null;
          state.loading = true;
        }
      },
    }
  )
);

export default useAuthStore;
