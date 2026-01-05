"use client"

/**
 * Next.js Template component - wraps every page with instant fade
 * Optimized for snappy navigation feel
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in" style={{ animationDuration: '100ms' }}>
      {children}
    </div>
  )
}
