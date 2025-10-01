import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import useAuthStore from '../store/authStore';
import { usePermissionsStore } from '../store/permissionsStore';

interface RequireAuthProps {
  children?: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, loading } = useAuthStore();
  const { setUser } = usePermissionsStore();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      console.log("RequireAuth: User changed", user);
      if (user) {
        try {
          // Force refresh the ID token to get the latest custom claims
          const idTokenResult = await user.getIdTokenResult(true);
          const role = idTokenResult.claims.role as string;
          setUserRole(role);
          console.log("RequireAuth: User role fetched:", role);
        } catch (error) {
          console.error("RequireAuth: Error fetching user role:", error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setCheckingRole(false);
      console.log("RequireAuth: checkingRole set to false");
    };

    checkUserRole();
  }, [user]);

  console.log("RequireAuth: Render - user:", user, "userRole:", userRole, "checkingRole:", checkingRole);

  if (loading || checkingRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4 text-lg">Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />; // Redirect to login if not authenticated
  }

  if (userRole === "Pending") {
    return <Navigate to="/awaiting-review" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RequireAuth;
