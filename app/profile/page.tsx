"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { getItems, deleteItem, updateItem, getExchangesByUser } from "@/lib/firestore"
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
import { Loader2, Shield, Package, Trash2, Edit, Save, ArrowLeft, CheckCircle, History } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import { processImage } from "@/lib/storage"
import { updateUserProfile, getUserProfile } from "@/lib/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Settings } from "lucide-react"
import { LineNotificationSettings } from "@/components/line-notification-settings"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"
import { UnifiedModal } from "@/components/ui/unified-modal"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [myItems, setMyItems] = useState<Item[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editDisplayName, setEditDisplayName] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null })
  const [completedExchanges, setCompletedExchanges] = useState<Exchange[]>([])
  const [loadingExchanges, setLoadingExchanges] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [exchangePage, setExchangePage] = useState(1)
  const itemsPerPage = 10
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
      const exchanges = await getExchangesByUser(user.uid)
      // Get completed exchanges (both as requester and owner)
      const completed = exchanges.filter(e => e.status === 'completed')
      setCompletedExchanges(completed)
    } catch (error) {
      console.error("Error loading completed exchanges:", error)
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
        setEditDisplayName(profile.displayName || "")
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
      
      // Handle ApiResponse format
      if (result.success && result.data) {
        const filtered = result.data.items
          .filter(item => item.postedBy === user.uid)
          .sort((a, b) => {
            const dateA = (a.postedAt as any)?.toDate?.() || new Date()
            const dateB = (b.postedAt as any)?.toDate?.() || new Date()
            return dateB.getTime() - dateA.getTime()
          })
        setMyItems(filtered)
      } else {
        console.error('[Profile] Error:', result.error)
        setMyItems([])
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.error || "ไม่สามารถโหลดข้อมูลได้",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('[Profile] Error:', error)
      setMyItems([])
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      })
    } finally {
      setLoadingItems(false)
    }
  }

  const handleOpenEdit = (item: Item) => {
    setSelectedItem(item)
    setEditTitle(item.title)
    setEditDescription(item.description)
  }

  const handleSaveEdit = async () => {
    if (!selectedItem) return
    if (!editTitle.trim()) {
      toast({ title: "กรุณากรอกชื่อสิ่งของ", variant: "destructive" })
      return
    }
    setSaving(true)
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
      setSaving(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      await updateUserProfile(user.uid, {
        displayName: editDisplayName.trim(),
        photoURL: profileImage || "",
        email: user.email || ""
      })
      toast({ title: "อัปเดตโปรไฟล์สำเร็จ" })
      loadProfile() // Reload local data
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const result = await processImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.7 })
      setProfileImage(result.full)
      if (user) {
        await updateUserProfile(user.uid, { 
          photoURL: result.full,
          email: user.email || ""
        })
        toast({ title: "อัปโหลดรูปโปรไฟล์สำเร็จ" })
        loadProfile() // Reload local data
      }
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

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
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">สิ่งของ</p>
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
                {loadingItems ? (
                  <div className="py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-4">กำลังโหลดรายการ...</p>
                  </div>
                ) : myItems.length === 0 ? (
                  <Card className="border-dashed py-20 bg-muted/20">
                    <CardContent className="flex flex-col items-center text-center space-y-4">
                      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold italic">คุณยังไม่ได้ลงประกาศสิ่งของ</h3>
                        <p className="text-muted-foreground text-sm max-w-xs">
                          เริ่มแบ่งปันสิ่งของที่คุณไม่ได้ใช้กับเพื่อนนักศึกษาได้เลยวันนี้
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      {myItems
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((item, index) => {
                        const postedDate = (item.postedAt as any)?.toDate?.() || new Date()
                        return (
                          <BounceWrapper 
                            key={item.id} 
                            variant="bounce-up"
                            delay={index * 0.05}
                            className="group"
                          >
                            <Card 
                              className="border-none shadow-soft hover:shadow-md transition-all overflow-hidden"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center">
                              {/* Image Part */}
                              <div className="relative w-24 h-24 m-4 rounded-xl overflow-hidden bg-muted shrink-0">
                                {(item.imageUrls?.[0] || item.imageUrl) ? (
                                  <Image src={item.imageUrls?.[0] || item.imageUrl || ''} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
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
                                    ประกาศเมื่อ {formatDistanceToNow(postedDate, { addSuffix: true, locale: th })}
                                  </span>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      className="h-8 rounded-full"
                                      onClick={() => handleOpenEdit(item)}
                                    >
                                      <Edit className="h-3.5 w-3.5 mr-1" />
                                      แก้ไข
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                                      onClick={() => setDeleteDialog({ open: true, itemId: item.id })}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                          </BounceWrapper>
                        )
                      })}
                    </div>
                    
                    {/* Pagination */}
                    {myItems.length > itemsPerPage && (
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
                          {Array.from({ length: Math.ceil(myItems.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
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
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(myItems.length / itemsPerPage), p + 1))}
                          disabled={currentPage === Math.ceil(myItems.length / itemsPerPage)}
                        >
                          ถัดไป
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 focus-visible:outline-none">
                {loadingExchanges ? (
                  <div className="py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-4">กำลังโหลดประวัติ...</p>
                  </div>
                ) : completedExchanges.length === 0 ? (
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
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      {completedExchanges
                        .slice((exchangePage - 1) * itemsPerPage, exchangePage * itemsPerPage)
                        .map((exchange, index) => {
                        const createdAt = (exchange.createdAt as any)?.toDate?.() || new Date()
                        const isOwner = exchange.ownerId === user?.uid
                        return (
                          <BounceWrapper 
                            key={exchange.id} 
                            variant="bounce-up"
                            delay={index * 0.05}
                          >
                            <Card 
                              className="border-none shadow-soft hover:shadow-md transition-all overflow-hidden"
                          >
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
                                    {formatDistanceToNow(createdAt, { addSuffix: true, locale: th })}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          </BounceWrapper>
                        )
                      })}
                    </div>
                    
                    {/* Pagination */}
                    {completedExchanges.length > itemsPerPage && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExchangePage(p => Math.max(1, p - 1))}
                          disabled={exchangePage === 1}
                        >
                          ก่อนหน้า
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.ceil(completedExchanges.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                            <Button
                              key={page}
                              variant={exchangePage === page ? "default" : "ghost"}
                              size="sm"
                              className="w-8 h-8"
                              onClick={() => setExchangePage(page)}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExchangePage(p => Math.min(Math.ceil(completedExchanges.length / itemsPerPage), p + 1))}
                          disabled={exchangePage === Math.ceil(completedExchanges.length / itemsPerPage)}
                        >
                          ถัดไป
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="settings" className="focus-visible:outline-none">
                <Card className="border-none shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg">แก้ไขโปรไฟล์</CardTitle>
                    <CardDescription>การเปลี่ยนแปลงจะมีผลทั่วถึงทั้งระบบ</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-sm font-bold">ชื่อที่แสดง (Display Name)</Label>
                      <Input 
                        id="displayName"
                        placeholder="ใส่ชื่อของคุณ..."
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="h-11 bg-muted/20"
                      />
                      <p className="text-[11px] text-muted-foreground">ชื่อนี้จะปรากฏเมื่อคุณแชทหรือประกาศสิ่งของ</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold opacity-50">อีเมล (เปลี่ยนไม่ได้)</Label>
                      <Input 
                        disabled
                        value={user.email || ""}
                        className="h-11 bg-muted/50"
                      />
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                      <Button 
                        onClick={handleUpdateProfile} 
                        disabled={savingProfile}
                        className="rounded-full px-8 h-11"
                      >
                        {savingProfile ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        บันทึกการเปลี่ยนแปลง
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* LINE Notification Settings */}
                <div className="mt-6">
                  <LineNotificationSettings profile={userProfile} onUpdate={loadProfile} />
                </div>
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
                onClick={handleSaveEdit} 
                disabled={saving || !editTitle.trim()}
                className="gap-2"
              >
                {saving ? (
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
              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 border shadow-sm group">
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
            <AlertDialogAction 
              onClick={handleDeleteItem} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบสิ่งของ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
