import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const router = useRouter();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const requiredRoleKey = requiredRole?.join('|') || '';

  useEffect(() => {
    if (!auth.isInitialized) return;

    const allowedRoles = requiredRoleKey ? requiredRoleKey.split('|') : [];

    if (!auth.isAuthenticated) {
      router.push('/auth/login');
    } else if (
      allowedRoles.length > 0 &&
      auth.user?.role &&
      !allowedRoles.includes(auth.user.role)
    ) {
      router.push('/dashboard');
    } else {
      setIsLoading(false);
    }
  }, [auth.isInitialized, auth.isAuthenticated, auth.user?.role, requiredRoleKey, router]);

  if (!auth.isInitialized || isLoading || !auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
