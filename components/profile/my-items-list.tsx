"use client"

import { useState } from "react"
import type { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Edit, Trash2 } from "lucide-react"
import Image from "next/image"
import { formatPostedAt, safeToDate } from "@/lib/utils"
import { getItemPrimaryImageUrl } from "@/lib/cloudinary-url"

interface MyItemsListProps {
  items: Item[]
  loading: boolean
  onEdit: (item: Item) => void
  onDelete: (itemId: string) => void
}

export function MyItemsList({ items, loading, onEdit, onDelete }: MyItemsListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const statusLabels: Record<string, string> = {
    available: "พร้อมให้",
    pending: "รอดำเนินการ",
    completed: "เสร็จสิ้น",
  }

  const statusColors: Record<string, string> = {
    available: "bg-primary/10 text-primary border-primary/20",
    pending: "badge-warning",
    completed: "bg-muted text-muted-foreground border-border",
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground mt-4">กำลังโหลดรายการ...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed py-20 bg-muted/20">
        <div className="flex flex-col items-center text-center space-y-4 p-6">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold italic">คุณยังไม่ได้ลงประกาศสิ่งของ</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              เริ่มแบ่งปันสิ่งของที่คุณไม่ได้ใช้กับเพื่อนนักศึกษาได้เลยวันนี้
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  )

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {paginatedItems.map((item) => {
          const postedDate = safeToDate(item.postedAt, new Date(0))
          return (
            <Card 
              key={item.id} 
              className="group border-none shadow-soft hover:shadow-md transition-shadow overflow-hidden cursor-pointer hover:border-primary/30"
              onClick={() => onEdit(item)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center">
                {/* Image Part */}
                <div className="relative w-24 h-24 m-4 rounded-xl overflow-hidden bg-muted shrink-0">
                {getItemPrimaryImageUrl(item) ? (
                    <Image 
                      src={getItemPrimaryImageUrl(item)}
                      alt={item.title} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-200" 
                      sizes="(max-width: 768px) 100px, 96px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                </div>

                {/* Info Part */}
                <div className="flex-1 p-5 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg truncate">{item.title}</h4>
                    <Badge variant="outline" className={`ml-2 shrink-0 ${statusColors[item.status]}`}>
                      {statusLabels[item.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-4">
                    {item.description || "ไม่มีคำอธิบาย"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      ประกาศเมื่อ {formatPostedAt(postedDate)}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 rounded-full"
                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        แก้ไข
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      
      {/* Pagination */}
      {items.length > itemsPerPage && (
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
