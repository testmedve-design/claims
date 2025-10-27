'use client';

import React, { ReactNode, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

interface PublicRouteProps {
  children: ReactNode;
  redirectIfAuthenticated?: boolean;
  redirectTo?: string;
}

function PublicRouteContent({
  children,
  redirectIfAuthenticated = true,
  redirectTo
}: PublicRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // If authenticated and should redirect
    if (isAuthenticated && redirectIfAuthenticated) {
      // Check for return URL from query params
      const returnUrl = searchParams.get('returnUrl');

      let destination = redirectTo;

      if (!destination && user) {
        // Use centralized routing configuration
        const { getDefaultPageForRole, isAllowedRole } = require('@/lib/routes');
        if (isAllowedRole(user.role)) {
          destination = getDefaultPageForRole(user.role as any);
        } else {
          destination = '/login';
        }
      }

      // Use return URL if available and valid
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.includes('/login')) {
        destination = returnUrl;
      }

      router.push(destination || '/');
      return;
    }
  }, [isAuthenticated, isLoading, user, router, searchParams, redirectIfAuthenticated, redirectTo]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If authenticated and should redirect, don't render anything (redirect will happen)
  if (isAuthenticated && redirectIfAuthenticated) {
    return <LoadingScreen />;
  }

  // If not authenticated or should not redirect, render children
  return <>{children}</>;
}

export default function PublicRoute(props: PublicRouteProps) {
  return (
    <Suspense fallback={<LoadingScreen isLoading={true} />}>
      <PublicRouteContent {...props} />
    </Suspense>
  );
}