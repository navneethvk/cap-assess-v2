import { useState, useEffect, useCallback } from 'react';
import { useUserData } from './useUserData';
import { updateDocument } from '@/firebase/firestoreService';
import { notify } from '@/utils/notify';
import useAuthStore from '@/store/authStore';

interface UserDoc {
  uid: string;
  email: string;
  username?: string;
  role: string;
  pinnedVisits?: string[]; // Array of visit IDs
}

export const useUserPinnedVisits = () => {
  const { user } = useAuthStore();
  const [pinnedVisits, setPinnedVisits] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current user data to get pinned visits
  const { data: currentUser, mutate: mutateUser } = useUserData<UserDoc>(user?.uid || '');

  // Update local state when user data changes
  useEffect(() => {
    // Debug logging (disabled)
    // console.log('useUserPinnedVisits: user:', user?.uid);
    // console.log('useUserPinnedVisits: currentUser found:', !!currentUser);
    // console.log('useUserPinnedVisits: pinnedVisits:', currentUser?.pinnedVisits);
    
    if (currentUser) {
      setPinnedVisits(currentUser.pinnedVisits || []);
    } else {
      setPinnedVisits([]);
    }
  }, [user, currentUser]);

  // Toggle pin status for a visit
  const togglePin = useCallback(async (visitId: string) => {
    if (!user) {
      notify.error('You must be logged in to pin notes');
      return;
    }

    setIsLoading(true);
    try {
      const isCurrentlyPinned = pinnedVisits.includes(visitId);
      const newPinnedVisits = isCurrentlyPinned
        ? pinnedVisits.filter(id => id !== visitId)
        : [...pinnedVisits, visitId];

      // Update user document in Firestore
      await updateDocument('users', user.uid, { 
        pinnedVisits: newPinnedVisits 
      });

      // Update local state
      setPinnedVisits(newPinnedVisits);
      
      // Refresh user data
      await mutateUser();

      notify.success(isCurrentlyPinned ? 'Note unpinned' : 'Note pinned');
    } catch (error) {
      console.error('Error toggling pin:', error);
      notify.error('Failed to update pin status');
    } finally {
      setIsLoading(false);
    }
  }, [user, pinnedVisits, mutateUser]);

  return {
    pinnedVisits,
    togglePin,
    isLoading
  };
};
