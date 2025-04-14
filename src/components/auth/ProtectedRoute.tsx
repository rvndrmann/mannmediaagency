import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user'; // Assuming useUser hook is here

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useUser();

  if (isLoading) {
    // Optional: Replace with a more sophisticated loading spinner/component
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    // User not logged in, redirect to login page
    // Pass the current location to redirect back after login (optional)
    return <Navigate to="/auth/login" replace />;
  }

  // User is logged in, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
