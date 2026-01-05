"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ข้อมูลจะถือว่า fresh เป็นเวลา 5 นาที
            staleTime: 5 * 60 * 1000,
            // Cache ข้อมูลไว้ 30 นาที
            gcTime: 30 * 60 * 1000,
            // ไม่ refetch เมื่อ window focus (ลด API calls)
            refetchOnWindowFocus: false,
            // Retry 2 ครั้งถ้า fail
            retry: 2,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
