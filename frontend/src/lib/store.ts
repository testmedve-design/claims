'use client'

import { create } from 'zustand'
import authService from '@/services/auth'
import type { User } from '@/types/auth'

interface AuthStore {
  user: User | null
  role: string | null
  isInitialized: boolean
  initialize: () => void
  setUser: (user: User | null) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  role: null,
  isInitialized: false,
  
  initialize: () => {
    if (typeof window === 'undefined') return
    
    try {
      const currentUser = authService.getCurrentUser()
      const role = currentUser?.role || null
      
      set({
        user: currentUser,
        role,
        isInitialized: true
      })
    } catch (error) {
      console.error('Failed to initialize auth store:', error)
      set({
        user: null,
        role: null,
        isInitialized: true
      })
    }
  },
  
  setUser: (user) => {
    set({
      user,
      role: user?.role || null
    })
  },
  
  clearUser: () => {
    set({
      user: null,
      role: null
    })
  }
}))

