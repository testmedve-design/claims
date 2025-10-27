'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import { canAccessRoute, getDefaultPageForRole, isAllowedRole, isBlockedRole } from '@/lib/routes';

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

    // Check if user is blocked
    if (user && isBlockedRole(user.role)) {
      console.error('Access denied: Blocked role detected:', user.role);
      router.push('/login');
      return;
    }

    // Check if route-specific allowedRoles are provided
    if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
      // Redirect to role's default page
      const defaultPage = getDefaultPageForRole(user.role as any);
      router.push(defaultPage);
      return;
    }

    // Check centralized route access control
    if (user && isAllowedRole(user.role)) {
      const canAccess = canAccessRoute(user.role as any, pathname);
      if (!canAccess) {
        // User doesn't have access to this route - redirect to their default page
        const defaultPage = getDefaultPageForRole(user.role as any);
        router.push(defaultPage);
        return;
      }
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

  // If user is blocked, don't render anything
  if (user && isBlockedRole(user.role)) {
    return <LoadingScreen />;
  }

  // If role not allowed (for route-specific checks)
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <LoadingScreen />;
  }

  // If user doesn't have access to this route (centralized check)
  if (user && isAllowedRole(user.role) && !canAccessRoute(user.role as any, pathname)) {
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