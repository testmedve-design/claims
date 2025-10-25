"use client"

import { Loader2 } from 'lucide-react'

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Loading...</h2>
          <p className="text-muted-foreground">Please wait while we prepare your application</p>
        </div>
      </div>
    </div>
  )
}