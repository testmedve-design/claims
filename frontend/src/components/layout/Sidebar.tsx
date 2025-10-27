'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  ChevronDown,
  ChevronRight,
  LucideIcon,
  User,
  LogOut,
  Menu,
  FileText,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Badge } from '../ui/badge'

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onClose: () => void
  onToggle: () => void
  isMobile: boolean
}

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
  children?: NavItem[]
  divider?: boolean // Add divider after this item
}

const getNavigationItems = (userRole: string): NavItem[] => {
  // Different navigation based on user role
  if (userRole === 'claim_processor' || userRole === 'claim_processor_l4') {
    // Claim processors only see Processor Inbox and Profile
    return [
      {
        title: 'Processor Inbox',
        href: '/processor-inbox',
        icon: Activity,
        divider: true,
      },
      {
        title: 'Profile',
        href: '/profile',
        icon: User,
      },
    ]
  } else if (userRole === 'rm' || userRole === 'reconciler') {
    // RM and Reconciler users see RM Inbox and Profile (same functionality)
    return [
      {
        title: 'RM Inbox',
        href: '/rm-inbox',
        icon: Activity,
        divider: true,
      },
      {
        title: 'Profile',
        href: '/profile',
        icon: User,
      },
    ]
  } else {
    // Regular hospital users see Claims, Drafts, Claims Inbox, and Profile
    return [
      {
        title: 'Claims',
        href: '/claims',
        icon: FileText,
      },
      {
        title: 'Drafts',
        href: '/drafts',
        icon: FileText,
      },
      {
        title: 'Claims Inbox',
        href: '/claims-inbox',
        icon: Activity,
        divider: true,
      },
      {
        title: 'Profile',
        href: '/profile',
        icon: User,
      },
    ]
  }
}

export default function Sidebar({ isOpen, isCollapsed, onClose, onToggle, isMobile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const toggleExpanded = (title: string) => {
    if (!isCollapsed) {
      setExpandedItems(prev =>
        prev.includes(title)
          ? prev.filter(item => item !== title)
          : [...prev, title]
      )
    }
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleSignOut = () => {
    logout()
    router.push('/login')
  }

  const NavItemComponent = ({ item, level = 0 }: { item: NavItem; level?: number }) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const active = isActive(item.href)

    if (hasChildren) {
      return (
        <div className="mb-1">
          {isCollapsed ? (
            // In collapsed mode, parent items navigate directly
            <Button
              variant={active ? "default" : "ghost"}
              size="sm"
              asChild
              className={cn(
                "w-full h-12 hover-lift rounded-xl transition-all duration-200 justify-center px-3 group",
                "hover:bg-primary/10 hover:shadow-none border border-transparent",
                active && "bg-primary/90 shadow-sm"
              )}
              title={item.title}
            >
              <Link href={item.href} onClick={onClose}>
                <item.icon size={18} className={cn(
                  "transition-all duration-200",
                  active ? "text-white" : "text-muted-foreground group-hover:text-primary"
                )} />
              </Link>
            </Button>
          ) : (
            // In expanded mode, parent items show/hide children
            <>
              <Button
                variant={active ? "default" : "ghost"}
                size="sm"
                onClick={() => toggleExpanded(item.title)}
                className={cn(
                  "w-full h-12 hover-lift rounded-xl transition-all duration-200 justify-between px-4 group",
                  "hover:bg-primary/10 hover:shadow-none",
                  active && "bg-primary/90 shadow-sm",
                  level > 0 && "ml-4"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={cn(
                    "transition-all duration-200",
                    active ? "text-white" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <span className={cn(
                    "font-medium transition-all duration-200",
                    active ? "text-white" : "text-foreground group-hover:text-primary"
                  )}>{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <ChevronDown size={16} className={cn(
                  "transition-all duration-200",
                  isExpanded ? "rotate-180" : "rotate-0",
                  active ? "text-white" : "text-muted-foreground group-hover:text-primary"
                )} />
              </Button>

              {isExpanded && (
                <div className="mt-1 space-y-1">
                  {item.children?.map((child) => (
                    <NavItemComponent key={child.title} item={child} level={level + 1} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    return (
      <Button
        variant={active ? "default" : "ghost"}
        size="sm"
        asChild
        className={cn(
          "w-full h-12 mb-1 hover-lift rounded-xl transition-all duration-200 group",
          "hover:bg-primary/10 hover:shadow-none border border-transparent",
          active && "bg-primary/90 shadow-sm",
          isCollapsed
            ? "justify-center px-3"
            : "justify-start px-4",
          level > 0 && !isCollapsed && "ml-4"
        )}
        title={isCollapsed ? item.title : undefined}
      >
        <Link href={item.href} onClick={onClose} className="flex items-center gap-3 w-full">
          <item.icon size={18} className={cn(
            "transition-all duration-200",
            active ? "text-white" : "text-muted-foreground group-hover:text-primary"
          )} />
          {!isCollapsed && (
            <>
              <span className={cn(
                "font-medium transition-all duration-200",
                active ? "text-white" : "text-foreground group-hover:text-primary"
              )}>{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </Link>
      </Button>
    )
  }

  return (
    <>
      {/* Mobile Floating Toggle Button - Only show when sidebar is closed */}
      {!isOpen && isMobile && isMounted && (
        <Button
          variant="default"
          size="icon"
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 lg:hidden h-12 w-12 rounded-full shadow-sm hover:scale-105 transition-all duration-200"
          title="Open sidebar"
          aria-label="Open navigation menu"
        >
          <Menu size={20} aria-hidden="true" />
        </Button>
      )}

      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          role="button"
          tabIndex={0}
          aria-label="Close navigation menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              onClose()
            }
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-white dark:bg-gray-950 border-r border-border shadow-none",
          "transform transition-all duration-300 ease-in-out",
          // Ensure consistent hydration by using safe defaults
          !isMounted && "translate-x-0 w-64", // Default state during SSR
          // Mobile behavior
          isMounted && isMobile && (isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"),
          // Desktop behavior
          isMounted && !isMobile && "translate-x-0",
          isMounted && !isMobile && (isCollapsed ? "w-16" : "w-64")
        )}
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo Header with Integrated Toggle */}
          <div className={cn(
            "flex items-center justify-between border-b border-border bg-muted/30 transition-all duration-300",
            !isMounted && "px-4 py-4", // Default state during SSR
            isMounted && (isCollapsed ? "px-3 py-3 flex-col gap-3" : "px-4 py-4")
          )}>
            {!isMounted || !isCollapsed ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <Image
                      src="/assets/logo.svg"
                      alt="MedVerve Logo"
                      width={40}
                      height={40}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold leading-tight text-foreground">
                      Medverve
                    </h1>
                    <p className="text-xs text-muted-foreground leading-tight">Admin Portal</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="hover:bg-primary/10 hover:text-primary transition-all duration-200 opacity-70 hover:opacity-100 h-8 w-8 border border-border/20"
                  title="Collapse sidebar"
                >
                  <Menu size={16} />
                </Button>
              </>
            ) : isMounted ? (
              <>
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image
                    src="/assets/logo.svg"
                    alt="MedVerve Logo"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="hover:bg-primary/10 hover:text-primary transition-all duration-200 h-8 w-8 border border-border/20"
                  title="Expand sidebar"
                >
                  <Menu size={14} />
                </Button>
              </>
            ) : null}
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 py-4 overflow-y-auto scrollbar-hide scroll-smooth scrollable-nav scroll-boundary",
            !isMounted && "px-4", // Default state during SSR
            isMounted && (isCollapsed ? "px-2" : "px-4")
          )}>
            <div className="space-y-2">
              {getNavigationItems(user?.role || '').map((item, index) => (
                <div key={item.title}>
                  <NavItemComponent item={item} />
                  {item.divider && (
                    <div className="my-2 border-t border-border" />
                  )}
                </div>
              ))}
            </div>
          </nav>

          {/* User Section */}
          <div className={cn(
            "border-t border-border bg-muted/30 transition-all duration-300",
            !isMounted && "px-4 py-4", // Default state during SSR
            isMounted && (isCollapsed ? "px-2 py-3" : "px-4 py-4")
          )}>
            {!isMounted || !isCollapsed ? (
              <div className="space-y-3">
                {/* User Profile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start h-12 px-3 rounded-xl hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all duration-200">
                      <Avatar className="h-8 w-8 mr-3 ring-2 ring-primary/10">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-xs font-semibold">
                          {user?.name
                            ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : user?.email?.slice(0, 2).toUpperCase() || 'U'
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium">
                          {user?.name || user?.email?.split('@')[0] || 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {user?.role?.replace('_', ' ') || 'User'}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center gap-2 p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user?.name
                            ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : user?.email?.slice(0, 2).toUpperCase() || 'U'
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {user?.name || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user?.email || user?.phone || 'No contact info'}
                        </p>
                      </div>
                    </div>

                    <DropdownMenuSeparator />

                    <Link href="/profile" onClick={onClose}>
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile Settings</span>
                      </DropdownMenuItem>
                    </Link>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : isMounted ? (
              <div className="space-y-2">
                {/* Collapsed User Profile */}
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10" title="Profile">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {user?.name
                              ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : user?.email?.slice(0, 2).toUpperCase() || 'U'
                            }
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56">
                      <div className="flex items-center gap-2 p-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user?.name
                              ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : user?.email?.slice(0, 2).toUpperCase() || 'U'
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">
                            {user?.name || user?.email?.split('@')[0] || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user?.email || user?.phone || 'No contact info'}
                          </p>
                        </div>
                      </div>

                      <DropdownMenuSeparator />

                      <Link href="/profile" onClick={onClose}>
                        <DropdownMenuItem>
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile Settings</span>
                        </DropdownMenuItem>
                      </Link>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  )
}