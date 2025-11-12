'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { fetchNotifications, markNotificationsRead, deleteNotifications, cleanupOldNotifications, NotificationItem } from '@/services/notificationsApi'

interface NotificationsContextValue {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  refreshNotifications: () => Promise<void>
  markAsRead: (ids: string[]) => Promise<void>
  deleteNotifications: (ids: string[]) => Promise<void>
  cleanupOldNotifications: (days?: number) => Promise<number>
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

interface NotificationsProviderProps {
  children: React.ReactNode
}

const NOTIFICATION_SERVICE_URL = 'https://claims-notifications.onrender.com'

// Play notification sound - use shared audio context if available
const playNotificationSound = async (
  audioContextRef?: MutableRefObject<AudioContext | null>,
  userInteractedRef?: MutableRefObject<boolean>
) => {
  const playWithWebAudio = async (audioContext: AudioContext) => {
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume()
      } catch (resumeError) {
        console.debug('AudioContext resume blocked:', resumeError)
      }
    }

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  }

  try {
    if (audioContextRef) {
      if (!audioContextRef.current) {
        if (userInteractedRef?.current) {
          const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
          if (AudioContextCtor) {
            try {
              audioContextRef.current = new AudioContextCtor()
            } catch (creationError) {
              console.debug('Failed to create AudioContext after interaction:', creationError)
            }
          }
        } else {
          console.debug('Audio context not ready yet (waiting for user interaction). Skipping sound.')
          playHTML5Sound()
          return
        }
      }

      if (audioContextRef.current) {
        await playWithWebAudio(audioContextRef.current)
        return
      }
    }
  } catch (error) {
    console.debug('Web Audio API failed, trying fallback:', error)
  }

  playHTML5Sound()
}

// HTML5 Audio fallback
const playHTML5Sound = () => {
  try {
    // Create a simple beep using Web Audio API with a data URL
    const audio = new Audio()
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUhAMT6Tj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUxh9Hz04IzBh5uwO/jmVIQDE+k4/C2YxwGOJHX8sx5LAUkd8fw3ZBAC'
    audio.volume = 0.3
    audio.play().catch((e) => {
      console.debug('Audio play failed (may be blocked by browser):', e)
    })
  } catch (e) {
    console.debug('HTML5 Audio not available:', e)
  }
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { user, token } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const previousUnreadCountRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const userInteractedRef = useRef(false)
  
  // Initialize audio context only after explicit user interaction (required by browser autoplay policies)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const initAudioContext = () => {
      userInteractedRef.current = true

      if (!audioContextRef.current) {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextCtor) {
          console.debug('AudioContext API not available in this browser')
          return
        }

        try {
          audioContextRef.current = new AudioContextCtor()
        } catch (error) {
          console.debug('Failed to create AudioContext on interaction:', error)
        }
      }

      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch((error) => {
          console.debug('AudioContext resume blocked after interaction:', error)
        })
      }
    }

    const interactionEvents: Array<keyof WindowEventMap> = ['pointerdown', 'click', 'touchstart', 'keydown']
    interactionEvents.forEach((event) => {
      window.addEventListener(event, initAudioContext, { once: true })
    })

    return () => {
      interactionEvents.forEach((event) => {
        window.removeEventListener(event, initAudioContext)
      })
    }
  }, [])

  const calculateUnread = useCallback((items: NotificationItem[]) => {
    return items.reduce((count, item) => (item.read ? count : count + 1), 0)
  }, [])

  const refreshNotifications = useCallback(async () => {
    if (!user || !token) {
      setNotifications([])
      setUnreadCount(0)
      previousUnreadCountRef.current = 0
      return
    }

    try {
      setIsLoading(true)
      const data = await fetchNotifications()
      const newUnreadCount = calculateUnread(data)
      
      // Check if unread count increased (new notification)
      if (newUnreadCount > previousUnreadCountRef.current && previousUnreadCountRef.current > 0) {
        playNotificationSound(audioContextRef, userInteractedRef).catch((err) => {
          console.debug('Sound playback failed:', err)
        })
        setHasNewNotification(true)
        setTimeout(() => setHasNewNotification(false), 3000)
      }
      
      setNotifications(data)
      setUnreadCount(newUnreadCount)
      previousUnreadCountRef.current = newUnreadCount
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      // Don't show error toast - just log it silently
      // The empty state will show "No notifications yet"
      setNotifications([])
      setUnreadCount(0)
      previousUnreadCountRef.current = 0
    } finally {
      setIsLoading(false)
    }
  }, [user, token, calculateUnread])

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!user || !token) {
      disconnectSocket()
      setNotifications([])
      setUnreadCount(0)
      return
    }

    // Initial fetch only when user/token changes
    refreshNotifications()

    console.log('[Notifications] Initializing socket connection to:', NOTIFICATION_SERVICE_URL)
    console.log('[Notifications] User ID:', user.uid, 'Role:', user.role)
    
    const socket = io(NOTIFICATION_SERVICE_URL, {
      transports: ['websocket'],
      auth: {
        token,
      },
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => {
      console.log('[Notifications] Socket connected! Socket ID:', socket.id)
      console.log('[Notifications] Joining user room with:', {
        user_id: user.uid,
        user_role: user.role,
      })
      socket.emit('join_user_room', {
        user_id: user.uid,
        user_role: user.role,
      })
      
      // Confirm room join with a callback
      socket.on('room_joined', (data: any) => {
        console.log('[Notifications] ✅ Room joined confirmation:', data)
      })
    })
    
    // Set up polling fallback in case socket doesn't receive events
    // Poll every 30 seconds for new notifications
    const pollInterval = setInterval(() => {
      console.log('[Notifications] 🔄 Polling for new notifications...')
      refreshNotifications().catch((err) => {
        console.debug('[Notifications] Poll failed:', err)
      })
    }, 30000) // 30 seconds

    socket.on('notification', async (payload: any) => {
      console.log('[Notifications] 🔔 Received notification event:', payload)
      
      // Play notification sound immediately
      playNotificationSound(audioContextRef, userInteractedRef).catch((err) => {
        console.debug('Sound playback failed:', err)
      })
      
      // Show toast notification
      toast.info(payload.title || 'New notification', {
        description: payload.message || '',
        duration: 5000,
      })
      
      // Set flag for visual indicator
      setHasNewNotification(true)
      setTimeout(() => setHasNewNotification(false), 3000) // Clear after 3 seconds
      
      // Update unread count immediately (optimistic update)
      setUnreadCount(prev => {
        const newCount = prev + 1
        console.log('[Notifications] Updated unread count:', prev, '→', newCount)
        return newCount
      })
      
      // Refresh notifications to get full data (but don't wait for it)
      console.log('[Notifications] Refreshing notifications list...')
      refreshNotifications().catch(err => {
        console.error('Failed to refresh notifications:', err)
        // Revert optimistic update on error
        setUnreadCount(prev => Math.max(0, prev - 1))
      })
    })

    socket.on('connect_error', (error) => {
      console.error('[Notifications] ❌ Socket connection error:', error.message)
    })

    socket.on('disconnect', (reason) => {
      console.warn('[Notifications] 🔌 Socket disconnected:', reason)
    })
    
    socket.on('error', (error) => {
      console.error('[Notifications] ❌ Socket error:', error)
    })

    socketRef.current = socket

    return () => {
      clearInterval(pollInterval)
      disconnectSocket()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, token]) // Only depend on user.uid and token, not the whole user object or callbacks

  const markAsRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return

      try {
        await markNotificationsRead(ids)
        setNotifications((prev) => {
          const updated = prev.map((notification) =>
            ids.includes(notification.id) ? { ...notification, read: true } : notification
          )
          setUnreadCount(calculateUnread(updated))
          return updated
        })
      } catch (error) {
        console.error('Failed to mark notifications as read:', error)
        throw error
      }
    },
    [calculateUnread]
  )

  const handleDeleteNotifications = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return

      try {
        await deleteNotifications(ids)
        // Remove deleted notifications from state
        setNotifications((prev) => {
          const updated = prev.filter((notification) => !ids.includes(notification.id))
          setUnreadCount(calculateUnread(updated))
          return updated
        })
      } catch (error) {
        console.error('Failed to delete notifications:', error)
        throw error
      }
    },
    [calculateUnread]
  )

  const handleCleanupOldNotifications = useCallback(
    async (days: number = 30) => {
      try {
        const result = await cleanupOldNotifications(days)
        // Refresh notifications to get updated list
        await refreshNotifications()
        return result.deleted_count
      } catch (error) {
        console.error('Failed to cleanup old notifications:', error)
        throw error
      }
    },
    [refreshNotifications]
  )

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    deleteNotifications: handleDeleteNotifications,
    cleanupOldNotifications: handleCleanupOldNotifications,
  }

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}

