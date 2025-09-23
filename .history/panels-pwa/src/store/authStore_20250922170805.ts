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
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Only persist minimal, non-sensitive user data
        if (state.user) {
          const persistedData: PersistedUserData = {
            uid: state.user.uid,
            email: state.user.email,
            displayName: state.user.displayName,
            role: state.user.getIdTokenResult ? undefined : undefined, // Will be fetched fresh
            status: state.user.getIdTokenResult ? undefined : undefined, // Will be fetched fresh
          };
          return { user: persistedData };
        }
        return { user: null };
      },
      // Add version to force store updates and clear old insecure data
      version: 2,
    }
  )
);

export default useAuthStore;
