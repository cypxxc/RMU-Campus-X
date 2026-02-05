"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { authFetchJson } from "@/lib/api-client"
import type { Announcement, AnnouncementType } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, Megaphone, Plus, Pencil, Trash2 } from "lucide-react"

const TYPE_LABELS: Record<AnnouncementType, string> = {
  info: "ข้อมูลทั่วไป",
  warning: "คำเตือน",
  critical: "สำคัญเร่งด่วน",
}

function toDateStr(v: unknown): string {
  if (!v) return "—"
  let d: Date
  if (typeof (v as { toDate?: () => Date }).toDate === "function") d = (v as { toDate: () => Date }).toDate()
  else if (typeof (v as { toMillis?: () => number }).toMillis === "function") d = new Date((v as { toMillis: () => number }).toMillis())
  else if (typeof v === "string" || typeof v === "number") d = new Date(v)
  else if (typeof v === "object" && v !== null && "_seconds" in (v as object)) d = new Date((v as { _seconds: number })._seconds * 1000)
  else return "—"
  return d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
}

function toDateTimeLocalValue(v: unknown): string {
  if (!v) return ""
  let d: Date
  if (typeof (v as { toDate?: () => Date }).toDate === "function") d = (v as { toDate: () => Date }).toDate()
  else if (typeof (v as { toMillis?: () => number }).toMillis === "function") d = new Date((v as { toMillis: () => number }).toMillis())
  else if (typeof v === "string" || typeof v === "number") d = new Date(v)
  else if (typeof v === "object" && v !== null && "_seconds" in (v as object)) d = new Date((v as { _seconds: number })._seconds * 1000)
  else return ""
  return d.toISOString().slice(0, 16)
}

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "info" as AnnouncementType,
    isActive: true,
    startAt: "",
    endAt: "",
  })

  const { user, loading: authLoading, isAdmin: isAdminFromAuth } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const fetchList = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await authFetchJson<{ announcements?: Announcement[] }>("/api/admin/announcements", { method: "GET" })
      const data = (res as any)?.data ?? res
      setList(Array.isArray(data?.announcements) ? data.announcements : [])
    } catch (e) {
      console.error(e)
      toast({ title: "โหลดรายการไม่สำเร็จ", variant: "destructive" })
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (!isAdminFromAuth) {
      toast({ title: "ไม่มีสิทธิ์เข้าถึง", variant: "destructive" })
      router.push("/dashboard")
      return
    }
    setIsAdmin(true)
    fetchList()
  }, [user, authLoading, isAdminFromAuth, router, toast])

  const openCreate = () => {
    setEditing(null)
    setForm({
      title: "",
      message: "",
      type: "info",
      isActive: true,
      startAt: "",
      endAt: "",
    })
    setModalOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditing(a)
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      isActive: a.isActive,
      startAt: toDateTimeLocalValue(a.startAt),
      endAt: toDateTimeLocalValue(a.endAt),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "กรุณาระบุหัวข้อ", variant: "destructive" })
      return
    }
    if (!form.message.trim()) {
      toast({ title: "กรุณาระบุเนื้อหา", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await authFetchJson(`/api/admin/announcements/${editing.id}`, {
          method: "PATCH",
          body: {
            title: form.title.trim(),
            message: form.message.trim(),
            type: form.type,
            isActive: form.isActive,
            startAt: form.startAt || null,
            endAt: form.endAt || null,
            linkUrl: null,
            linkLabel: null,
          },
        })
        toast({ title: "แก้ไขประกาศแล้ว" })
      } else {
        await authFetchJson("/api/admin/announcements", {
          method: "POST",
          body: {
            title: form.title.trim(),
            message: form.message.trim(),
            type: form.type,
            isActive: form.isActive,
            startAt: form.startAt || null,
            endAt: form.endAt || null,
            linkUrl: null,
            linkLabel: null,
          },
        })
        toast({ title: "สร้างประกาศแล้ว" })
      }
      setModalOpen(false)
      fetchList()
    } catch (e: any) {
      toast({ title: e?.message || "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await authFetchJson(`/api/admin/announcements/${id}`, { method: "DELETE" })
      toast({ title: "ลบประกาศแล้ว" })
      setDeleteId(null)
      fetchList()
    } catch (e: any) {
      toast({ title: e?.message || "ลบไม่สำเร็จ", variant: "destructive" })
    }
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">ประกาศ</h1>
              <p className="text-sm text-muted-foreground">จัดการแบนเนอร์ประกาศที่แสดงด้านบนเว็บ</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มประกาศ
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">รายการประกาศ</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : list.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">ยังไม่มีประกาศ</p>
            ) : (
              <ul className="space-y-3">
                {list.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{a.title}</span>
                        <Badge variant={a.type === "critical" ? "destructive" : a.type === "warning" ? "secondary" : "outline"}>
                          {TYPE_LABELS[a.type]}
                        </Badge>
                        {!a.isActive && <Badge variant="secondary">ปิดแสดง</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        สร้างเมื่อ {toDateStr(a.createdAt)}
                        {a.startAt && ` • เริ่ม ${toDateStr(a.startAt)}`}
                        {a.endAt && ` • หมด ${toDateStr(a.endAt)}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEdit(a)} className="gap-1">
                        <Pencil className="h-4 w-4" />
                        แก้ไข
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-lg rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 sm:px-8 pt-6 pb-4 border-b bg-muted/30">
            <DialogTitle className="text-lg">{editing ? "แก้ไขประกาศ" : "เพิ่มประกาศ"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 sm:px-8 py-6 space-y-6 overflow-y-auto max-h-[70vh]">
            {/* ข้อมูลหลัก */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">หัวข้อ *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="หัวข้อประกาศ"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">เนื้อหา *</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="ข้อความประกาศ"
                  rows={4}
                  className="rounded-lg resize-y min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">ประเภท</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as AnnouncementType }))}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ข้อมูลทั่วไป</SelectItem>
                    <SelectItem value="warning">คำเตือน</SelectItem>
                    <SelectItem value="critical">สำคัญเร่งด่วน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">เปิดแสดงทันที</Label>
              </div>
            </div>

            {/* ช่วงเวลาแสดง */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">ช่วงเวลาแสดง (ไม่บังคับ)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">เริ่มแสดง</Label>
                  <Input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">หมดอายุ</Label>
                  <Input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                    className="rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 sm:px-8 py-4 border-t bg-muted/20 gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-lg">
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-lg gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "บันทึก" : "สร้างประกาศ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบประกาศ</AlertDialogTitle>
            <AlertDialogDescription>การลบไม่สามารถย้อนกลับได้ คุณต้องการลบประกาศนี้หรือไม่?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive text-destructive-foreground">
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
