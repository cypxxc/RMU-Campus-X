"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { getItems, deleteItem, updateItem, getExchangesByUser } from "@/lib/firestore"
import { updateUserPassword, deleteUserAccount } from "@/lib/auth"
import type { Item, Exchange } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { Loader2, Shield, Package, Trash2, Edit, Save, ArrowLeft, CheckCircle, History, Camera, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import Image from "next/image"
import { uploadToCloudinary } from "@/lib/storage"
import { updateUserProfile, getUserProfile } from "@/lib/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings } from "lucide-react"
import { LineNotificationSettings } from "@/components/line-notification-settings"
import { UnifiedModal } from "@/components/ui/unified-modal"

// Refactored Components
import { MyItemsList } from "@/components/profile/my-items-list"
import { CompletedExchangesList } from "@/components/profile/completed-exchanges-list"
import { EditProfileForm } from "@/components/profile/edit-profile-form"
import { PasswordChangeForm } from "@/components/profile/password-change-form"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // Data State
  const [myItems, setMyItems] = useState<Item[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [completedExchanges, setCompletedExchanges] = useState<Exchange[]>([])
  const [loadingExchanges, setLoadingExchanges] = useState(true)

  // Edit Item State
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [savingItem, setSavingItem] = useState(false)
  
  // Profile Image State
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Dialogs State
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null })
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    } else if (!authLoading && user) {
      setLoading(false)
      loadProfile()
      loadMyItems()
    }
  }, [user, authLoading, router])

  const loadCompletedExchanges = async () => {
    if (!user) return
    setLoadingExchanges(true)
    try {
      const result = await getExchangesByUser(user.uid)
      if (result.success && result.data) {
        const completed = result.data.exchanges.filter(e => e.status === 'completed')
        setCompletedExchanges(completed)
      } else {
        setCompletedExchanges([])
      }
    } catch (error) {
      console.error("Error loading completed exchanges:", error)
      setCompletedExchanges([])
    } finally {
      setLoadingExchanges(false)
    }
  }

  useEffect(() => {
    if (user) loadCompletedExchanges()
  }, [user])

  const loadProfile = async () => {
    if (!user) return
    try {
      const profile = await getUserProfile(user.uid)
      if (profile) {
        setUserProfile(profile)
        setProfileImage(profile.photoURL || null)
      }
    } catch (error: any) {
      console.error("Error loading profile:", error)
    }
  }

  const loadMyItems = async () => {
    if (!user) return
    setLoadingItems(true)
    try {
      const result = await getItems()
      if (result.success && result.data) {
        const filtered = result.data.items
          .filter((item: Item) => item.postedBy === user.uid)
          .sort((a: Item, b: Item) => {
            const dateA = (a.postedAt as any)?.toDate?.() || new Date()
            const dateB = (b.postedAt as any)?.toDate?.() || new Date()
            return dateB.getTime() - dateA.getTime()
          })
        setMyItems(filtered)
      } else {
        setMyItems([])
      }
    } catch (error: any) {
      console.error('[Profile] Error loading items:', error)
      setMyItems([])
    } finally {
      setLoadingItems(false)
    }
  }

  const handleOpenEditItem = (item: Item) => {
    setSelectedItem(item)
    setEditTitle(item.title)
    setEditDescription(item.description)
  }

  const handleSaveItemEdit = async () => {
    if (!selectedItem) return
    if (!editTitle.trim()) {
      toast({ title: "กรุณากรอกชื่อสิ่งของ", variant: "destructive" })
      return
    }
    setSavingItem(true)
    try {
      await updateItem(selectedItem.id, { 
        title: editTitle.trim(), 
        description: editDescription.trim() 
      })
      toast({ title: "บันทึกสำเร็จ" })
      loadMyItems()
      setSelectedItem(null)
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
    } finally {
      setSavingItem(false)
    }
  }

  const handleUpdateProfile = async (data: { displayName: string; bio: string }) => {
    if (!user) return
    try {
      await updateUserProfile(user.uid, {
        displayName: data.displayName.trim(),
        bio: data.bio.trim(),
        photoURL: profileImage || "",
        email: user.email || ""
      })
      toast({ title: "อัปเดตโปรไฟล์สำเร็จ" })
      loadProfile()
    } catch (error: any) {
      console.error(error)
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
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
        email: user.email || ""
      })
      toast({ title: "อัปโหลดรูปโปรไฟล์สำเร็จ" })
      loadProfile()
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาดในการอัปโหลด", description: error.message, variant: "destructive" })
    } finally {
      setUploadingImage(false)
    }
  }


  const handleDeleteItem = async () => {
    if (!deleteDialog.itemId) return
    try {
      await deleteItem(deleteDialog.itemId)
      toast({ title: "ลบสิ่งของสำเร็จ" })
      loadMyItems()
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
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
          title: "ต้องเข้าสู่ระบบใหม่", 
          description: "เพื่อความปลอดภัย กรุณาออกจากระบบและเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน",
          variant: "destructive" 
        })
      } else {
        toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
      }
      throw error // Re-throw to let component stop loading state
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== "DELETE") return

    setDeletingAccount(true)
    try {
      await deleteUserAccount(user)
      toast({ title: "ลบบัญชีผู้ใช้เรียบร้อยแล้ว" })
      router.push("/login")
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast({ 
          title: "ต้องเข้าสู่ระบบใหม่", 
          description: "เพื่อความปลอดภัย กรุณาออกจากระบบและเข้าสู่ระบบใหม่ก่อนลบบัญชี",
          variant: "destructive" 
        })
      } else {
        toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
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
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-soft overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardContent className="px-6 pt-10 text-center pb-8">
                <div className="relative inline-block group">
                  <Avatar className="h-32 w-32 border-4 border-background ring-2 ring-primary/20 shadow-xl">
                    <AvatarImage src={profileImage || undefined} className="object-cover" />
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
                  <h2 className="text-xl font-bold">{userProfile?.displayName || "ผู้ใช้งาน"}</h2>
                  <p className="text-sm text-muted-foreground truncate max-w-full px-4">{user.email}</p>
                  
                  <Button 
                    variant="link" 
                    className="text-primary h-auto p-0 text-xs mt-1"
                    onClick={() => router.push(`/profile/${user.uid}`)}
                  >
                    ดูมุมมองสาธารณะ
                  </Button>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                   {user.emailVerified ? (
                    <Badge className="gap-1.5 py-1 px-3 bg-primary/10 text-primary border-primary/20 rounded-full" variant="outline">
                      <CheckCircle className="h-3.5 w-3.5" />
                      ยืนยันตัวตนแล้ว
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5 py-1 px-3 bg-destructive/10 text-destructive border-destructive/20 rounded-full">
                      ยังไม่ยืนยันอีเมล
                    </Badge>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-black text-primary">{myItems.length}</p>
                    <p className="text--[10px] uppercase tracking-wider font-bold text-muted-foreground">สิ่งของ</p>
                  </div>
                  <div className="text-center border-l">
                    <p className="text-2xl font-black text-primary">
                      {myItems.filter(i => i.status === 'completed').length}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">สำเร็จ</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-soft bg-muted/30">
               <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-muted-foreground">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">บัญชีของคุณปลอดภัย</p>
                    <p className="text-xs text-muted-foreground">ข้อมูลส่วนตัวถูกจัดเก็บอย่างปลอดภัย</p>
                  </div>
               </CardContent>
            </Card>
          </div>

          {/* Right Column: Content Tabs */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="items" className="space-y-6">
              <TabsList className="bg-muted/50 p-1 border h-12 w-full sm:w-auto justify-start inline-flex">
                <TabsTrigger value="items" className="px-4 gap-2 h-full">
                  <Package className="h-4 w-4" />
                  สิ่งของ
                </TabsTrigger>
                <TabsTrigger value="history" className="px-4 gap-2 h-full">
                  <History className="h-4 w-4" />
                  ประวัติแลกเปลี่ยน
                </TabsTrigger>
                <TabsTrigger value="settings" className="px-4 gap-2 h-full">
                  <Settings className="h-4 w-4" />
                  ตั้งค่า
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
                    if (pass !== confirm) return "รหัสผ่านไม่ตรงกัน"
                    if (pass.length < 6) return "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"
                    return null
                  }}
                  onSubmit={handleChangePassword}
                />

                {/* Danger Zone */}
                <Card className="border-destructive/20 shadow-none bg-destructive/5 mt-8">
                  <CardHeader>
                    <CardTitle className="text-lg text-destructive flex items-center gap-2">
                       <AlertTriangle className="h-5 w-5" />
                       พื้นที่อันตราย (Danger Zone)
                    </CardTitle>
                    <CardDescription>การดำเนินการเหล่านี้ไม่สามารถย้อนกลับได้</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-background/50">
                      <div>
                        <h4 className="font-medium text-destructive">ลบบัญชีผู้ใช้</h4>
                        <p className="text-sm text-muted-foreground">ข้อความ ข้อมูล และสิ่งของทั้งหมดจะถูกลบถาวร</p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={() => setDeleteAccountDialog(true)}
                      >
                        ลบบัญชี
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
        title="แก้ไขสิ่งของ"
        description="แก้ไขข้อมูลสิ่งของของคุณ"
        icon={<Edit className="h-5 w-5" />}
        footer={
          <div className="space-y-3 w-full">
            {/* Delete Button - Separated */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">ลบสิ่งของนี้</p>
                <p className="text-xs text-muted-foreground">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
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
                ลบ
              </Button>
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedItem(null)}
              >
                ยกเลิก
              </Button>
              <Button 
                onClick={handleSaveItemEdit} 
                disabled={savingItem || !editTitle.trim()}
                className="gap-2"
              >
                {savingItem ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    บันทึกการเปลี่ยนแปลง
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Image Preview - Compact */}
            {(selectedItem.imageUrls?.[0] || selectedItem.imageUrl) && (
              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-linear-to-br from-muted to-muted/50 border shadow-sm group">
                <Image 
                  src={selectedItem.imageUrls?.[0] || selectedItem.imageUrl || ''} 
                  alt={selectedItem.title} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-300" 
                  unoptimized 
                />
              </div>
            )}
            
            {/* Title Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-title" className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  ชื่อสิ่งของ
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
                placeholder="ระบุชื่อสิ่งของ..."
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                ชื่อที่ชัดเจนจะช่วยให้คนอื่นเข้าใจง่ายขึ้น
              </p>
            </div>
            
            {/* Description Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-description" className="text-sm font-semibold flex items-center gap-2">
                  <Edit className="h-4 w-4 text-primary" />
                  คำอธิบาย
                </Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {editDescription.length}/1000
                </span>
              </div>
              <Textarea 
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value.slice(0, 1000))}
                placeholder="อธิบายรายละเอียด สภาพ หรือข้อมูลเพิ่มเติม..."
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                รายละเอียดที่ดีจะช่วยเพิ่มโอกาสในการแลกเปลี่ยน
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">สถานะปัจจุบัน</span>
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
                <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  คุณแน่ใจหรือไม่ว่าต้องการลบสิ่งของนี้?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">
              ลบสิ่งของ
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
                <AlertDialogTitle className="text-destructive">ลบบัญชีถาวร</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  การกระทำนี้จะลบข้อมูลบัญชีของคุณ ข้อมูลส่วนตัว และประวัติทั้งหมดออกจากระบบ **ไม่สามารถกู้คืนได้**
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
              พิมพ์คำว่า <span className="font-bold select-all">DELETE</span> เพื่อยืนยัน
            </div>
            <Input 
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="border-destructive/30 focus-visible:ring-destructive/30"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount}>ยกเลิก</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount} 
              disabled={deleteConfirmText !== "DELETE" || deletingAccount}
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ยืนยันการลบบัญชี"
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
