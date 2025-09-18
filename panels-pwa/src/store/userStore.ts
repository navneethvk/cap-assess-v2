import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  profile: {
    displayName: string | null;
    email: string | null;
    uid: string | null;
  };
  setProfile: (profile: UserState['profile']) => void;
}

const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: {
        displayName: null,
        email: null,
        uid: null,
      },
      setProfile: (profile) => set({ profile }),
    }),
    {
      name: 'user-storage',
      merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...(persistedState || {}),
        }),
    }
  )
);

export default useUserStore;
