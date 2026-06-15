import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RouteGuard = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Checking credentials session...</p>
        </div>
      </div>
    );
  }

  // 1) Redirect to login screen if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2) Verify role-based authorization restrictions
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Falls back to dashboard home if unauthorized
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RouteGuard;
