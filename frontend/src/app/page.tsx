'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingScreen from '@/components/LoadingScreen'

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Redirect based on user role
        if (user?.role === 'claim_processor' || user?.role === 'claim_processor_l4') {
          router.push('/processor-inbox')
        } else {
          router.push('/claims')
        }
      } else {
        router.push('/login')
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  return <LoadingScreen />
}