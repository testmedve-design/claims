'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, Users, Building, Shield, BarChart3, Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface CommandItem {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: string
  keywords: string[]
}

const commands: CommandItem[] = [
  {
    id: 'new-claim',
    title: 'Submit New Claim',
    description: 'Create a new insurance claim',
    icon: FileText,
    href: '/claims/new',
    keywords: ['claim', 'new', 'submit', 'create']
  },
  {
    id: 'claims',
    title: 'All Claims',
    description: 'View and manage all claims',
    icon: FileText,
    href: '/claims',
    keywords: ['claims', 'all', 'list', 'manage']
  },
  {
    id: 'add-provider',
    title: 'Add Provider',
    description: 'Register a new healthcare provider',
    icon: Users,
    href: '/providers/new',
    keywords: ['provider', 'doctor', 'add', 'new', 'register']
  },
  {
    id: 'providers',
    title: 'All Providers',
    description: 'Manage healthcare providers',
    icon: Users,
    href: '/providers',
    keywords: ['providers', 'doctors', 'healthcare']
  },
  {
    id: 'facilities',
    title: 'Facilities',
    description: 'Manage hospitals and clinics',
    icon: Building,
    href: '/facilities',
    keywords: ['facilities', 'hospitals', 'clinics', 'buildings']
  },
  {
    id: 'insurance',
    title: 'Insurance Companies',
    description: 'Manage insurance providers',
    icon: Shield,
    href: '/payers/insurance',
    keywords: ['insurance', 'payers', 'companies']
  },
  {
    id: 'reports',
    title: 'Generate Report',
    description: 'Create analytics and reports',
    icon: BarChart3,
    href: '/reports',
    keywords: ['reports', 'analytics', 'generate', 'export']
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure application settings',
    icon: Settings,
    href: '/settings',
    keywords: ['settings', 'config', 'preferences']
  }
]

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const filteredCommands = commands.filter((command) => {
    const searchLower = search.toLowerCase()
    return (
      command.title.toLowerCase().includes(searchLower) ||
      command.description.toLowerCase().includes(searchLower) ||
      command.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
    )
  })

  const handleSelectCommand = useCallback((command: CommandItem) => {
    router.push(command.href)
    onClose()
    setSearch('')
  }, [router, onClose])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev >= filteredCommands.length - 1 ? 0 : prev + 1
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev <= 0 ? filteredCommands.length - 1 : prev - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            handleSelectCommand(filteredCommands[selectedIndex])
          }
          break
        case 'Escape':
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose, handleSelectCommand])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 glass-card">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 focus-visible:ring-0 text-lg bg-transparent"
              autoFocus
            />
            <Badge variant="outline" className="text-xs">
              ⌘K
            </Badge>
          </div>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No commands found for &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="p-2">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => handleSelectCommand(command)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl text-left hover-lift ${
                    index === selectedIndex
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <command.icon className="h-5 w-5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{command.title}</p>
                      {command.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {command.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {command.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}