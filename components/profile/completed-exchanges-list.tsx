"use client"

import { useState } from "react"
import type { Exchange } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, History, CheckCircle } from "lucide-react"

function formatExchangeTime(date: Date): string {
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface CompletedExchangesListProps {
  exchanges: Exchange[]
  loading: boolean
  currentUserId: string | undefined
}

export function CompletedExchangesList({ exchanges, loading, currentUserId }: CompletedExchangesListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground mt-4">กำลังโหลดประวัติ...</p>
      </div>
    )
  }

  if (exchanges.length === 0) {
    return (
      <Card className="border-dashed py-20 bg-muted/20">
        <CardContent className="flex flex-col items-center text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <History className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">ยังไม่มีประวัติการแลกเปลี่ยน</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              เมื่อคุณแลกเปลี่ยนสิ่งของสำเร็จ ประวัติจะแสดงที่นี่
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPages = Math.ceil(exchanges.length / itemsPerPage)
  const paginatedExchanges = exchanges.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  )

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {paginatedExchanges.map((exchange) => {
          const createdAt =
            typeof exchange.createdAt === "string"
              ? new Date(exchange.createdAt)
              : (exchange.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
          const isOwner = exchange.ownerId === currentUserId
          return (
            <Card key={exchange.id} className="border-none shadow-soft hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{exchange.itemTitle}</h4>
                    <p className="text-sm text-muted-foreground">
                      {isOwner ? "คุณให้สิ่งของนี้" : "คุณได้รับสิ่งของนี้"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      สำเร็จ
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatExchangeTime(createdAt instanceof Date ? createdAt : new Date(createdAt))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {/* Pagination */}
      {exchanges.length > itemsPerPage && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ก่อนหน้า
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "ghost"}
                size="sm"
                className="w-8 h-8"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ถัดไป
          </Button>
        </div>
      )}
    </>
  )
}
