'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import LoadingScreen from './LoadingScreen'

interface GlobalLoadingProviderProps {
  children: React.ReactNode
}

export default function GlobalLoadingProvider({ children }: GlobalLoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Show loading immediately when route starts changing
    setIsLoading(true)

    // Hide loading after a brief delay to show the transition
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 400) // Slightly shorter for quicker feel

    return () => {
      clearTimeout(timer)
      setIsLoading(false)
    }
  }, [pathname])

  // Also handle initial page load
  useEffect(() => {
    setIsLoading(false)
  }, [])

  return (
    <>
      {isLoading && (
        <LoadingScreen isLoading={true} />
      )}
      {children}
    </>
  )
}