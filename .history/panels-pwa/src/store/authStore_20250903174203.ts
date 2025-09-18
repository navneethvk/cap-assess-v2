import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
  logout: () => Promise<void>;
  clearStore: () => void;
  refreshToken: () => Promise<void>;
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
        // Clear the store first
        get().clearStore();
        // Then sign out from Firebase
        await auth.signOut();
      },
      clearStore: () => {
        set({ user: null, loading: false });
        // Clear localStorage manually to ensure complete cleanup
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      },
      refreshToken: async () => {
        const currentUser = get().user;
        if (currentUser) {
          try {
            // Force refresh the token
            await currentUser.getIdToken(true);
            // Update the store with the refreshed user
            set({ user: currentUser });
          } catch (error) {
            console.error('Failed to refresh token:', error);
            // If token refresh fails, clear the store
            get().clearStore();
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
