'use client'

import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default function BreadcrumbNavigation() {
  const pathname = usePathname()

  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(path => path !== '')

    const breadcrumbs = [
      { name: 'Dashboard', href: '/dashboard' }
    ]

    let currentPath = ''
    paths.forEach((path, index) => {
      currentPath += `/${path}`

      // Skip the first 'dashboard' if it's already included
      if (path === 'dashboard' && index === 0) return

      const name = formatPathName(path)
      breadcrumbs.push({
        name,
        href: currentPath
      })
    })

    return breadcrumbs
  }

  const formatPathName = (path: string) => {
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const breadcrumbs = generateBreadcrumbs()

  if (pathname === '/dashboard' || pathname === '/') {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <div className="flex items-center gap-2">
              <Home size={16} className="text-primary" />
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </div>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <div className="flex items-center gap-2">
            <Home size={16} className="text-primary" />
          </div>
        </BreadcrumbItem>

        {breadcrumbs.map((breadcrumb, index) => (
          <div key={breadcrumb.href} className="flex items-center">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{breadcrumb.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={breadcrumb.href}>
                  {breadcrumb.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}