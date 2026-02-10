"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { deleteItem, updateItem } from "@/lib/firestore"
import { useItems } from "@/hooks/use-items"
import { authFetchJson } from "@/lib/api-client"
import { updateUserPassword, deleteUserAccount } from "@/lib/auth"
import type { Item, Exchange } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Loader2, Package, Trash2, Edit, Save, History, Camera, AlertTriangle, ImagePlus, X, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import Image from "next/image"
import { uploadToCloudinary, validateImageFile } from "@/lib/storage"
import { getFirebaseAuth } from "@/lib/firebase"
import { IMAGE_UPLOAD_CONFIG, LOCATION_OPTIONS } from "@/lib/constants"
import { updateUserProfile, getUserProfile } from "@/lib/firestore"
import { extractPublicIdFromUrl, resolveImageUrl } from "@/lib/cloudinary-url"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings } from "lucide-react"
import { LineNotificationSettings } from "@/components/line-notification-settings"
import { UnifiedModal } from "@/components/ui/unified-modal"
import { ProfileBadges } from "@/components/profile/profile-badges"
import { useI18n } from "@/components/language-provider"

// Refactored Components
import { MyItemsList } from "@/components/profile/my-items-list"
import { CompletedExchangesList } from "@/components/profile/completed-exchanges-list"
import { EditProfileForm } from "@/components/profile/edit-profile-form"
import { PasswordChangeForm } from "@/components/profile/password-change-form"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // Data State
  const [completedExchanges, setCompletedExchanges] = useState<Exchange[]>([])
  const [loadingExchanges, setLoadingExchanges] = useState(true)
  // Edit Item State
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editImageUrls, setEditImageUrls] = useState<string[]>([])
  const [editLocation, setEditLocation] = useState("")
  const [editLocationDetail, setEditLocationDetail] = useState("")
  const [uploadingItemImage, setUploadingItemImage] = useState(false)
  const [savingItem, setSavingItem] = useState(false)
  
  // Profile Image State
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Dialogs State
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null })
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)

  const { user, loading: authLoading, refreshUserProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { tt } = useI18n()
  const mountedRef = useRef(true)

  const statusLabels: Record<string, string> = {
    available: tt("พร้อมให้", "Available"),
    pending: tt("รอดำเนินการ", "Pending"),
    completed: tt("เสร็จสิ้น", "Completed"),
  }

  const statusColors: Record<string, string> = {
    available: "bg-primary/10 text-primary border-primary/20",
    pending: "badge-warning",
    completed: "bg-muted text-muted-foreground border-border",
  }

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const { items: myItems, isLoading: loadingItems, refetch: refetchMyItems } = useItems({
    postedBy: user?.uid ?? undefined,
    pageSize: 50,
    enabled: !!user,
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    } else if (!authLoading && user) {
      setLoading(false)
      loadProfile()
      loadCompletedExchanges()
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchMyItems()
        loadCompletedExchanges()
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [user, refetchMyItems])

  const loadCompletedExchanges = async () => {
    if (!user) return
    setLoadingExchanges(true)
    try {
      const res = await authFetchJson("/api/exchanges", { method: "GET" }) as { data?: { exchanges?: Exchange[] } }
      if (!mountedRef.current) return
      const list = res.data?.exchanges ?? []
      const completed = list.filter((e: Exchange) => e.status === "completed")
      setCompletedExchanges(completed)
    } catch (error) {
      if (!mountedRef.current) return
      console.error("Error loading completed exchanges:", error)
      setCompletedExchanges([])
    } finally {
      if (mountedRef.current) setLoadingExchanges(false)
    }
  }

  const loadProfile = async () => {
    if (!user) return
    try {
      const profile = await getUserProfile(user.uid)
      if (!mountedRef.current) return
      if (profile) {
        setUserProfile(profile)
        setProfileImage(profile.photoURL || null)
      }
    } catch (error: unknown) {
      if (!mountedRef.current) return
      console.error("Error loading profile:", error)
    }
  }

  const handleOpenEditItem = (item: Item) => {
    setSelectedItem(item)
    setEditTitle(item.title)
    setEditDescription(item.description)
    setEditLocation(item.location || "")
    setEditLocationDetail(item.locationDetail || "")
    const refs = (item.imagePublicIds?.length ? item.imagePublicIds : item.imageUrls?.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [])
    setEditImageUrls([...refs])
  }

  const handleEditItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !user) return
    const maxImages = IMAGE_UPLOAD_CONFIG.maxImages
    const remaining = maxImages - editImageUrls.length
    if (remaining <= 0) {
      toast({ title: tt("เพิ่มรูปได้สูงสุด 5 รูป", "You can upload up to 5 images"), variant: "destructive" })
      e.target.value = ""
      return
    }
    setUploadingItemImage(true)
    try {
      const auth = getFirebaseAuth()
      const token = await auth.currentUser?.getIdToken()
      const added: string[] = []
      for (const file of Array.from(files).slice(0, remaining)) {
        const valid = validateImageFile(file)
        if (!valid.valid) {
          toast({ title: tt("ไฟล์ไม่ถูกต้อง", "Invalid file"), description: `${file.name}: ${valid.error}`, variant: "destructive" })
          continue
        }
        const publicId = await uploadToCloudinary(file, "item", token)
        added.push(publicId)
      }
      if (added.length) setEditImageUrls((prev) => [...prev, ...added].slice(0, maxImages))
      if (added.length) toast({ title: tt(`เพิ่ม ${added.length} รูปสำเร็จ`, `${added.length} image(s) added`) })
    } catch (err: any) {
      toast({ title: tt("อัปโหลดไม่สำเร็จ", "Upload failed"), description: err?.message, variant: "destructive" })
    } finally {
      setUploadingItemImage(false)
      e.target.value = ""
    }
  }

  const handleSaveItemEdit = async () => {
    if (!selectedItem || !user) return
    if (!editTitle.trim()) {
      toast({ title: tt("กรุณากรอกชื่อสิ่งของ", "Please enter an item name"), variant: "destructive" })
      return
    }
    if (!editLocation.trim()) {
      toast({ title: tt("กรุณาเลือกสถานที่นัดรับ", "Please select a pickup location"), variant: "destructive" })
      return
    }
    setSavingItem(true)
    try {
      const imagePublicIds = editImageUrls.map((ref) => extractPublicIdFromUrl(ref) ?? ref).filter(Boolean)
      await updateItem(selectedItem.id, { 
        title: editTitle.trim(), 
        description: editDescription.trim(),
        location: editLocation.trim(),
        locationDetail: editLocationDetail.trim() || undefined,
        imagePublicIds: imagePublicIds.length ? imagePublicIds : undefined,
      })
      try {
        const token = await user.getIdToken()
        await fetch("/api/line/notify-item", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            userId: user.uid,
            itemTitle: editTitle.trim(),
            itemId: selectedItem.id,
            action: "updated",
          }),
        })
      } catch (lineErr) {
        console.warn("[LINE] Notify item updated:", lineErr)
      }
      toast({ title: tt("บันทึกสำเร็จ", "Saved") })
      refetchMyItems()
      setSelectedItem(null)
    } catch (error: any) {
      toast({ title: tt("เกิดข้อผิดพลาด", "Error"), description: error.message, variant: "destructive" })
    } finally {
      setSavingItem(false)
    }
  }

  const handleUpdateProfile = async (data: { displayName: string; bio: string }) => {
    if (!user) return
    const newDisplayName = data.displayName.trim()
    const newBio = data.bio.trim()
    try {
      await updateUserProfile(user.uid, {
        displayName: newDisplayName,
        bio: newBio,
        photoURL: profileImage || "",
      })
      await refreshUserProfile()
      // อัปเดต state ทันที (optimistic) เพื่อไม่ให้ฟอร์มรีเซ็ตหรือแสดงค่าเก่าเมื่อ loadProfile() ทำงาน
      setUserProfile((prev: typeof userProfile) =>
        prev ? { ...prev, displayName: newDisplayName, bio: newBio } : prev
      )
      toast({ title: tt("อัปเดตโปรไฟล์สำเร็จ", "Profile updated") })
      loadProfile()
    } catch (error: any) {
      console.error(error)
      toast({ title: tt("เกิดข้อผิดพลาด", "Error"), description: error.message, variant: "destructive" })
      throw error
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingImage(true)
    try {
      // Get auth token for upload API
      const token = await user.getIdToken()
      const cloudinaryUrl = await uploadToCloudinary(file, 'avatar', token)
      setProfileImage(cloudinaryUrl)
      await updateUserProfile(user.uid, { 
        photoURL: cloudinaryUrl,
      })
      await refreshUserProfile()
      toast({ title: tt("อัปโหลดรูปโปรไฟล์สำเร็จ", "Profile image uploaded") })
      loadProfile()
    } catch (error: any) {
      toast({ title: tt("เกิดข้อผิดพลาดในการอัปโหลด", "Upload error"), description: error.message, variant: "destructive" })
    } finally {
      setUploadingImage(false)
    }
  }


  const handleDeleteItem = async () => {
    if (!deleteDialog.itemId || !user) return
    const itemTitle = myItems.find((i) => i.id === deleteDialog.itemId)?.title ?? ""
    try {
      await deleteItem(deleteDialog.itemId)
      try {
        const token = await user.getIdToken()
        await fetch("/api/line/notify-item", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            userId: user.uid,
            itemTitle,
            action: "deleted",
          }),
        })
      } catch (lineErr) {
        console.warn("[LINE] Notify item deleted:", lineErr)
      }
      toast({ title: tt("ลบสิ่งของสำเร็จ", "Item deleted") })
      refetchMyItems()
    } catch (error: any) {
      toast({ title: tt("เกิดข้อผิดพลาด", "Error"), description: error.message, variant: "destructive" })
    } finally {
      setDeleteDialog({ open: false, itemId: null })
      setSelectedItem(null)
    }
  }

  const handleChangePassword = async (password: string) => {
    if (!user) return
    try {
     await updateUserPassword(user, password)
      // Note: updateUserPassword might throw if re-auth needed
    } catch (error: any) {
       if (error.code === 'auth/requires-recent-login') {
         toast({ 
          title: tt("ต้องเข้าสู่ระบบใหม่", "Re-authentication required"), 
          description: tt("เพื่อความปลอดภัย กรุณาออกจากระบบและเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน", "For security, please sign out and sign in again before changing password."),
          variant: "destructive" 
        })
      } else {
        toast({ title: tt("เกิดข้อผิดพลาด", "Error"), description: error.message, variant: "destructive" })
      }
      throw error // Re-throw to let component stop loading state
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== "DELETE") return

    setDeletingAccount(true)
    try {
      await deleteUserAccount(user)
      toast({ title: tt("ลบบัญชีผู้ใช้เรียบร้อยแล้ว", "Account deleted successfully") })
      router.push("/login")
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast({ 
          title: tt("ต้องเข้าสู่ระบบใหม่", "Re-authentication required"), 
          description: tt("เพื่อความปลอดภัย กรุณาออกจากระบบและเข้าสู่ระบบใหม่ก่อนลบบัญชี", "For security, please sign out and sign in again before deleting your account."),
          variant: "destructive" 
        })
      } else {
        toast({ title: tt("เกิดข้อผิดพลาด", "Error"), description: error.message, variant: "destructive" })
      }
    } finally {
      setDeletingAccount(false)
      setDeleteAccountDialog(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-soft overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardContent className="px-6 pt-10 text-center pb-8">
                <div className="relative inline-block group">
                  <Avatar className="h-32 w-32 border-4 border-background ring-2 ring-primary/20 shadow-xl">
                    <AvatarImage src={resolveImageUrl(profileImage ?? undefined) || undefined} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-primary/5 text-primary">
                      {userProfile?.displayName?.[0] || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute bottom-1 right-1 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform ring-4 border-2 border-background"
                  >
                    {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    <input 
                      id="avatar-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>

                <div className="mt-4 space-y-1">
                  <h2 className="text-xl font-bold">{userProfile?.displayName || tt("ผู้ใช้งาน", "User")}</h2>
                  <p className="text-sm text-muted-foreground truncate max-w-full px-4">{user.email}</p>
                  
                  <Button 
                    variant="link" 
                    className="text-primary h-auto p-0 text-xs mt-1"
                    onClick={() => router.push(`/profile/${user.uid}`)}
                  >
                    {tt("ดูมุมมองสาธารณะ", "View public profile")}
                  </Button>
                </div>

                <div className="mt-6">
                  <ProfileBadges
                    emailVerified={user.emailVerified}
                    isActive={userProfile?.status === "ACTIVE"}
                    hasAvatar={!!profileImage}
                    lineLinked={!!userProfile?.lineUserId}
                    lineNotificationsEnabled={!!userProfile?.lineNotifications?.enabled}
                  />
                </div>

                <div className="mt-8 pt-8 border-t grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-black text-primary">{myItems.length}</p>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{tt("โพส", "Posts")}</p>
                  </div>
                  <div className="text-center border-l">
                    <p className="text-2xl font-black text-primary">
                      {completedExchanges.length}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{tt("แลกเปลี่ยนสำเร็จ", "Completed exchanges")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Content Tabs */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="items" className="space-y-6">
              <TabsList className="bg-muted/50 p-1 border h-12 w-full sm:w-auto justify-start inline-flex flex-nowrap overflow-x-auto scrollbar-hide">
                <TabsTrigger value="items" className="px-4 gap-2 h-full shrink-0">
                  <Package className="h-4 w-4 shrink-0" />
                  {tt("โพส", "Posts")}
                </TabsTrigger>
                <TabsTrigger value="history" className="px-4 gap-2 h-full shrink-0">
                  <History className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{tt("ประวัติแลกเปลี่ยน", "Exchange history")}</span>
                  <span className="sm:hidden">{tt("ประวัติ", "History")}</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="px-4 gap-2 h-full shrink-0">
                  <Settings className="h-4 w-4 shrink-0" />
                  {tt("ตั้งค่า", "Settings")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="space-y-4 focus-visible:outline-none">
                <MyItemsList 
                  items={myItems}
                  loading={loadingItems}
                  onEdit={handleOpenEditItem}
                  onDelete={(itemId) => setDeleteDialog({ open: true, itemId })}
                />
              </TabsContent>

              <TabsContent value="history" className="space-y-4 focus-visible:outline-none">
                <CompletedExchangesList 
                  exchanges={completedExchanges}
                  loading={loadingExchanges}
                  currentUserId={user.uid}
                />
              </TabsContent>

              <TabsContent value="settings" className="focus-visible:outline-none">
                <EditProfileForm 
                  initialDisplayName={editDisplayNameFromProfile(userProfile)}
                  initialBio={userProfile?.bio || ""}
                  email={user.email || ""}
                  userId={user.uid}
                  onSave={handleUpdateProfile}
                />

                <div className="mt-6">
                  <LineNotificationSettings profile={userProfile} onUpdate={loadProfile} />
                </div>

                <PasswordChangeForm 
                  onCheckPassword={(pass, confirm) => {
                    if (pass !== confirm) return tt("รหัสผ่านไม่ตรงกัน", "Passwords do not match")
                    if (pass.length < 6) return tt("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร", "Password must be at least 6 characters")
                    return null
                  }}
                  onSubmit={handleChangePassword}
                />

                {/* Danger Zone */}
                <Card className="border-destructive/20 shadow-none bg-destructive/5 mt-8">
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-destructive/20 rounded-lg bg-background/50">
                      <div>
                        <h4 className="font-medium text-destructive">{tt("ลบบัญชีผู้ใช้", "Delete account")}</h4>
                        <p className="text-sm text-muted-foreground">{tt("บัญชี ข้อความ การแลกเปลี่ยน และสิ่งของทั้งหมดจะถูกลบถาวร", "Your account, messages, exchanges, and items will be permanently deleted.")}</p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={() => setDeleteAccountDialog(true)}
                        className="shrink-0 w-full sm:w-auto"
                      >
                        {tt("ลบบัญชี", "Delete account")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Item Dialog - Using UnifiedModal for consistent sizing */}
      <UnifiedModal
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        size="lg"
        title={tt("แก้ไขสิ่งของ", "Edit item")}
        description={tt("แก้ไขข้อมูลสิ่งของของคุณ", "Update your item details")}
        icon={<Edit className="h-5 w-5" />}
        footer={
          <div className="space-y-3 w-full">
            {/* Delete Button - Separated */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">{tt("ลบสิ่งของนี้", "Delete this item")}</p>
                <p className="text-xs text-muted-foreground">{tt("การดำเนินการนี้ไม่สามารถย้อนกลับได้", "This action cannot be undone.")}</p>
              </div>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDeleteDialog({ open: true, itemId: selectedItem?.id || null })
                }}
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                {tt("ลบ", "Delete")}
              </Button>
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedItem(null)}
              >
                {tt("ยกเลิก", "Cancel")}
              </Button>
              <Button 
                onClick={handleSaveItemEdit} 
                disabled={savingItem || !editTitle.trim()}
                className="gap-2"
              >
                {savingItem ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tt("กำลังบันทึก...", "Saving...")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {tt("บันทึกการเปลี่ยนแปลง", "Save changes")}
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* รูปภาพ - แก้ไข/เพิ่ม/ลบ */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-primary" />
                {tt("รูปภาพ", "Images")} ({editImageUrls.length}/{IMAGE_UPLOAD_CONFIG.maxImages})
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {editImageUrls.map((ref, index) => (
                  <div key={`${ref}-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted border group">
                    <Image
                      src={resolveImageUrl(ref, { width: 200 })}
                      alt={tt(`รูปที่ ${index + 1}`, `Image ${index + 1}`)}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                    <button
                      type="button"
                      onClick={() => setEditImageUrls((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={tt("ลบรูป", "Remove image")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                        {tt("หลัก", "Primary")}
                      </span>
                    )}
                  </div>
                ))}
                {editImageUrls.length < IMAGE_UPLOAD_CONFIG.maxImages && (
                  <label className="aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 hover:border-primary/50 flex flex-col items-center justify-center gap-1">
                    {uploadingItemImage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{tt("เพิ่มรูป", "Add image")}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      className="hidden"
                      onChange={handleEditItemImageUpload}
                      disabled={uploadingItemImage || savingItem}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {tt(`สูงสุด ${IMAGE_UPLOAD_CONFIG.maxImages} รูป (JPEG, PNG)`, `Up to ${IMAGE_UPLOAD_CONFIG.maxImages} images (JPEG, PNG)`)}
              </p>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-title" className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  {tt("ชื่อสิ่งของ", "Item name")}
                  <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {editTitle.length}/100
                </span>
              </div>
              <Input 
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value.slice(0, 100))}
                placeholder={tt("ระบุชื่อสิ่งของ...", "Enter item name...")}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {tt("ชื่อที่ชัดเจนจะช่วยให้คนอื่นเข้าใจง่ายขึ้น", "A clear title helps others understand your item quickly.")}
              </p>
            </div>
            
            {/* Description Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-description" className="text-sm font-semibold flex items-center gap-2">
                  <Edit className="h-4 w-4 text-primary" />
                  {tt("คำอธิบาย", "Description")}
                </Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {editDescription.length}/1000
                </span>
              </div>
              <Textarea 
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value.slice(0, 1000))}
                placeholder={tt("อธิบายรายละเอียด สภาพ หรือข้อมูลเพิ่มเติม...", "Describe condition and extra details...")}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {tt("รายละเอียดที่ดีจะช่วยเพิ่มโอกาสในการแลกเปลี่ยน", "A good description increases exchange chances.")}
              </p>
            </div>

            {/* สถานที่นัดรับ */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {tt("สถานที่นัดรับ", "Pickup location")} <span className="text-destructive">*</span>
              </Label>
              <Select value={editLocation} onValueChange={setEditLocation} disabled={savingItem}>
                <SelectTrigger className="w-full">
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
              <Input
                placeholder={tt("รายละเอียดสถานที่ (ไม่บังคับ)", "Location detail (optional)")}
                value={editLocationDetail}
                onChange={(e) => setEditLocationDetail(e.target.value.slice(0, 200))}
                maxLength={200}
                className="mt-1"
                disabled={savingItem}
              />
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">{tt("สถานะปัจจุบัน", "Current status")}</span>
              </div>
              <Badge variant="outline" className={statusColors[selectedItem.status]}>
                {statusLabels[selectedItem.status]}
              </Badge>
            </div>
          </div>
        )}
      </UnifiedModal>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle>{tt("ยืนยันการลบ", "Confirm deletion")}</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {tt("คุณแน่ใจหรือไม่ว่าต้องการลบสิ่งของนี้?", "Are you sure you want to delete this item?")}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            ⚠️ {tt("การดำเนินการนี้ไม่สามารถย้อนกลับได้", "This action cannot be undone")}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt("ยกเลิก", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">
              {tt("ลบสิ่งของ", "Delete item")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteAccountDialog} onOpenChange={(open) => {
        setDeleteAccountDialog(open)
        if (!open) setDeleteConfirmText("")
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-destructive">{tt("ลบบัญชีถาวร", "Delete account permanently")}</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {tt(
                    "การกระทำนี้จะลบข้อมูลบัญชีของคุณ ข้อมูลส่วนตัว และประวัติทั้งหมดออกจากระบบ **ไม่สามารถกู้คืนได้**",
                    "This action will permanently remove your account, personal data, and history. **It cannot be recovered.**"
                  )}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
              {tt("พิมพ์คำว่า ", "Type ")}<span className="font-bold select-all">DELETE</span>{tt(" เพื่อยืนยัน", " to confirm")}
            </div>
            <Input 
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="border-destructive/30 focus-visible:ring-destructive/30"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount}>{tt("ยกเลิก", "Cancel")}</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount} 
              disabled={deleteConfirmText !== "DELETE" || deletingAccount}
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tt("กำลังลบ...", "Deleting...")}
                </>
              ) : (
                tt("ยืนยันการลบบัญชี", "Confirm account deletion")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function editDisplayNameFromProfile(profile: any): string {
    return profile?.displayName || ""
}
