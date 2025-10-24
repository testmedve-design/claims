'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import BreadcrumbNavigation from './Breadcrumb'
import { CommandPalette } from '@/components/CommandPalette'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { GlobalConfirmDialog } from '@/components/ui/confirm-dialog'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true) // Default to open on desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // New state for collapsed sidebar
  const [isMobile, setIsMobile] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load persisted sidebar state on mount
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('sidebarCollapsed')
    if (savedCollapsedState !== null) {
      setSidebarCollapsed(savedCollapsedState === 'true')
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false) // Close sidebar on mobile by default
      } else {
        setSidebarOpen(true) // Open sidebar on desktop by default
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleSidebar = () => {
    if (isMobile) {
      // On mobile, toggle open/close
      setSidebarOpen(!sidebarOpen)
    } else {
      // On desktop, toggle collapsed/expanded
      const newCollapsedState = !sidebarCollapsed
      setSidebarCollapsed(newCollapsedState)
      // Persist to localStorage
      localStorage.setItem('sidebarCollapsed', String(newCollapsedState))
    }
  }

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={closeSidebar}
          onToggle={toggleSidebar}
          isMobile={isMobile}
        />

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />

        {/* Global Confirm Dialog */}
        <GlobalConfirmDialog />

        {/* Main Content */}
        <main
          className={`transition-all duration-300 ease-in-out bg-muted/30 min-h-screen ${
            isMobile
              ? 'ml-0'
              : sidebarCollapsed
                ? 'lg:ml-16'
                : 'lg:ml-64'
          }`}
        >
          <div className="p-6">
            {/* Breadcrumb */}
            <div className="mb-4">
              <BreadcrumbNavigation />
            </div>

            {/* Page Content */}
            <div className="bg-white dark:bg-gray-950 rounded-lg shadow-none border border-border p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}