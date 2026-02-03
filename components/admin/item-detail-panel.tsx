"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Calendar, User, Tag, FileText, Image as ImageIcon, X } from "lucide-react"
import type { Item, ItemStatus } from "@/types"
import { useState } from "react"
import Image from "next/image"
import { formatPostedAt, safeToDate } from "@/lib/utils"

interface ItemDetailPanelProps {
  item: Item | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange?: (itemId: string, newStatus: ItemStatus) => void
  onDelete?: (itemId: string) => void
}

const statusLabels: Record<ItemStatus, string> = {
  available: "พร้อมให้",
  pending: "รอดำเนินการ",
  completed: "เสร็จสิ้น",
}

const categoryLabels: Record<string, string> = {
  electronics: "อิเล็กทรอนิกส์",
  books: "หนังสือ",
  furniture: "เฟอร์นิเจอร์",
  clothing: "เสื้อผ้า",
  sports: "กีฬา",
  other: "อื่นๆ",
}

export function ItemDetailPanel({
  item,
  open,
  onOpenChange,
  onStatusChange,
  onDelete,
}: ItemDetailPanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | "">("")

  if (!item) return null

  const postedAt = safeToDate(item.postedAt, new Date(0))

  const handleStatusChange = () => {
    if (selectedStatus && onStatusChange) {
      onStatusChange(item.id, selectedStatus as ItemStatus)
      setSelectedStatus("")
    }
  }

  const handleDelete = () => {
    if (onDelete && confirm("คุณแน่ใจหรือไม่ที่จะลบโพสนี้?")) {
      onDelete(item.id)
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <SheetTitle className="text-2xl">{item.title}</SheetTitle>
              <SheetDescription>
                รหัส: {item.id}
              </SheetDescription>
            </div>
            <Badge 
              variant={item.status === 'available' ? 'default' : item.status === 'pending' ? 'secondary' : 'outline'}
              className="shrink-0"
            >
              {statusLabels[item.status]}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Image */}
          {item.imageUrl && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                รูปภาพ
              </Label>
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              รายละเอียด
            </Label>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{item.description}</p>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4" />
                หมวดหมู่
              </Label>
              <p className="text-sm font-medium">{categoryLabels[item.category] || item.category}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                สถานที่
              </Label>
              <p className="text-sm font-medium">{item.location}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                ผู้โพสต์
              </Label>
              <p className="text-sm font-medium">{item.postedBy}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                โพสต์เมื่อ
              </Label>
              <p className="text-sm font-medium">
                {formatPostedAt(postedAt)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">การจัดการ</Label>
            
            {/* Status Change */}
            <div className="space-y-2">
              <Label htmlFor="status">เปลี่ยนสถานะ</Label>
              <div className="flex gap-2">
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ItemStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="เลือกสถานะใหม่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">พร้อมให้</SelectItem>
                    <SelectItem value="pending">รอดำเนินการ</SelectItem>
                    <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleStatusChange}
                  disabled={!selectedStatus}
                >
                  อัปเดต
                </Button>
              </div>
            </div>

            {/* Delete */}
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleDelete}
            >
              <X className="h-4 w-4 mr-2" />
              ลบโพสนี้
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
