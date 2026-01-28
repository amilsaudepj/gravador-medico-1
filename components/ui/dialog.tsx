"use client"

import * as React from "react"

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined)

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog: React.FC<DialogProps> = ({ open = false, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = React.useState(open)
  
  React.useEffect(() => {
    setInternalOpen(open)
  }, [open])
  
  const handleOpenChange = (newOpen: boolean) => {
    setInternalOpen(newOpen)
    onOpenChange?.(newOpen)
  }
  
  return (
    <DialogContext.Provider value={{ open: internalOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const context = React.useContext(DialogContext)
  
  return (
    <button
      ref={ref}
      onClick={(e) => {
        onClick?.(e)
        context?.onOpenChange(true)
      }}
      {...props}
    >
      {children}
    </button>
  )
})
DialogTrigger.displayName = "DialogTrigger"

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className = "", ...props }, ref) => {
    const context = React.useContext(DialogContext)
    
    if (!context?.open) return null
    
    // Detectar se className tem override de max-w ou p-
    const hasMaxWidth = className.includes('max-w-')
    const hasPadding = className.includes('p-0') || className.includes('p-[')
    
    const baseClasses = `relative z-50 w-full rounded-lg border shadow-2xl animate-in fade-in-0 zoom-in-95`
    const defaultMaxWidth = hasMaxWidth ? '' : 'max-w-lg'
    const defaultPadding = hasPadding ? '' : 'p-6'
    const defaultColors = 'border-gray-800 bg-gray-900'
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => context.onOpenChange(false)}
        />
        
        {/* Content */}
        <div
          ref={ref}
          className={`${baseClasses} ${defaultMaxWidth} ${defaultPadding} ${defaultColors} ${className}`}
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
          {...props}
        >
          {children}
        </div>
      </div>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
    {...props}
  />
))
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight text-white ${className}`}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-gray-400 ${className}`}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 ${className}`}
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
