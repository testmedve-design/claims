import { API_BASE_URL } from '@/lib/apiConfig'

export interface NotificationItem {
  id: string
  claim_id?: string
  event_type?: string
  title?: string
  message?: string
  metadata?: Record<string, unknown>
  status?: string
  triggered_by?: Record<string, unknown>
  delivery_success?: boolean
  created_at?: string
  updated_at?: string
  read: boolean
}

interface NotificationsResponse {
  success: boolean
  notifications: NotificationItem[]
}

export async function fetchNotifications(unreadOnly = false): Promise<NotificationItem[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  if (!token) {
    throw new Error('Authentication token not found')
  }

  const params = new URLSearchParams()
  if (unreadOnly) {
    params.set('unread', 'true')
  }

  const url = `${API_BASE_URL}/notifications${params.toString() ? `?${params.toString()}` : ''}`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Notifications API error (${response.status}):`, errorText)
      throw new Error(errorText || `Failed to fetch notifications: ${response.status} ${response.statusText}`)
    }

    const data: NotificationsResponse = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch notifications')
    }

    return data.notifications
  } catch (error) {
    // Log the full error for debugging
    console.error('Fetch notifications error:', error)
    console.error('URL attempted:', url)
    console.error('API_BASE_URL:', API_BASE_URL)
    throw error
  }
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (!notificationIds.length) return

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  if (!token) {
    throw new Error('Authentication token not found')
  }

  const response = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notification_ids: notificationIds }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Failed to mark notifications as read')
  }
}

export async function deleteNotifications(notificationIds: string[]): Promise<{ deleted_count: number }> {
  if (!notificationIds.length) {
    return { deleted_count: 0 }
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  if (!token) {
    throw new Error('Authentication token not found')
  }

  const response = await fetch(`${API_BASE_URL}/notifications/delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notification_ids: notificationIds }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Failed to delete notifications')
  }

  const data = await response.json()
  return { deleted_count: data.deleted_count || 0 }
}

export async function cleanupOldNotifications(days: number = 1): Promise<{ deleted_count: number }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  if (!token) {
    throw new Error('Authentication token not found')
  }

  const response = await fetch(`${API_BASE_URL}/notifications/cleanup-old`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ days }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Failed to cleanup old notifications')
  }

  const data = await response.json()
  return { deleted_count: data.deleted_count || 0 }
}

