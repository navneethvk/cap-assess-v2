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
