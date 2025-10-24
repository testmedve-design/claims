import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface CardSkeletonProps {
  showHeader?: boolean
  lines?: number
  className?: string
}

export function CardSkeleton({
  showHeader = true,
  lines = 3,
  className
}: CardSkeletonProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-1/3" shimmer />
          <Skeleton className="h-4 w-2/3 mt-2" shimmer />
        </CardHeader>
      )}
      <CardContent className={showHeader ? "" : "pt-6"}>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4 w-full"
              shimmer
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface StatsCardSkeletonProps {
  count?: number
}

export function StatsCardSkeleton({ count = 4 }: StatsCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" shimmer />
            <Skeleton className="h-4 w-4 rounded" shimmer />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" shimmer />
          </CardContent>
        </Card>
      ))}
    </>
  )
}
