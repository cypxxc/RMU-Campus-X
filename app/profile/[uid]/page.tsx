"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import { 
  Calendar, 
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
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import type { User, Item } from "@/types"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"
import { ProfileBadges } from "@/components/profile/profile-badges"

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

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const uid = params?.uid as string

  const [profile, setProfile] = useState<Partial<User> | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (uid) {
      loadProfile()
      loadUserItems()
      loadReviews()
    }
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
    try {
      setLoadingReviews(true)
      const { getUserReviews } = await import("@/lib/db/reviews")
      const userReviews = await getUserReviews(uid)
      setReviews(userReviews)
    } catch (error) {
       console.error("Error loading reviews:", error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const loadProfile = async () => {
    try {
      setLoading(true)
      const data = await getUserPublicProfile(uid)
      if (!data) {
        // Handle user not found
        return
      }
      setProfile(data)
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserItems = async () => {
    try {
      setLoadingItems(true)
      // Fetch items posted by this user
      // Note: getItems might need adjustment or we filter client side if API allows
      // Assuming getItems supports basic filtering or we fetch all and filter (not ideal for large sets but ok for MVP)
      // Ideally update getItems to accept ownerId
      
      // For now, let's try fetching and see if we can filter/use existing params
      // Since existing getItems signature is (category, limit, lastDoc), we define a new way or filtered listing
      // Actually, looking at previous code, verify getItems implementation or use query directly here if needed
      // BUT safest is to use what we have or add a helper.
      
      // Checking `lib/db/items.ts` would be good. 
      // Assuming we have a way. If not, I'll use a direct query here for simplicity or add `getItemsByOwner` helper.
      // Let's assume I need to fetch items. I will use a direct query for now to avoid modifying lib too much unless I see it.
      
      // Actually, let's try to match existing patterns. 
      // I'll skip complex logic and assume I can add a helper or import it.
      // Wait, I saw `getItems` in `lib/firestore.ts` exports.
      // Let's check `lib/db/items.ts`... wait I didn't verify if `getItems` supports ownerId.
      // I'll create a new function `getUserItems` in this file or just fetch here? 
      // Better to import `{ collection, query, where, getDocs, orderBy }` and do it here or add to lib.
      // I'll add `getItemsByOwner` to lib/db/items.ts in next step if this fails, but for now let's try to use standard pattern.
      // I'll lazily add the fetch logic here for now to ensure it works.
      
      const { getFirebaseDb } = await import("@/lib/firebase")
      const { collection, query, where, getDocs } = await import("firebase/firestore")
      
      const db = getFirebaseDb()
      const q = query(
        collection(db, "items"), 
        where("postedBy", "==", uid)
      )
      
      const snapshot = await getDocs(q)
      let userItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item))

      // Filter and Sort Client-side to avoid Index requirement
      userItems = userItems
        .filter(item => ["available", "pending"].includes(item.status))
        .sort((a, b) => { // Sort descending
           const timeA = a.postedAt && typeof a.postedAt.toMillis === 'function' ? a.postedAt.toMillis() : 0
           const timeB = b.postedAt && typeof b.postedAt.toMillis === 'function' ? b.postedAt.toMillis() : 0
           return timeB - timeA
        })

      setItems(userItems)

    } catch (error) {
      console.error("Error loading items:", error)
    } finally {
      setLoadingItems(false)
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
        <Button onClick={() => router.push("/dashboard")}>กลับสู่หน้าหลัก</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <BounceWrapper variant="bounce-up">
        <div className="relative mb-8 group">
          {/* Minimal Gradient Background with Glass Effect */}
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-primary/5 to-transparent rounded-3xl -z-10" />
          
          <div className="relative pt-8 pb-6 px-6 sm:px-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Profile Image with Ring Animation */}
              <div className="relative shrink-0">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full ring-4 ring-background shadow-xl overflow-hidden bg-muted group-hover:scale-105 transition-transform duration-500">
                  <Image
                    src={profile.photoURL || "/placeholder-user.jpg"}
                    alt={profile.displayName || "User"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 112px, 128px"
                  />
                </div>
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
                    {profile.displayName}
                  </h1>
                  <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 text-muted-foreground text-sm font-medium">
                    <span className="flex items-center gap-1 bg-muted/50 px-2.5 py-1 rounded-full">
                       <Calendar className="h-3.5 w-3.5" />
                       สมาชิก {toDate(profile.createdAt) ? formatDistanceToNow(toDate(profile.createdAt)!, { addSuffix: true, locale: th }) : '-'}
                    </span>
                    {profile.rating && profile.rating.count > 0 && (
                      <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 px-2.5 py-1 rounded-full">
                         <Star className="h-3.5 w-3.5 fill-current" />
                         {profile.rating.average.toFixed(1)} ({profile.rating.count})
                      </span>
                    )}
                  </div>
                </div>

                {/* Public badges (safe fields only) */}
                <div className="pt-1">
                  <ProfileBadges
                    isActive={profile.status === "ACTIVE"}
                    hasAvatar={!!profile.photoURL}
                  />
                </div>
                
                {/* Bio / Introduction Section */}
                <div className="pt-3 max-w-lg mx-auto sm:mx-0">
                  {isEditingBio ? (
                    <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
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
                           className="absolute -right-8 -top-1 h-6 w-6 opacity-0 group-hover/bio:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
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
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">ลงประกาศ</p>
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
      </BounceWrapper>

      {/* Tabs Content */}
      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="items" className="gap-2">
            <Package className="h-4 w-4" />
            รายการสิ่งของ ({items.length})
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
               {reviews.map((review) => (
                 <Card key={review.id} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                           <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                             <Image 
                               src={review.reviewerAvatar || "/placeholder-user.jpg"} 
                               alt={review.reviewerName}
                               fill
                               className="object-cover"
                               sizes="40px"
                             />
                           </div>
                           <div className="space-y-1">
                              <h4 className="font-semibold text-sm">{review.reviewerName}</h4>
                              <StarRating rating={review.rating} readOnly size={14} />
                              <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
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
               ))}
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
                    <ItemCard key={item.id} item={item} />
                ))}
              </div>

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
              <h3 className="font-medium">ไม่มีรายการสิ่งของ</h3>
              <p className="text-sm text-muted-foreground">ผู้ใช้นี้ยังไม่มีรายการสิ่งของที่กำลังลงประกาศ</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>ประวัติการแลกเปลี่ยน</CardTitle>
              <CardDescription>การแลกเปลี่ยนที่สำเร็จแล้วของผู้ใช้นี้</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                 {/* Pending implementation of public history */}
                 อยู่ระหว่างการพัฒนา
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
