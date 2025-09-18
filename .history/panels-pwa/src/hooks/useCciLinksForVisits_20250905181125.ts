import { useFirestoreCollection } from './useFirestoreCollection';
import { useUserCciLinks } from './useUserCciLinks';
import useAuthStore from '../store/authStore';
import { useState, useEffect } from 'react';

interface CciUserLink {
  id: string;
  cci_id: string[];
}

export const useCciLinksForVisits = () => {
  const { user } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true);
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

  // For admins, fetch all CCI links
  const { data: allLinks, isLoading: isLoadingAllLinks, error: allLinksError } = useFirestoreCollection<CciUserLink>('cci_user_links');
  
  // For non-admins, fetch only their own CCI links
  const { data: currentUserLinks, isLoading: isLoadingCurrentUserLinks, error: currentUserLinksError } = useUserCciLinks<CciUserLink>(user?.uid || '');

  if (isAdmin) {
    return {
      data: allLinks || [],
      isLoading: isLoadingAllLinks,
      error: allLinksError,
    };
  } else {
    return {
      data: currentUserLinks ? [currentUserLinks] : [],
      isLoading: isLoadingCurrentUserLinks,
      error: currentUserLinksError,
    };
  }
};
