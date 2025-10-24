'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConfirmVariant = 'default' | 'destructive' | 'warning' | 'info'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  isLoading?: boolean
}

const variantStyles = {
  default: {
    icon: CheckCircle2,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    buttonClass: '',
  },
  destructive: {
    icon: XCircle,
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive/10',
    buttonClass: 'bg-destructive hover:bg-destructive/90',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const style = variantStyles[variant]
  const Icon = style.icon

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn('rounded-full p-3', style.iconBg)}>
              <Icon className={cn('h-6 w-6', style.iconColor)} />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="text-left mt-2">
                  {description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(style.buttonClass)}
          >
            {isLoading ? 'Loading...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Hook for using confirm dialog
import { create } from 'zustand'

interface ConfirmState {
  isOpen: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  onConfirm: () => void | Promise<void>
  open: (props: Omit<ConfirmState, 'isOpen' | 'open' | 'close'>) => void
  close: () => void
}

export const useConfirmDialog = create<ConfirmState>((set) => ({
  isOpen: false,
  title: '',
  description: undefined,
  confirmText: undefined,
  cancelText: undefined,
  variant: 'default',
  onConfirm: () => {},
  open: (props) => set({ ...props, isOpen: true }),
  close: () => set({ isOpen: false }),
}))

// Global confirm dialog component (add this to your layout)
export function GlobalConfirmDialog() {
  const { isOpen, close, open: _open, ...props } = useConfirmDialog()

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => !open && close()}
      {...props}
    />
  )
}
