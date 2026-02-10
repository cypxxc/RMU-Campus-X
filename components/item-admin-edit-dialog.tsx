"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Info, Pencil } from "lucide-react"
import type { Item, ItemCategory } from "@/types"
import { CATEGORY_OPTIONS, LOCATION_OPTIONS } from "@/lib/constants"
import { useI18n } from "@/components/language-provider"

interface ItemAdminEditDialogProps {
  item: Item
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemUpdated?: (item: Item) => void
  categoryLabels: Record<ItemCategory, string>
}

export function ItemAdminEditDialog({
  item,
  open,
  onOpenChange,
  onItemUpdated,
  categoryLabels,
}: ItemAdminEditDialogProps) {
  const [editSaving, setEditSaving] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editDescription, setEditDescription] = useState(item.description || "")
  const [editCategory, setEditCategory] = useState<ItemCategory>((item.category as ItemCategory) || "other")
  const [editLocation, setEditLocation] = useState(item.location || "")
  const { toast } = useToast()
  const { tt } = useI18n()

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Reset fields to current item values when opening
      setEditTitle(item.title)
      setEditDescription(item.description || "")
      setEditCategory((item.category as ItemCategory) || "other")
      setEditLocation(item.location || "")
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    if (!item?.id || editSaving) return
    setEditSaving(true)
    try {
      const token = await (async () => {
        const { getAuth } = await import("firebase/auth")
        const auth = getAuth()
        return auth.currentUser?.getIdToken() ?? null
      })()
      if (!token) throw new Error(tt("กรุณาเข้าสู่ระบบใหม่", "Please sign in again"))
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory,
          location: editLocation.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error?.message || data.error || tt("แก้ไขไม่สำเร็จ", "Update failed"))
      toast({ title: tt("แก้ไขโพสสำเร็จ เจ้าของจะได้รับการแจ้งเตือน", "Post updated. Owner has been notified.") })
      onOpenChange(false)
      onItemUpdated?.({ ...item, title: editTitle, description: editDescription, category: editCategory, location: editLocation })
    } catch (e) {
      toast({ title: tt("แก้ไขไม่สำเร็จ", "Update failed"), description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-1 border-b bg-muted/30">
          <DialogTitle className="text-xl font-bold">{tt("แก้ไขโพส (ผู้ดูแล)", "Edit post (Admin)")}</DialogTitle>
          <DialogDescription asChild>
            <p className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              {tt("เจ้าของโพสจะได้รับการแจ้งเตือนทั้งในเว็บและ LINE", "The owner will be notified via web and LINE.")}
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 px-6 py-5">
          <div className="grid gap-2">
            <Label htmlFor="edit-title" className="text-sm font-medium text-foreground">
              {tt("ชื่อสิ่งของ", "Item name")}
            </Label>
            <Input
              id="edit-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={tt("ชื่อสิ่งของ", "Item name")}
              minLength={3}
              maxLength={100}
              className="h-10 border-2 bg-background focus-visible:ring-2"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description" className="text-sm font-medium text-foreground">
              {tt("รายละเอียด", "Description")}
            </Label>
            <Textarea
              id="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder={tt("อธิบายสิ่งของ", "Describe this item")}
              rows={4}
              minLength={10}
              maxLength={1000}
              className="min-h-[100px] border-2 bg-background focus-visible:ring-2 resize-y"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">{tt("หมวดหมู่", "Category")}</Label>
            <Select value={editCategory} onValueChange={(v) => setEditCategory(v as ItemCategory)}>
              <SelectTrigger className="h-10 border-2 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {categoryLabels[opt.value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-foreground">{tt("สถานที่นัดรับ", "Pickup location")}</Label>
            <Select value={editLocation || ""} onValueChange={setEditLocation}>
              <SelectTrigger className="h-10 border-2 bg-background">
                <SelectValue placeholder={tt("เลือกสถานที่", "Select location")} />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_OPTIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-3 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={editSaving} className="min-w-[100px]">
            {tt("ยกเลิก", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={editSaving || editTitle.trim().length < 3 || editDescription.trim().length < 10 || !editLocation.trim()}
            className="min-w-[120px]"
          >
            {editSaving ? tt("กำลังบันทึก...", "Saving...") : tt("บันทึก", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Trigger button for the admin edit dialog */
export function ItemAdminEditButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  const { tt } = useI18n()
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled} className="gap-2">
      <Pencil className="h-4 w-4" />
      {tt("แก้ไข", "Edit")}
    </Button>
  )
}
