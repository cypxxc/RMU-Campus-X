/**
 * Accessibility Utilities
 * Helper functions for improving a11y
 */

/**
 * Screen reader only class (use with className)
 */
export const srOnly = 'sr-only'

/**
 * Generate unique ID for accessibility attributes
 */
export function generateA11yId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Keyboard navigation helpers
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const

/**
 * Check if event is a keyboard activation (Enter or Space)
 */
export function isActivationKey(event: React.KeyboardEvent): boolean {
  return event.key === KEYS.ENTER || event.key === KEYS.SPACE
}

/**
 * Handle keyboard navigation for list items
 */
export function handleListNavigation(
  event: React.KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  onNavigate: (newIndex: number) => void
): void {
  let newIndex = currentIndex

  switch (event.key) {
    case KEYS.ARROW_DOWN:
      event.preventDefault()
      newIndex = (currentIndex + 1) % totalItems
      break
    case KEYS.ARROW_UP:
      event.preventDefault()
      newIndex = (currentIndex - 1 + totalItems) % totalItems
      break
    case KEYS.HOME:
      event.preventDefault()
      newIndex = 0
      break
    case KEYS.END:
      event.preventDefault()
      newIndex = totalItems - 1
      break
    default:
      return
  }

  onNavigate(newIndex)
}

/**
 * Focus management helpers
 */
export function focusElement(element: HTMLElement | null): void {
  if (element && typeof element.focus === 'function') {
    element.focus()
  }
}

/**
 * Create a focus trap within a container
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors)
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== KEYS.TAB) return

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  // Focus first element
  firstFocusable?.focus()

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Get ARIA label for common patterns
 */
export function getAriaLabel(type: string, value?: string | number): string {
  const labels: Record<string, string> = {
    close: 'ปิด',
    menu: 'เมนู',
    search: 'ค้นหา',
    loading: 'กำลังโหลด',
    error: 'เกิดข้อผิดพลาด',
    success: 'สำเร็จ',
    previous: 'ก่อนหน้า',
    next: 'ถัดไป',
    expand: 'ขยาย',
    collapse: 'ย่อ',
    delete: 'ลบ',
    edit: 'แก้ไข',
    save: 'บันทึก',
    cancel: 'ยกเลิก',
  }
  
  const label = labels[type] || type
  return value !== undefined ? `${label} ${value}` : label
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Skip link helper
 */
export function createSkipLink(targetId: string, label: string = 'ข้ามไปยังเนื้อหาหลัก'): HTMLAnchorElement {
  const link = document.createElement('a')
  link.href = `#${targetId}`
  link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:rounded-md focus:shadow-lg'
  link.textContent = label
  return link
}
