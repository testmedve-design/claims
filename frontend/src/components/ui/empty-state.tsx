'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-6 rounded-full bg-muted/30 p-6 animate-fade-in">
          <Icon className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground max-w-md mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {description}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="animate-fade-in"
          style={{ animationDelay: '0.3s' }}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

interface EmptySearchResultsProps {
  searchQuery: string
  onClearSearch?: () => void
}

export function EmptySearchResults({ searchQuery, onClearSearch }: EmptySearchResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 text-6xl opacity-50">🔍</div>
      <h3 className="text-lg font-semibold mb-2">No results found</h3>
      <p className="text-muted-foreground mb-4">
        We couldn&apos;t find any results for &quot;<span className="font-medium">{searchQuery}</span>&quot;
      </p>
      {onClearSearch && (
        <Button variant="outline" onClick={onClearSearch}>
          Clear search
        </Button>
      )}
    </div>
  )
}
