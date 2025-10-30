'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description?: string
}

interface StepperContextValue {
  steps: Step[]
  currentStep: number
  setCurrentStep: (step: number) => void
  isStepComplete: (step: number) => boolean
  isStepAccessible: (step: number) => boolean
}

const StepperContext = React.createContext<StepperContextValue | null>(null)

function useStepper() {
  const context = React.useContext(StepperContext)
  if (!context) {
    throw new Error('useStepper must be used within a Stepper')
  }
  return context
}

interface StepperProps {
  children: React.ReactNode
  steps: Step[]
  currentStep: number
  onStepChange: (step: number) => void
  completedSteps?: number[]
}

function Stepper({
  children,
  steps,
  currentStep,
  onStepChange,
  completedSteps = [],
}: StepperProps) {
  const isStepComplete = React.useCallback(
    (step: number) => completedSteps.includes(step),
    [completedSteps]
  )

  const isStepAccessible = React.useCallback(
    (step: number) => {
      // First step is always accessible
      if (step === 0) return true
      // Step is accessible if previous step is completed or if it's the current step
      return isStepComplete(step - 1) || step <= currentStep
    },
    [currentStep, isStepComplete]
  )

  return (
    <StepperContext.Provider
      value={{
        steps,
        currentStep,
        setCurrentStep: onStepChange,
        isStepComplete,
        isStepAccessible,
      }}
    >
      {children}
    </StepperContext.Provider>
  )
}

interface StepperHeaderProps {
  className?: string
}

function StepperHeader({ className }: StepperHeaderProps) {
  const { steps, currentStep, setCurrentStep, isStepComplete, isStepAccessible } = useStepper()

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        {/* Progress Bar */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isComplete = isStepComplete(index)
            const isCurrent = currentStep === index
            const isAccessible = isStepAccessible(index)

            return (
              <div
                key={step.id}
                className="flex flex-col items-center group cursor-pointer"
                onClick={() => {
                  if (isAccessible) {
                    setCurrentStep(index)
                  }
                }}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2',
                    {
                      'bg-primary border-primary text-primary-foreground': isComplete,
                      'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20':
                        isCurrent,
                      'bg-background border-muted text-muted-foreground': !isComplete && !isCurrent,
                      'hover:border-primary/50': isAccessible && !isCurrent,
                      'cursor-not-allowed opacity-50': !isAccessible,
                    }
                  )}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center max-w-[120px]">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors',
                      {
                        'text-primary': isCurrent,
                        'text-foreground': isComplete && !isCurrent,
                        'text-muted-foreground': !isComplete && !isCurrent,
                      }
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface StepperContentProps {
  children: React.ReactNode
  className?: string
}

function StepperContent({ children, className }: StepperContentProps) {
  return (
    <div className={cn('mt-8', className)}>
      {children}
    </div>
  )
}

interface StepProps {
  children: React.ReactNode
  stepIndex: number
}

function Step({ children, stepIndex }: StepProps) {
  const { currentStep } = useStepper()

  if (currentStep !== stepIndex) {
    return null
  }

  return <div className="animate-in fade-in-50 duration-300">{children}</div>
}

export { Stepper, StepperHeader, StepperContent, Step, useStepper }
export type { Step as StepType }
