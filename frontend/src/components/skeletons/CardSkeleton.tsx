import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function CardSkeleton() {
  return (
    <Card className="glass-card border-0 shadow-none">
      <CardContent className="p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[120px]" shimmer />
            <Skeleton className="h-8 w-[80px]" shimmer />
            <Skeleton className="h-3 w-[100px]" shimmer />
          </div>
          <Skeleton className="h-16 w-16 rounded-xl" shimmer />
        </div>
      </CardContent>
    </Card>
  )
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function DetailCardSkeleton() {
  return (
    <Card className="glass-card border-0 shadow-none">
      <CardHeader>
        <Skeleton className="h-6 w-[200px] mb-2" shimmer />
        <Skeleton className="h-4 w-[300px]" shimmer />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-[120px]" shimmer />
            <Skeleton className="h-4 w-[180px]" shimmer />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
