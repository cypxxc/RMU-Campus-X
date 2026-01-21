"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, DocumentSnapshot } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { deleteItem, updateItem, createAdminLog, getItems } from "@/lib/firestore"
import type { Item, ItemStatus } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Package, Search, Trash2, Eye, MapPin, Users, Clock, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react"

import Image from "next/image"

const statusLabels: Record<string, string> = {
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

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null })
  const [processing, setProcessing] = useState(false)
  
  // Pagination
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadMore, setIsLoadMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const checkAdmin = useCallback(async () => {
    if (!user) return

    try {
      const db = getFirebaseDb()
      const adminsRef = collection(db, "admins")
      const q = query(adminsRef, where("email", "==", user.email))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        toast({
          title: "ไม่มีสิทธิ์เข้าถึง",
          description: "คุณไม่มีสิทธิ์ใช้งานหน้าผู้ดูแลระบบ",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error("[AdminItems] Error checking admin:", error)
      router.push("/dashboard")
    }
  }, [router, toast, user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    checkAdmin()
  }, [authLoading, checkAdmin, router, user])

  const loadItems = useCallback(async ({ reset = false, lastDoc: lastDocOverride, searchQuery: searchQueryOverride }: { reset?: boolean; lastDoc?: DocumentSnapshot | null; searchQuery?: string } = {}) => {
    try {
      if (reset) {
        setLoading(true)
        setLastDoc(null)
      } else {
        setIsLoadMore(true)
      }

      const { data, error } = await getItems({
        pageSize,
        lastDoc: reset ? undefined : (lastDocOverride || undefined),
        searchQuery: searchQueryOverride || undefined
      })

      if (error) {
        throw new Error(error)
      }

      if (data) {
        if (reset) {
          setItems(data.items)
        } else {
          setItems(prev => [...prev, ...data.items])
        }
        setLastDoc(data.lastDoc)
        setHasMore(data.hasMore)
        setTotalCount(data.totalCount)
      }

    } catch (error) {
      console.error("[AdminItems] Error loading items:", error)
      toast({ title: "โหลดข้อมูลล้มเหลว", variant: "destructive" })
    } finally {
      setLoading(false)
      setIsLoadMore(false)
    }
  }, [pageSize, toast])

  // Reload when search changes (with debounce)
  useEffect(() => {
    if (!isAdmin) return
    const delay = searchQuery ? 500 : 0
    const timer = setTimeout(() => {
      loadItems({ reset: true, searchQuery })
    }, delay)
    return () => clearTimeout(timer)
  }, [isAdmin, loadItems, searchQuery])

  const handleDeleteItem = async () => {
    if (!deleteDialog.itemId || !user) return

    setProcessing(true)
    try {
      const itemToDelete = items.find(i => i.id === deleteDialog.itemId)
      
      await deleteItem(deleteDialog.itemId)
      
      // Log admin action
      await createAdminLog({
        actionType: 'item_delete', 
        adminId: user.uid,
        adminEmail: user.email || "",
        targetType: 'item',
        targetId: deleteDialog.itemId,
        targetInfo: itemToDelete?.title || "Unknown Item",
        description: `ลบสิ่งของ: ${itemToDelete?.title || deleteDialog.itemId}`,
        status: 'success',
        metadata: { category: itemToDelete?.category }
      } as any)

      toast({ title: "ลบสิ่งของสำเร็จ" })
      
      // Remove from list locally
      setItems(prev => prev.filter(i => i.id !== deleteDialog.itemId))
      
      setDeleteDialog({ open: false, itemId: null })
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdateStatus = async (itemId: string, newStatus: ItemStatus) => {
    if (!user) return
    setProcessing(true)
    try {
      const itemToUpdate = items.find(i => i.id === itemId)
      
      await updateItem(itemId, { status: newStatus })
      
      // Log admin action
      await createAdminLog({
        actionType: 'item_status_change',
        adminId: user.uid,
        adminEmail: user.email || "",
        targetType: 'item',
        targetId: itemId,
        targetInfo: itemToUpdate?.title || "Unknown Item",
        description: `เปลี่ยนสถานะเป็น: ${statusLabels[newStatus]}`,
        status: 'success',
        metadata: { 
          from: itemToUpdate?.status,
          to: newStatus 
        }
      } as any)

      toast({ title: `เปลี่ยนสถานะเป็น ${statusLabels[newStatus]}` })
       // Update locally
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i))
      
      if (selectedItem?.id === itemId) {
        setSelectedItem(prev => prev ? { ...prev, status: newStatus } : null)
      }
      
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Count new items (last 24h) from fetched items
  const newCount = items.filter(i => {
     const postedAt = (i.postedAt as any)?.toDate?.() || new Date(0) // Safe access
     const hoursAgo = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60)
     return hoursAgo <= 24
  }).length

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-7xl mx-auto px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.push("/admin")}>
              <ArrowLeft className="h-4 w-4" />
           </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              จัดการสิ่งของ
            </h1>
            <p className="text-muted-foreground">ดูแลและจัดการสิ่งของทั้งหมดในระบบ</p>
          </div>
        </div>
        <Button onClick={() => loadItems({ reset: true, searchQuery })} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Stats (Approximate based on loaded data + totalCount) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
             </div>
             <div>
               <div className="text-2xl font-bold">{totalCount}</div>
               <p className="text-xs text-muted-foreground">สิ่งของทั้งหมด</p>
             </div>
          </CardContent>
        </Card>
        {/* Note: New Count is only from loaded items, hard to get total new without specific query */}
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
             </div>
             <div>
               <div className="text-2xl font-bold text-foreground">{newCount}</div>
               <p className="text-xs text-muted-foreground">ใหม่ (ในหน้านี้)</p>
             </div>
          </CardContent>
        </Card>
        {/* Status counts are approximated from loaded list or would need separate counters */}
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
             </div>
             <div>
               <div className="text-2xl font-bold text-foreground">
                 {items.filter(i => i.status === 'available').length}
               </div>
               <p className="text-xs text-muted-foreground">พร้อมให้ (โหลดแล้ว)</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
           <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-gray-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-gray-600" />
             </div>
             <div>
               <div className="text-2xl font-bold text-foreground">
                 {items.filter(i => i.status === 'completed').length}
               </div>
               <p className="text-xs text-muted-foreground">เสร็จสิ้น (โหลดแล้ว)</p>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          รายการสิ่งของ
          <Badge variant="secondary" className="ml-2 px-3 py-1">
            {totalCount} รายการ
          </Badge>
        </h2>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาสิ่งของ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background w-full md:w-[300px]"
          />
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 contain-paint">
        {items.length === 0 ? (
           <div className="col-span-full py-16 text-center bg-linear-to-b from-transparent to-muted/20 rounded-xl border border-dashed">
            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              ไม่พบสิ่งของ
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "ลองเปลี่ยนคำค้นหาใหม่" : "ยังไม่มีสิ่งของในระบบ"}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="relative aspect-video bg-muted">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[90%]">
                  <Badge className="bg-black/60 text-white text-[10px] backdrop-blur-sm">
                    {categoryLabels[item.category]}
                  </Badge>
                  <Badge className={item.status === 'available' ? 'bg-green-500' : 'bg-orange-500'}>
                    {statusLabels[item.status]}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">{item.description}</p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{item.postedByEmail?.split('@')[0]}</span>
                  {item.location && (
                    <>
                      <MapPin className="h-3 w-3 ml-2" />
                      <span className="truncate max-w-[80px]">{item.location}</span>
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)} className="hover:bg-primary/10 hover:text-primary">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteDialog({ open: true, itemId: item.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
            <Button 
                variant="outline" 
                onClick={() => loadItems({ reset: false, lastDoc, searchQuery })} 
                disabled={isLoadMore}
                className="w-full max-w-[200px]"
            >
                {isLoadMore ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังโหลด...
                    </>
                ) : (
                    "โหลดเพิ่มเติม"
                )}
            </Button>
        </div>
      )}

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col gap-0 max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 pr-24 border-b bg-muted/10 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold tracking-tight">{selectedItem?.title}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>ID: {selectedItem?.id}</span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selectedItem?.postedByEmail}
                  </span>
                </div>
              </div>
              {selectedItem && (
                 <Badge className={selectedItem.status === 'available' ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}>
                   {statusLabels[selectedItem.status]}
                 </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedItem && (
            <div className="flex-1 overflow-y-auto p-0">
              <div className="grid md:grid-cols-2 gap-0 h-full">
                {/* Image Section */}
                <div className="bg-muted/30 p-6 flex items-center justify-center border-r min-h-[300px] md:min-h-auto relative group">
                  {selectedItem.imageUrl ? (
                    <div className="relative w-full h-full min-h-[300px] rounded-lg overflow-hidden shadow-sm">
                      <Image 
                        src={selectedItem.imageUrl} 
                        alt={selectedItem.title} 
                        fill 
                        className="object-contain" 
                        unoptimized 
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground/40">
                      <Package className="h-24 w-24 mb-4" />
                      <p>ไม่มีรูปภาพ</p>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wider">รายละเอียด</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {selectedItem.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wider">ข้อมูลเพิ่มเติม</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground mb-1">หมวดหมู่</p>
                        <p className="font-medium flex items-center gap-2">
                          <Badge variant="outline" className="rounded-md">
                            {categoryLabels[selectedItem.category]}
                          </Badge>
                        </p>
                      </div>
                      <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground mb-1">สถานที่</p>
                        <p className="font-medium flex items-center gap-2 truncate">
                          <MapPin className="h-4 w-4 text-primary" />
                          {selectedItem.location || "-"}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground mb-1">วันที่ลงประกาศ</p>
                        <p className="font-medium">
                          {(selectedItem.postedAt as any)?.toDate 
                            ? (selectedItem.postedAt as any).toDate().toLocaleDateString('th-TH')
                            : '-'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border-t bg-muted/20 shrink-0 flex items-center justify-between gap-2">
             <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedItem(null)}
                >
                  ปิด
                </Button>
             </div>
             
             {selectedItem && (
               <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedItem.id, 'available')}
                    disabled={processing || selectedItem.status === 'available'}
                    className="border-green-200 hover:bg-green-50 text-green-700 dark:border-green-900 dark:hover:bg-green-950/50 dark:text-green-400"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    พร้อมให้
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedItem.id, 'pending')}
                    disabled={processing || selectedItem.status === 'pending'}
                    className="border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-900 dark:hover:bg-blue-950/50 dark:text-blue-400"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    รอดำเนินการ
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shadow-sm"
                    onClick={() => {
                      setSelectedItem(null)
                      setDeleteDialog({ open: true, itemId: selectedItem.id })
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    ลบ
                  </Button>
               </div>
             )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, itemId: null })}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  คุณต้องการลบสิ่งของนี้หรือไม่?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            ⚠️ การกระทำนี้ไม่สามารถยกเลิกได้ สิ่งของจะถูกลบออกจากระบบอย่างถาวร
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteItem} 
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ลบสิ่งของ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  )
}
