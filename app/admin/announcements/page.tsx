"use client"

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
import { authFetchJson } from "@/lib/api-client"
import type { Announcement, AnnouncementType } from "@/types"
import { getFirebaseAuth } from "@/lib/firebase"
import { uploadToCloudinary, validateImageFile } from "@/lib/storage"
import { resolveImageUrl } from "@/lib/cloudinary-url"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Megaphone, Pencil, Plus, Trash2, Upload, X } from "lucide-react"

type AnnouncementFormState = {
  title: string
  message: string
  type: AnnouncementType
  isActive: boolean
  startAt: string
  endAt: string
  linkUrl: string
  linkLabel: string
  imagePublicId: string | null
}

const EMPTY_FORM: AnnouncementFormState = {
  title: "",
  message: "",
  type: "info",
  isActive: true,
  startAt: "",
  endAt: "",
  linkUrl: "",
  linkLabel: "",
  imagePublicId: null,
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof (value as { toMillis?: () => number }).toMillis === "function") {
    const d = new Date((value as { toMillis: () => number }).toMillis())
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === "object" && value !== null && "_seconds" in (value as object)) {
    const d = new Date((value as { _seconds: number })._seconds * 1000)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function toDateStr(value: unknown, locale: "th" | "en"): string {
  const d = toDate(value)
  if (!d) return locale === "th" ? "—" : "-"
  return d.toLocaleString(locale === "th" ? "th-TH" : "en-US", { dateStyle: "short", timeStyle: "short" })
}

function toDateTimeLocal(value: unknown): string {
  const d = toDate(value)
  if (!d) return ""
  const tzOffset = d.getTimezoneOffset() * 60 * 1000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}

function getTypeBadge(type: AnnouncementType, tt: (th: string, en: string) => string) {
  if (type === "critical") return { label: tt("สำคัญ", "Critical"), className: "bg-red-500/10 text-red-600 border-red-500/20" }
  if (type === "warning") return { label: tt("เตือน", "Warning"), className: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
  return { label: tt("ทั่วไป", "General"), className: "bg-primary/10 text-primary border-primary/20" }
}

function toPayload(form: AnnouncementFormState) {
  return {
    title: form.title.trim(),
    message: form.message.trim(),
    type: form.type,
    isActive: form.isActive,
    startAt: form.startAt || null,
    endAt: form.endAt || null,
    linkUrl: form.linkUrl.trim() || null,
    linkLabel: form.linkLabel.trim() || null,
    imagePublicId: form.imagePublicId || null,
  }
}

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdminReady, setIsAdminReady] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [form, setForm] = useState<AnnouncementFormState>(EMPTY_FORM)

  const { user, loading: authLoading, isAdmin } = useAuth()
  const { locale, tt } = useI18n()
  const router = useRouter()
  const { toast } = useToast()

  const isEditMode = useMemo(() => !!editingId, [editingId])
  const previewImageUrl = resolveImageUrl(form.imagePublicId, { width: 1200 })

  const fetchList = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await authFetchJson<{ announcements?: Announcement[] }>("/api/admin/announcements", { method: "GET" })
      const data = (res as { data?: { announcements?: Announcement[] } })?.data ?? (res as { announcements?: Announcement[] })
      setList(Array.isArray(data?.announcements) ? data.announcements : [])
    } catch (error) {
      console.error(error)
      toast({ title: tt("โหลดรายการประกาศไม่สำเร็จ", "Failed to load announcements"), variant: "destructive" })
      setList([])
    } finally {
      setLoading(false)
    }
  }, [tt, toast, user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (!isAdmin) {
      toast({ title: tt("ไม่มีสิทธิ์เข้าถึง", "Access denied"), variant: "destructive" })
      router.push("/dashboard")
      return
    }
    setIsAdminReady(true)
    fetchList()
  }, [authLoading, isAdmin, router, toast, user, fetchList, tt])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setForm({
      title: announcement.title ?? "",
      message: announcement.message ?? "",
      type: announcement.type ?? "info",
      isActive: announcement.isActive !== false,
      startAt: toDateTimeLocal(announcement.startAt),
      endAt: toDateTimeLocal(announcement.endAt),
      linkUrl: announcement.linkUrl ?? "",
      linkLabel: announcement.linkLabel ?? "",
      imagePublicId: announcement.imagePublicId ?? null,
    })
    setModalOpen(true)
  }

  const closeModal = (force = false) => {
    if (!force && (saving || uploadingImage)) return
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: tt("กรุณาระบุหัวข้อประกาศ", "Please enter announcement title"), variant: "destructive" })
      return
    }
    if (!form.message.trim()) {
      toast({ title: tt("กรุณาระบุเนื้อหาประกาศ", "Please enter announcement message"), variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await authFetchJson(`/api/admin/announcements/${editingId}`, {
          method: "PATCH",
          body: toPayload(form),
        })
        toast({ title: tt("แก้ไขประกาศแล้ว", "Announcement updated") })
      } else {
        await authFetchJson("/api/admin/announcements", {
          method: "POST",
          body: toPayload(form),
        })
        toast({ title: tt("สร้างประกาศแล้ว", "Announcement created") })
      }
      closeModal(true)
      fetchList()
    } catch (error: unknown) {
      toast({ title: (error as Error)?.message || tt("บันทึกประกาศไม่สำเร็จ", "Failed to save announcement"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await authFetchJson(`/api/admin/announcements/${id}`, { method: "DELETE" })
      toast({ title: tt("ลบประกาศแล้ว", "Announcement deleted") })
      setDeleteId(null)
      fetchList()
    } catch (error: unknown) {
      toast({ title: (error as Error)?.message || tt("ลบประกาศไม่สำเร็จ", "Failed to delete announcement"), variant: "destructive" })
    }
  }

  const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const valid = validateImageFile(file)
    if (!valid.valid) {
      toast({ title: valid.error || tt("ไฟล์รูปภาพไม่ถูกต้อง", "Invalid image file"), variant: "destructive" })
      event.target.value = ""
      return
    }

    setUploadingImage(true)
    try {
      const auth = getFirebaseAuth()
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error(tt("กรุณาเข้าสู่ระบบใหม่ก่อนอัปโหลดรูป", "Please sign in again before uploading"))

      const publicId = await uploadToCloudinary(file, "announcement", token)
      setForm((prev) => ({ ...prev, imagePublicId: publicId }))
      toast({ title: tt("อัปโหลดรูปประกาศแล้ว", "Announcement image uploaded") })
    } catch (error: unknown) {
      toast({ title: (error as Error)?.message || tt("อัปโหลดรูปไม่สำเร็จ", "Failed to upload image"), variant: "destructive" })
    } finally {
      setUploadingImage(false)
      event.target.value = ""
    }
  }

  if (!isAdminReady) return null

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{tt("ประกาศ", "Announcements")}</h1>
              <p className="text-sm text-muted-foreground">{tt("จัดการประกาศหน้าเว็บและแบนเนอร์", "Manage site announcements and banners")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {tt("เพิ่มประกาศ", "Add announcement")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tt("รายการประกาศ", "Announcement list")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : list.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">{tt("ยังไม่มีประกาศ", "No announcements yet")}</p>
            ) : (
              <ul className="space-y-3">
                {list.map((announcement) => {
                  const typeBadge = getTypeBadge(announcement.type, tt)
                  const imageUrl = resolveImageUrl(announcement.imagePublicId, { width: 600 })
                  return (
                    <li
                      key={announcement.id}
                      className="rounded-lg border bg-card p-4 hover:bg-muted/20"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row">
                        {imageUrl ? (
                          <div className="relative h-24 w-full overflow-hidden rounded-md border sm:h-20 sm:w-36 shrink-0">
                            <Image
                              src={imageUrl}
                              alt={announcement.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, 160px"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{announcement.title}</span>
                            <Badge variant="outline" className={typeBadge.className}>
                              {typeBadge.label}
                            </Badge>
                            {!announcement.isActive && <Badge variant="secondary">{tt("ปิดแสดง", "Hidden")}</Badge>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{announcement.message}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {tt("สร้างเมื่อ", "Created")} {toDateStr(announcement.createdAt, locale)}
                            {announcement.startAt && ` • ${tt("เริ่ม", "Starts")} ${toDateStr(announcement.startAt, locale)}`}
                            {announcement.endAt && ` • ${tt("หมด", "Ends")} ${toDateStr(announcement.endAt, locale)}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => openEdit(announcement)}
                          >
                            <Pencil className="h-4 w-4" />
                            {tt("แก้ไข", "Edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(announcement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl gap-0 overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b bg-muted/30 px-6 pb-4 pt-6">
            <DialogTitle className="text-lg">{isEditMode ? tt("แก้ไขประกาศ", "Edit announcement") : tt("เพิ่มประกาศ", "Add announcement")}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[72vh] space-y-6 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{tt("หัวข้อ", "Title")} *</Label>
                <Input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder={tt("หัวข้อประกาศ", "Announcement title")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{tt("เนื้อหา", "Message")} *</Label>
                <Textarea
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder={tt("ข้อความประกาศ", "Announcement message")}
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{tt("ประเภทประกาศ", "Announcement type")}</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, type: value as AnnouncementType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tt("เลือกประเภท", "Select type")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">{tt("ทั่วไป", "General")}</SelectItem>
                      <SelectItem value="warning">{tt("เตือน", "Warning")}</SelectItem>
                      <SelectItem value="critical">{tt("สำคัญ", "Critical")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{tt("สถานะ", "Status")}</Label>
                  <div className="flex h-10 items-center justify-between rounded-md border px-3">
                    <span className="text-sm text-muted-foreground">{tt("แสดงทันที", "Show immediately")}</span>
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">{tt("ช่วงเวลาแสดง (ไม่บังคับ)", "Display schedule (optional)")}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">{tt("เริ่มแสดง", "Starts at")}</Label>
                  <Input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{tt("หมดอายุ", "Ends at")}</Label>
                  <Input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">{tt("ลิงก์เพิ่มเติม (ไม่บังคับ)", "Optional link")}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">{tt("ลิงก์ URL", "Link URL")}</Label>
                  <Input
                    value={form.linkUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, linkUrl: event.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{tt("ข้อความลิงก์", "Link text")}</Label>
                  <Input
                    value={form.linkLabel}
                    onChange={(event) => setForm((prev) => ({ ...prev, linkLabel: event.target.value }))}
                    placeholder={tt("ดูรายละเอียด", "Read details")}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{tt("รูปประกาศ", "Announcement image")}</Label>
                {form.imagePublicId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setForm((prev) => ({ ...prev, imagePublicId: null }))}
                  >
                    <X className="mr-1 h-4 w-4" />
                    {tt("ลบรูป", "Remove image")}
                  </Button>
                ) : null}
              </div>

              {form.imagePublicId && previewImageUrl ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border bg-card">
                  <Image
                    src={previewImageUrl}
                    alt={tt("รูปประกาศ", "Announcement image")}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 768px"
                  />
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-sm text-muted-foreground hover:bg-muted/30">
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingImage ? tt("กำลังอัปโหลด...", "Uploading...") : tt("คลิกเพื่ออัปโหลดรูปประกาศ (JPEG, PNG)", "Click to upload announcement image (JPEG, PNG)")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleUploadImage}
                    disabled={uploadingImage || saving}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3 border-t bg-muted/20 px-6 py-4">
            <Button variant="outline" onClick={() => closeModal()} disabled={saving || uploadingImage}>
              {tt("ยกเลิก", "Cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingImage}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditMode ? tt("บันทึกการแก้ไข", "Save changes") : tt("สร้างประกาศ", "Create announcement")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt("ลบประกาศ", "Delete announcement")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tt("การลบไม่สามารถย้อนกลับได้ คุณต้องการลบประกาศนี้หรือไม่?", "This action cannot be undone. Delete this announcement?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt("ยกเลิก", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              {tt("ลบ", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
