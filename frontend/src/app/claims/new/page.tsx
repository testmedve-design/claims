'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/LoadingScreen'

export default function NewClaimPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main claims form page
    router.push('/claims')
  }, [router])

  return <LoadingScreen />
}
