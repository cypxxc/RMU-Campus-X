'use client'

import { useReportWebVitals } from 'next/web-vitals'

/**
 * Web Vitals Component
 * Tracks Core Web Vitals and reports them
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
        delta: metric.delta,
        id: metric.id,
      })
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      // Send to Vercel Analytics (automatic with @vercel/analytics)
      // Or send to custom endpoint:
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        page: window.location.pathname,
      })

      // Use sendBeacon for reliable delivery
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/vitals', blob)
      }
    }
  })

  return null
}

/**
 * Performance utilities
 */
export const performanceTimings = {
  /**
   * Mark the start of a performance measurement
   */
  start: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`)
    }
  },

  /**
   * Mark the end and measure duration
   */
  end: (name: string): number | null => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`)
      try {
        performance.measure(name, `${name}-start`, `${name}-end`)
        const measures = performance.getEntriesByName(name)
        const duration = measures[measures.length - 1]?.duration ?? null
        
        // Cleanup
        performance.clearMarks(`${name}-start`)
        performance.clearMarks(`${name}-end`)
        performance.clearMeasures(name)
        
        return duration
      } catch {
        return null
      }
    }
    return null
  },

  /**
   * Get navigation timing metrics
   */
  getNavigationTiming: () => {
    if (typeof performance === 'undefined') return null
    
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (!navigation) return null

    return {
      // DNS lookup time
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      // TCP connection time
      tcp: navigation.connectEnd - navigation.connectStart,
      // Time to First Byte (TTFB)
      ttfb: navigation.responseStart - navigation.requestStart,
      // Content download time
      download: navigation.responseEnd - navigation.responseStart,
      // DOM processing time
      domProcessing: navigation.domComplete - navigation.responseEnd,
      // Total page load time
      total: navigation.loadEventEnd - navigation.startTime,
    }
  },
}
