import { toast as sonnerToast } from 'sonner'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

interface ToastOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Enhanced toast functions with icons and better styling
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      classNames: {
        toast:
          'group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border-green-200 group-[.toaster]:shadow-sm',
        title: 'group-[.toast]:text-green-900 group-[.toast]:font-semibold',
        description: 'group-[.toast]:text-green-700',
      },
    })
  },

  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      classNames: {
        toast:
          'group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border-red-200 group-[.toaster]:shadow-sm',
        title: 'group-[.toast]:text-red-900 group-[.toast]:font-semibold',
        description: 'group-[.toast]:text-red-700',
      },
    })
  },

  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      classNames: {
        toast:
          'group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border-yellow-200 group-[.toaster]:shadow-sm',
        title: 'group-[.toast]:text-yellow-900 group-[.toast]:font-semibold',
        description: 'group-[.toast]:text-yellow-700',
      },
    })
  },

  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <Info className="h-5 w-5 text-blue-600" />,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      classNames: {
        toast:
          'group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border-blue-200 group-[.toaster]:shadow-sm',
        title: 'group-[.toast]:text-blue-900 group-[.toast]:font-semibold',
        description: 'group-[.toast]:text-blue-700',
      },
    })
  },

  loading: (message: string, options?: { description?: string }) => {
    return sonnerToast.loading(message, {
      description: options?.description,
      classNames: {
        toast: 'group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:shadow-sm',
      },
    })
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error,
    })
  },

  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId)
  },
}
