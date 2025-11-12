'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useNotifications } from '@/contexts/NotificationsContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'

export default function NotificationsPage() {
  const { notifications, isLoading, markAsRead, refreshNotifications, unreadCount, deleteNotifications, cleanupOldNotifications } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Only refresh on mount, not on every refreshNotifications change
  useEffect(() => {
    refreshNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - only run once on mount

  const unreadIds = useMemo(
    () => notifications.filter((notification) => !notification.read).map((notification) => notification.id),
    [notifications]
  )

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((notification) => !notification.read)
    }
    return notifications
  }, [notifications, filter])

  const readNotifications = useMemo(
    () => notifications.filter((notification) => notification.read),
    [notifications]
  )

  const handleMarkAllAsRead = async () => {
    if (unreadIds.length > 0) {
      try {
        await markAsRead(unreadIds)
      } catch (error) {
        console.error('Failed to mark notifications as read', error)
      }
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead([notificationId])
    } catch (error) {
      console.error('Failed to mark notification as read', error)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    if (confirm('Are you sure you want to delete this notification?')) {
      try {
        await deleteNotifications([notificationId])
      } catch (error) {
        console.error('Failed to delete notification', error)
        alert('Failed to delete notification')
      }
    }
  }

  const handleCleanupOld = async () => {
    const days = prompt('Delete read notifications older than how many days? (default: 1)', '1')
    if (days) {
      const daysNum = parseInt(days, 10)
      if (isNaN(daysNum) || daysNum < 1) {
        alert('Please enter a valid number of days')
        return
      }
      
      if (confirm(`This will delete all read notifications older than ${daysNum} day(s). Continue?`)) {
        try {
          const deletedCount = await cleanupOldNotifications(daysNum)
          alert(`Deleted ${deletedCount} old notification(s)`)
          await refreshNotifications()
        } catch (error) {
          console.error('Failed to cleanup old notifications', error)
          alert('Failed to cleanup old notifications')
        }
      }
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)))
    }
  }

  const handleToggleSelect = (notificationId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId)
    } else {
      newSelected.add(notificationId)
    }
    setSelectedIds(newSelected)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one notification to delete')
      return
    }

    if (confirm(`Are you sure you want to delete ${selectedIds.size} notification(s)?`)) {
      try {
        await deleteNotifications(Array.from(selectedIds))
        setSelectedIds(new Set())
        await refreshNotifications()
      } catch (error) {
        console.error('Failed to delete notifications', error)
        alert('Failed to delete notifications')
      }
    }
  }

  const renderEmptyState = () => (
    <Card className="p-10 flex flex-col items-center justify-center text-center border-dashed">
      <div className="text-2xl font-semibold mb-2">No notifications yet</div>
      <p className="text-muted-foreground max-w-md">
        You&apos;ll see updates here whenever there is activity on your claims.
      </p>
    </Card>
  )

  const renderNotification = (notification: (typeof notifications)[number]) => {
    const metadata = (notification.metadata ?? {}) as Record<string, unknown>
    const metadataStatus = typeof metadata.status === 'string' ? metadata.status : undefined
    const remarks = typeof metadata.remarks === 'string' ? metadata.remarks : undefined
    const triggeredBy = notification.triggered_by as Record<string, unknown> | undefined
    const actorName = typeof triggeredBy?.actor_name === 'string' ? String(triggeredBy.actor_name) : undefined

    const timeAgo = notification.created_at
      ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
      : null

    const status = notification.status || metadataStatus
    const isSelected = selectedIds.has(notification.id)

    return (
      <Card
        key={notification.id}
        className={`p-5 transition border ${notification.read ? 'bg-background' : 'bg-primary/5 border-primary/20'} ${isSelected ? 'ring-2 ring-primary' : ''}`}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => handleToggleSelect(notification.id)}
              className="mt-1"
            />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground">
                  {notification.title || 'Claim update'}
                </h2>
                {!notification.read && <Badge variant="default">New</Badge>}
                {status && <Badge variant="outline">{status}</Badge>}
                {notification.claim_id && (
                  <Badge variant="secondary">Claim {notification.claim_id}</Badge>
                )}
              </div>

            {notification.message && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {notification.message}
              </p>
            )}

            {remarks && (
              <div className="bg-muted/60 border border-border/50 rounded-lg p-3 text-sm text-foreground">
                <span className="font-medium text-muted-foreground">Remarks:</span>{' '}
                {remarks}
              </div>
            )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {actorName && (
                  <span>
                    By <span className="font-medium text-foreground">{actorName}</span>
                  </span>
                )}
                {timeAgo && <span>• {timeAgo}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 md:mt-0">
            {!notification.read && (
              <Button
                onClick={() => handleMarkAsRead(notification.id)}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                Mark as read
              </Button>
            )}
            <Button
              onClick={() => handleDeleteNotification(notification.id)}
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
            >
              Delete
            </Button>
            {notification.claim_id && (
              <Link href={`/claims/${notification.claim_id}`}>
                <Button variant="outline" size="sm">
                  View claim
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const handleHideRead = () => {
    // Switch to unread filter to hide read notifications
    setFilter('unread')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay on top of claim updates, processor requests, and hospital responses in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button onClick={handleDeleteSelected} variant="destructive" size="sm">
              Delete selected ({selectedIds.size})
            </Button>
          )}
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
              Mark all as read ({unreadCount})
            </Button>
          )}
          {readNotifications.length > 0 && filter === 'all' && (
            <Button onClick={handleHideRead} variant="ghost" size="sm" className="text-muted-foreground">
              Hide read ({readNotifications.length})
            </Button>
          )}
          {readNotifications.length > 0 && (
            <Button 
              onClick={handleCleanupOld} 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground"
              title="Delete read notifications older than 1 day (default)"
            >
              Auto-delete old (1 day)
            </Button>
          )}
        </div>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unread')} className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && !notifications.length ? (
        <Card className="p-10 flex items-center justify-center text-muted-foreground">
          Loading notifications…
        </Card>
      ) : filteredNotifications.length === 0 ? (
        filter === 'unread' ? (
          <Card className="p-10 flex flex-col items-center justify-center text-center border-dashed">
            <div className="text-2xl font-semibold mb-2">No unread notifications</div>
            <p className="text-muted-foreground max-w-md">
              You&apos;re all caught up! Switch to &quot;All&quot; to see your notification history.
            </p>
          </Card>
        ) : (
          renderEmptyState()
        )
      ) : (
        <div className="space-y-4">
          {filteredNotifications.length > 0 && (
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({filteredNotifications.length})
              </span>
            </div>
          )}
          {filteredNotifications.map((notification) => renderNotification(notification))}
        </div>
      )}
    </div>
  )
}

