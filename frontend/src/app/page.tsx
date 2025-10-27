'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingScreen from '@/components/LoadingScreen'
import { getDefaultPageForRole, isAllowedRole } from '@/lib/routes'

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Use centralized routing configuration
        if (user?.role && isAllowedRole(user.role)) {
          const defaultPage = getDefaultPageForRole(user.role)
          router.push(defaultPage)
        } else {
          // Blocked role or unknown role - redirect to login
          router.push('/login')
        }
      } else {
        router.push('/login')
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  return <LoadingScreen />
}