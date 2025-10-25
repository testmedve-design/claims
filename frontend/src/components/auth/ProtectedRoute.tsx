'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  redirectTo = '/login',
  allowedRoles = []
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      // Store the intended destination for after login
      const returnUrl = pathname !== redirectTo ? pathname : '/';
      router.push(`${redirectTo}?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // If authenticated but role not allowed
    if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate default page based on role
      const defaultPaths: Record<string, string> = {
        rm: '/',
        rp: '/',
        employee: '/claims',
        hospital_admin: '/'
      };

      router.push(defaultPaths[user.role] || '/');
      return;
    }
  }, [isAuthenticated, isLoading, user, router, pathname, redirectTo, allowedRoles]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not authenticated, don't render anything (redirect will happen)
  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  // If role not allowed, don't render anything (redirect will happen)
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <LoadingScreen />;
  }

  // If authenticated and authorized, render children
  return <>{children}</>;
}

// Higher-order component for page-level protection
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  const ProtectedComponent = (props: P) => (
    <ProtectedRoute {...options}>
      <WrappedComponent {...props} />
    </ProtectedRoute>
  );

  ProtectedComponent.displayName = `withProtectedRoute(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ProtectedComponent;
}