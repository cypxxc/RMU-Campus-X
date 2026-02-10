"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { useI18n } from "@/components/language-provider"
import { cn } from "@/lib/utils"

/**
 * Unified Modal Component
 * 
 * A standardized, content-adaptive modal component that provides
 * consistent layout, sizing, and behavior across the application.
 * 
 * @example
 * ```tsx
 * <UnifiedModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   size="lg"
 *   title="โพสต์สิ่งของ"
 *   description="แบ่งปันสิ่งของที่ไม่ใช้แล้วกับเพื่อนนักศึกษา"
 *   icon={<Package className="h-5 w-5" />}
 *   footer={<UnifiedModalActions ... />}
 * >
 *   <FormContent />
 * </UnifiedModal>
 * ```
 */

type ModalSize = "sm" | "md" | "lg" | "xl" | "full"

interface UnifiedModalProps {
  // Control
  open: boolean
  onOpenChange: (open: boolean) => void

  // Sizing
  size?: ModalSize
  maxHeight?: string

  // Header
  title: string // Required for accessibility
  description?: React.ReactNode // Can be string or custom element
  icon?: React.ReactNode
  headerClassName?: string

  // Behavior
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  fixedHeight?: boolean

  // Content
  children: React.ReactNode
  footer?: React.ReactNode

  // Styling
  bodyClassName?: string
  footerClassName?: string
}

// Size variant mapping (mobile-first, content-adaptive)
const sizeVariants: Record<ModalSize, string> = {
  sm: "w-[95vw] sm:max-w-md",     // 448px - Simple confirmations, info
  md: "w-[95vw] sm:max-w-lg",     // 512px - Forms, support tickets
  lg: "w-[95vw] sm:max-w-2xl",    // 672px - Complex forms, post items
  xl: "w-[95vw] sm:max-w-4xl",    // 896px - Admin, data tables
  full: "w-[95vw] sm:max-w-7xl",  // 1280px - Full-width special cases
}

export function UnifiedModal({
  open,
  onOpenChange,
  size = "lg",
  maxHeight = "90vh",
  title,
  description,
  icon,
  headerClassName,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  fixedHeight = false,
  children,
  footer,
  bodyClassName,
  footerClassName,
}: UnifiedModalProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const scrollBodyRef = React.useRef<HTMLDivElement>(null)

  // Lock body scroll when modal is open so only the modal scrolls
  React.useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = html.style.overflow
    document.body.style.overflow = "hidden"
    html.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prevBodyOverflow
      html.style.overflow = prevHtmlOverflow
    }
  }, [open])

  // Move focus out of the dialog before close so aria-hidden is never applied
  // to an ancestor of the focused element (avoids "Blocked aria-hidden" a11y warning).
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        const el = document.activeElement as HTMLElement | null
        if (typeof el?.blur === "function") el.blur()
      }
      onOpenChange(next)
    },
    [onOpenChange]
  )

  // When modal opens, focus the scrollable body so keyboard/screen reader and scroll stay inside modal
  const handleOpenAutoFocus = React.useCallback((e: Event) => {
    const el = scrollBodyRef.current ?? contentRef.current
    if (el) {
      e.preventDefault()
      ;(el as HTMLElement).focus({ preventScroll: true })
    }
  }, [])

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Content - use inline maxHeight so flex body can scroll (Tailwind may not emit dynamic max-h-[...]) */}
        <DialogPrimitive.Content
          ref={contentRef}
          data-lenis-prevent
          aria-describedby={undefined}
          style={fixedHeight ? { maxHeight: maxHeight, height: maxHeight } : { maxHeight: maxHeight }}
          className={cn(
            // Base positioning & appearance
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "flex flex-col overflow-hidden",
            "bg-background rounded-2xl border shadow-2xl",

            // Size variant
            sizeVariants[size]
          )}
          onOpenAutoFocus={handleOpenAutoFocus}
          onEscapeKeyDown={(e) => !closeOnEscape && e.preventDefault()}
          onPointerDownOutside={(e) => !closeOnOverlayClick && e.preventDefault()}
          onInteractOutside={(e) => !closeOnOverlayClick && e.preventDefault()}
          onCloseAutoFocus={(e) => {
            // Keep focus on body; avoid refocusing into removed/hidden content
            e.preventDefault()
          }}
        >
          {/* Header - Fixed */}
          <div
            className={cn(
              "shrink-0 border-b",
              "px-6 py-5 sm:px-8 sm:py-6",
              headerClassName
            )}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              {icon && React.isValidElement(icon) && (
                <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  {React.cloneElement(icon as React.ReactElement<any>, {
                    className: cn(
                      "text-primary",
                      (icon as React.ReactElement<any>).props.className
                    ),
                  })}
                </div>
              )}

              {/* Title & Description */}
              <div className="flex-1 space-y-1.5">
                <DialogPrimitive.Title
                  className={cn(
                    "text-xl sm:text-2xl font-bold tracking-tight leading-tight"
                  )}
                >
                  {title}
                </DialogPrimitive.Title>

                {description && (
                  <DialogPrimitive.Description
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>
          </div>

          {/* Body - Scrollable; focusable so open focus lands here and scroll stays inside modal */}
          <div
            ref={scrollBodyRef}
            tabIndex={0}
            className={cn(
              "flex-1 min-h-0 overflow-y-auto scrollbar-hide",
              "overscroll-contain outline-none",
              "px-6 py-4 sm:px-8 sm:py-6",
              bodyClassName
            )}
          >
            {children}
          </div>

          {/* Footer - Fixed */}
          {footer && (
            <div
              className={cn(
                "shrink-0 border-t bg-muted/30 backdrop-blur-md",
                "px-6 py-4 sm:px-8 sm:py-5",
                footerClassName
              )}
            >
              {footer}
            </div>
          )}

          {/* Close Button */}
          {showCloseButton && (
            <DialogPrimitive.Close
              className={cn(
                "absolute top-4 right-4 z-50",
                "rounded-full bg-background/80 p-2",
                "text-foreground/70 backdrop-blur-sm",
                "transition-all duration-200",
                "hover:bg-background hover:text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "disabled:pointer-events-none"
              )}
            >
              <XIcon className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * Unified Modal Actions
 * 
 * Standardized footer action buttons with consistent layout
 * and responsive behavior.
 * 
 * @example
 * ```tsx
 * <UnifiedModalActions
 *   onCancel={() => setOpen(false)}
 *   onSubmit={handleSubmit}
 *   submitText="โพสต์สิ่งของ"
 *   submitDisabled={!isValid}
 *   loading={loading}
 * />
 * ```
 */

interface UnifiedModalActionsProps {
  // Handlers
  onCancel?: () => void
  onSubmit?: () => void

  // Labels
  cancelText?: string
  submitText?: string

  // States
  submitDisabled?: boolean
  loading?: boolean
  loadingText?: string

  // Variants
  cancelVariant?: "ghost" | "outline"
  submitVariant?: "default" | "destructive" | "outline"

  // Custom content
  cancelButton?: React.ReactNode
  submitButton?: React.ReactNode
}

export function UnifiedModalActions({
  onCancel,
  onSubmit,
  cancelText,
  submitText,
  submitDisabled = false,
  loading = false,
  loadingText,
  cancelVariant = "outline",
  submitVariant = "default",
  cancelButton,
  submitButton,
}: UnifiedModalActionsProps) {
  const { tt } = useI18n()
  const resolvedCancelText = cancelText ?? tt("ยกเลิก", "Cancel")
  const resolvedSubmitText = submitText ?? tt("ยืนยัน", "Confirm")
  const resolvedLoadingText = loadingText ?? tt("กำลังดำเนินการ...", "Processing...")

  // Import Button dynamically to avoid circular dependencies
  const { Button } = require("@/components/ui/button")
  const { Loader2 } = require("lucide-react")

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3">
      {/* Cancel Button - outline by default for visibility in dark mode */}
      {cancelButton || (onCancel && (
        <Button
          type="button"
          variant={cancelVariant}
          onClick={onCancel}
          disabled={loading}
          className="flex-1 font-bold h-11"
        >
          {resolvedCancelText}
        </Button>
      ))}

      {/* Submit Button */}
      {submitButton || (onSubmit && (
        <Button
          type="button"
          variant={submitVariant}
          onClick={onSubmit}
          disabled={submitDisabled || loading}
          className="flex-1 font-bold h-11 shadow-md"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? resolvedLoadingText : resolvedSubmitText}
        </Button>
      ))}
    </div>
  )
}

// Export types for consumer usage
export type { ModalSize, UnifiedModalProps, UnifiedModalActionsProps}
