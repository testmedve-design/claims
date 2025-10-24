'use client'

import { useState, useCallback, Suspense } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import PublicRoute from '@/components/auth/PublicRoute'

function LoginPageContent() {
  const { login, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      toast.error('Please enter both email and password')
      return
    }
    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      await login({
        email: formData.email,
        password: formData.password
      })
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      {/* Main login card */}
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-4 text-center pb-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 flex items-center justify-center">
              <Image
                src="/assets/logo.svg"
                alt="Medverve Logo"
                width={64}
                height={64}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-foreground">
              Medverve Admin
            </CardTitle>
            <CardDescription className="text-sm">
              Sign in to access the admin portal
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pb-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="h-10"
                disabled={isLoading}
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="h-10 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Login button */}
            <Button
              type="submit"
              className="w-full h-10"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PublicRoute>
        <LoginPageContent />
      </PublicRoute>
    </Suspense>
  )
}