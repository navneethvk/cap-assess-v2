import { useFirestoreCollection } from './useFirestoreCollection';
import { useUserData } from './useUserData';
import useAuthStore from '../store/authStore';
import { useState, useEffect } from 'react';
import type { UserDoc } from '@/types/firestore';

interface User {
  uid: string;
  email: string;
  username?: string;
  role: string;
}

export const useUsersForVisits = () => {
  const { user } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult();
          const role = idTokenResult.claims.role as string;
          setIsAdmin(role === 'Admin');
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // For admins, fetch all users
  const { data: allUsers, isLoading: isLoadingAllUsers, error: allUsersError } = useFirestoreCollection<UserDoc>('users');
  
  // For non-admins, fetch only their own user data
  const { data: currentUser, isLoading: isLoadingCurrentUser, error: currentUserError } = useUserData<User>(user?.uid || '');

  if (isAdmin) {
    return {
      data: allUsers || [],
      isLoading: isLoadingAllUsers,
      error: allUsersError,
    };
  } else {
    return {
      data: currentUser ? [currentUser] : [],
      isLoading: isLoadingCurrentUser,
      error: currentUserError,
    };
  }
};
