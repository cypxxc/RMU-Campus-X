"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import { 
  Package, 
  Star,
  MessageSquare,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Edit2
} from "lucide-react"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

import { StarRating } from "@/components/star-rating"

import { getUserPublicProfile } from "@/lib/firestore"
import { ItemCard } from "@/components/item-card"
import { ItemDetailView } from "@/components/item-detail-view"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/components/auth-provider"
import type { User, Item } from "@/types"

/** แปลงค่า createdAt ที่อาจเป็น Firestore Timestamp, Date หรือ string เป็น Date */
function toDate(createdAt: unknown): Date | null {
  if (createdAt == null) return null
  if (typeof (createdAt as { toDate?: () => Date }).toDate === "function") {
    return (createdAt as { toDate: () => Date }).toDate()
  }
  if (createdAt instanceof Date) return createdAt
  try {
    const d = new Date(createdAt as string | number)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/** ใช้เฉพาะ uid ที่ถูกต้องจาก URL — ป้องกันโหลดรายการทั้งระบบ (แสดงของแอดมิน) เมื่อ postedBy ไม่ส่ง */
function isValidProfileUid(uid: unknown): uid is string {
  return typeof uid === "string" && uid.length > 0 && uid !== "undefined" && uid !== "null"
}

export default function PublicProfilePage() {
  const params = useParams()
  const { user: currentUser } = useAuth()
  const rawUid = params?.uid as string | undefined
  const uid = isValidProfileUid(rawUid) ? rawUid : ""

  const [profile, setProfile] = useState<Partial<User> | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewerProfiles, setReviewerProfiles] = useState<Record<string, { displayName?: string; photoURL?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      setLoadingItems(false)
      setProfile(null)
      setItems([])
      setReviews([])
      return
    }
    loadProfile()
    loadUserItems()
    loadReviews()
  }, [uid])

  /* Bio Editing State */
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioInput, setBioInput] = useState("")
  const [isSavingBio, setIsSavingBio] = useState(false)
  const { toast } = useToast() // Ensure toast hook is available

  const handleSaveBio = async () => {
    if (!currentUser || !profile) return
    
    try {
      setIsSavingBio(true)
      const { updateUserProfile } = await import("@/lib/db/users")
      
      await updateUserProfile(currentUser.uid, {
        bio: bioInput.trim()
      })
      
      // Update local state
      setProfile(prev => prev ? { ...prev, bio: bioInput.trim() } : null)
      setIsEditingBio(false)
      
      toast({
        title: "บันทึกสำเร็จ",
        description: "อัปเดตคำแนะนำตัวเรียบร้อยแล้ว",
      })
    } catch (error) {
      console.error("Error saving bio:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      })
    } finally {
      setIsSavingBio(false)
    }
  }

  const loadReviews = async () => {
    if (!uid) {
      setReviews([])
      setReviewerProfiles({})
      setLoadingReviews(false)
      return
    }
    try {
      setLoadingReviews(true)
      const { getUserReviews } = await import("@/lib/db/reviews")
      const userReviews = await getUserReviews(uid, 50)
      if (!mountedRef.current) return
      const filtered = userReviews.filter((r: { targetUserId?: string }) => String(r.targetUserId) === uid)
      setReviews(filtered)

      const reviewerIds: string[] = [...new Set((filtered as { reviewerId?: string }[]).map((r) => r.reviewerId).filter((id): id is string => Boolean(id)))]
      const profiles: Record<string, { displayName?: string; photoURL?: string }> = {}
      await Promise.all(
        reviewerIds.map(async (reviewerId) => {
          const p = await getUserPublicProfile(reviewerId)
          if (mountedRef.current && p) profiles[reviewerId] = { displayName: p.displayName, photoURL: p.photoURL }
        })
      )
      if (mountedRef.current) setReviewerProfiles(profiles)
    } catch (error) {
      if (!mountedRef.current) return
      console.error("Error loading reviews:", error)
    } finally {
      if (mountedRef.current) setLoadingReviews(false)
    }
  }

  const loadProfile = async () => {
    try {
      setLoading(true)
      const data = await getUserPublicProfile(uid)
      if (!mountedRef.current) return
      if (!data) return
      setProfile(data)
    } catch (error) {
      if (!mountedRef.current) return
      console.error("Error loading profile:", error)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const loadUserItems = async () => {
    if (!uid) {
      setItems([])
      setLoadingItems(false)
      return
    }
    try {
      setLoadingItems(true)
      const { getItems } = await import("@/lib/firestore")
      const result = await getItems({ postedBy: uid, pageSize: 100 })
      if (!mountedRef.current) return
      if (result.success && result.data) {
        let userItems = result.data.items
        userItems = userItems
          .filter((item: Item) => String(item.postedBy) === uid && ["available", "pending"].includes(item.status))
          .sort((a: Item, b: Item) => {
            const timeA = (a.postedAt as { toMillis?: () => number })?.toMillis?.() ?? (typeof a.postedAt === "string" ? new Date(a.postedAt).getTime() : 0)
            const timeB = (b.postedAt as { toMillis?: () => number })?.toMillis?.() ?? (typeof b.postedAt === "string" ? new Date(b.postedAt).getTime() : 0)
            return timeB - timeA
          })
        setItems(userItems)
      } else {
        setItems([])
      }
    } catch (error) {
      if (!mountedRef.current) return
      console.error("Error loading items:", error)
    } finally {
      if (mountedRef.current) setLoadingItems(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-muted rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">ไม่พบผู้ใช้งาน</h1>
        <p className="text-muted-foreground mb-6">ผู้ใช้งานนี้อาจถูกลบหรือไม่มีอยู่ในระบบ</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="relative mb-8 group">
          {/* Minimal Gradient Background with Glass Effect */}
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-primary/5 to-transparent rounded-3xl -z-10" />
          
          <div className="relative pt-8 pb-6 px-6 sm:px-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Profile Image with Ring Animation */}
              <div className="relative shrink-0">
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 rounded-full ring-4 ring-background shadow-xl">
                  <AvatarImage src={profile.photoURL || undefined} alt={profile.displayName || "ผู้ใช้งาน"} className="object-cover" />
                  <AvatarFallback className="text-3xl bg-primary/5 text-primary">
                    {profile.displayName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                {profile.status === 'ACTIVE' && (
                  <div className="absolute bottom-1 right-1 h-8 w-8 bg-background rounded-full flex items-center justify-center shadow-sm" title="ยืนยันตัวตนแล้ว">
                     <ShieldCheck className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                  </div>
                )}
              </div>
              
              {/* User Info - Centered on Mobile, Left on Desktop */}
              <div className="flex-1 text-center sm:text-left space-y-3 pt-2">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground/90">
                    {profile.displayName || "ผู้ใช้งาน"}
                  </h1>
                </div>

                {/* Bio / Introduction Section */}
                <div className="pt-3 max-w-lg mx-auto sm:mx-0">
                  {isEditingBio ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="bio" className="sr-only">แนะนำตัว</Label>
                      <Textarea
                        id="bio"
                        placeholder="แนะนำตัวสั้นๆ หรือบอกเวลาที่สะดวก..."
                        className="bg-background/50 text-sm resize-none min-h-[80px]"
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value)}
                        maxLength={300}
                      />
                      <div className="flex gap-2 justify-end">
                         <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditingBio(false)} disabled={isSavingBio}>ยกเลิก</Button>
                         <Button size="sm" className="h-7 text-xs" onClick={handleSaveBio} disabled={isSavingBio}>
                           {isSavingBio ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                           บันทึก
                         </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group/bio relative">
                      <p className={`text-sm leading-relaxed ${profile.bio ? "text-foreground/80" : "text-muted-foreground italic"}`}>
                        {profile.bio || (currentUser?.uid === uid ? "เพิ่มคำแนะนำตัว..." : "ไม่ได้ระบุข้อมูลแนะนำตัว")}
                      </p>
                      
                      {currentUser?.uid === uid && (
                        <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => {
                             setBioInput(profile.bio || "")
                             setIsEditingBio(true)
                           }}
                           className="absolute -right-8 -top-1 h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover/bio:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                           title="แก้ไขคำแนะนำตัว"
                        >
                           <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Minimal Stats Row */}
                <div className="flex items-center justify-center sm:justify-start gap-6 pt-4">
                   <div className="text-center sm:text-left">
                      <p className="text-2xl font-bold text-foreground">{items.length}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">โพส</p>
                   </div>
                   <div className="w-px h-8 bg-border" />
                   <div className="text-center sm:text-left">
                      <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">รีวิว</p>
                   </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="items" className="gap-2">
            <Package className="h-4 w-4" />
            รายการโพส ({items.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="h-4 w-4" />
            รีวิว ({reviews.length})
          </TabsTrigger>
          {/* <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            ประวัติการแลกเปลี่ยน
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="reviews" className="space-y-6">
           {loadingReviews ? (
               <div className="flex justify-center py-12">
                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
               </div>
           ) : reviews.length > 0 ? (
             <div className="grid gap-4">
               {reviews.map((review) => {
                 const reviewer = reviewerProfiles[review.reviewerId]
                 const displayName = reviewer?.displayName?.trim() || review.reviewerName
                 const avatarUrl = reviewer?.photoURL || review.reviewerAvatar
                 return (
                 <Card key={review.id} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                           <Avatar className="h-10 w-10 shrink-0">
                             <AvatarImage src={avatarUrl || undefined} alt={displayName} className="object-cover" />
                             <AvatarFallback className="text-xs bg-primary/10 text-primary">
                               {displayName?.[0] || "?"}
                             </AvatarFallback>
                           </Avatar>
                           <div className="space-y-1">
                              <h4 className="font-semibold text-sm">{displayName}</h4>
                              <StarRating rating={review.rating} readOnly size={14} />
                              <p className="text-sm text-muted-foreground mt-1">{review.comment ?? "—"}</p>
                              <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded inline-block mt-2">
                                แลกเปลี่ยน: {review.itemTitle}
                              </div>
                           </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {toDate(review.createdAt) ? formatDistanceToNow(toDate(review.createdAt)!, { addSuffix: true, locale: th }) : ''}
                        </span>
                      </div>
                    </CardContent>
                 </Card>
               );})}
             </div>
           ) : (
             <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-medium">ไม่มีรีวิว</h3>
                <p className="text-sm text-muted-foreground">ผู้ใช้นี้ยังไม่ได้รับการรีวิว</p>
             </div>
           )}
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          {loadingItems ? (
             <div className="flex justify-center py-12">
               <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
             </div>
          ) : items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {items
                  .slice((currentPage - 1) * 12, currentPage * 12)
                  .map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      showRequestButton={!!currentUser}
                      onViewDetails={(item) => setSelectedItem(item)}
                    />
                ))}
              </div>

              {/* Modal รายละเอียดสิ่งของ — เปิดเมื่อคลิกที่การ์ด */}
              <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="max-w-4xl overflow-hidden border-none shadow-2xl p-0">
                  <DialogTitle className="sr-only">รายละเอียดสิ่งของ</DialogTitle>
                  <div className="p-4 sm:p-6 md:p-8">
                    {selectedItem && (
                      <ItemDetailView
                        item={selectedItem}
                        isModal={true}
                        onClose={() => setSelectedItem(null)}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {items.length > 12 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ก่อนหน้า
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    หน้า {currentPage} จาก {Math.ceil(items.length / 12)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(items.length / 12), p + 1))}
                    disabled={currentPage >= Math.ceil(items.length / 12)}
                  >
                    ถัดไป
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-medium">ไม่มีรายการโพส</h3>
              <p className="text-sm text-muted-foreground">ผู้ใช้นี้ยังไม่มีรายการโพสที่กำลังลงประกาศ</p>
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}
