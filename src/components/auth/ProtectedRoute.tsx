import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoggedIn, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <img src="/images/logo_login.png" alt="Loading" className="w-48 h-auto mx-auto mb-4" />
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based route guard
  const path = location.pathname;
  const role = user?.role || 'user';

  // Define allowed routes per role
  const roleAllowed = (r: string, p: string): boolean => {
    if (r === 'admin') {
      // Admin can access all routes
      return true;
    }
    if (r === 'staff') {
      // Staff can access specific routes
      return [
        '/dashboard',
        '/borrow',
        '/return-equipment',
        '/history',
        '/borrow-requests',
        '/equipment',
        '/most-borrowed-equipment',
        '/most-damaged-equipment'
      ].includes(p);
    }
    // Regular user can only access these routes
    return ['/borrow', '/history', '/my-requests'].includes(p);
  };

  // Check if user has permission to access this route
  if (!roleAllowed(role, path)) {
    // Redirect to appropriate default page based on role
    const defaultPath = role === 'user' ? '/borrow' : '/dashboard';
    return <Navigate to={defaultPath} replace />;
  }

  return <>{children}</>;
};
