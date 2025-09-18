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
      partialize: (state) => ({
        user: state.user,
      }),
      // Add version to force store updates
      version: 1,
    }
  )
);

export default useAuthStore;
