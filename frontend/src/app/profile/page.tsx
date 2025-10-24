'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Shield,
  Edit3,
  Save,
  X,
  Camera,
  Settings,
  Bell,
  Lock,
  Briefcase,
  ArrowLeft,
  Users
} from 'lucide-react'

function ProfilePageContent() {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Editable profile data
  const [editedProfile, setEditedProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    bio: ''
  })

  useEffect(() => {
    setIsMounted(true)
    if (user) {
      setEditedProfile({
        displayName: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: '' // Bio not in current user type, but keeping for future extension
      })
    }
  }, [user])

  const handleEdit = () => {
    if (user) {
      setEditedProfile({
        displayName: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: ''
      })
      setIsEditing(true)
    }
  }

  const handleCancel = () => {
    if (user) {
      setEditedProfile({
        displayName: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: ''
      })
      setIsEditing(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // In a real app, you would call an API to update the profile
      // For now, we'll just simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Refresh profile data from server
      await refreshProfile()

      setIsEditing(false)
      toast.success('Profile Updated', {
        description: 'Your profile information has been successfully updated.'
      })
    } catch {
      toast.error('Update Failed', {
        description: 'There was an error updating your profile. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof editedProfile, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getUserInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getUserName = () => {
    return user?.name || user?.email?.split('@')[0] || 'User'
  }

  const getRoleBadge = () => {
    const role = user?.role || 'user'
    const roleLabels = {
      'hospital_admin': 'Hospital Administrator',
      'rm': 'Relationship Manager',
      'rp': 'Reimbursement Provider',
      'employee': 'Employee'
    }
    return roleLabels[role as keyof typeof roleLabels] || role.replace('_', ' ').toUpperCase()
  }

  const getRoleIcon = () => {
    const role = user?.role
    switch (role) {
      case 'hospital_admin':
        return <Building2 size={12} className="mr-1" />
      case 'rm':
      case 'rp':
        return <Shield size={12} className="mr-1" />
      case 'employee':
        return <User size={12} className="mr-1" />
      default:
        return <Shield size={12} className="mr-1" />
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8"
            title="Go back"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account information and preferences</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <Edit3 size={16} />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <X size={16} />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <Avatar className="w-24 h-24">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <button className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-full shadow-sm hover:bg-primary/90 transition-colors">
                  <Camera size={14} />
                </button>
              )}
            </div>
            <CardTitle className="text-xl">
              {getUserName()}
            </CardTitle>
            <CardDescription className="text-sm">
              {getRoleBadge()}
            </CardDescription>
            <Badge variant="secondary" className="w-fit mx-auto mt-2">
              {getRoleIcon()}
              {getRoleBadge()}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-gray-500" />
                <span>{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-gray-500" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.entity_assignments?.hospitals?.[0] && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 size={16} className="text-gray-500" />
                <div>
                  <div>{user.entity_assignments.hospitals[0].name}</div>
                  <div className="text-xs text-gray-400">Hospital</div>
                </div>
              </div>
            )}
            <Separator />
            <div className="text-xs text-gray-500">
              User ID: {user.id}
            </div>
            {user.status && (
              <div className="text-xs">
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {user.status.toUpperCase()}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic personal and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                {isEditing ? (
                  <Input
                    id="displayName"
                    value={editedProfile.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded-md">{getUserName()}</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded-md">{user.email || 'Not provided'}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={editedProfile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded-md">{user.phone || 'Not provided'}</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={editedProfile.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded-md">
                    {editedProfile.bio || 'No bio provided'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase size={20} />
                Professional Information
              </CardTitle>
              <CardDescription>
                Your work-related information and role details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <div className="p-2 bg-gray-50 rounded-md capitalize">{getRoleBadge()}</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uid">User ID</Label>
                  <div className="p-2 bg-gray-50 rounded-md font-mono text-sm">{user.id}</div>
                </div>
              </div>

              {user.entity_assignments?.hospitals && user.entity_assignments.hospitals.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Hospitals</Label>
                  <div className="space-y-2">
                    {user.entity_assignments.hospitals.map((hospital: any) => (
                      <div key={hospital.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div className="font-medium">{hospital.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {hospital.city}
                          </span>
                          <span className="mx-2">•</span>
                          Code: {hospital.code}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">ID: {hospital.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {user.roles && user.roles.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {user.roles.map((role: string) => (
                      <Badge key={role} variant="outline">
                        {role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings size={20} />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account preferences and security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell size={16} className="text-gray-500" />
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-gray-500">Receive updates about your claims</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock size={16} className="text-gray-500" />
                  <div>
                    <div className="font-medium">Password & Security</div>
                    <div className="text-sm text-gray-500">Update your password and security settings</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p>Loading profile...</p>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  )
}