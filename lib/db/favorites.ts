import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { Item } from "@/types"

export interface FavoriteItem {
  id: string
  userId: string
  itemId: string
  itemTitle: string
  itemImage?: string
  createdAt: any
}

// Check if an item is favorited by the user
export const checkIsFavorite = async (userId: string, itemId: string): Promise<boolean> => {
  const db = getFirebaseDb()
  const docRef = doc(db, "favorites", `${userId}_${itemId}`)
  const docSnap = await getDoc(docRef)
  return docSnap.exists()
}

// Toggle favorite status
export const toggleFavorite = async (userId: string, item: Item): Promise<boolean> => {
  const db = getFirebaseDb()
  const favoriteId = `${userId}_${item.id}`
  const docRef = doc(db, "favorites", favoriteId)
  
  const docSnap = await getDoc(docRef)
  
  if (docSnap.exists()) {
    // Already favorite -> Remove
    await deleteDoc(docRef)
    return false // isFavorite = false
  } else {
    // Not favorite -> Add
    await setDoc(docRef, {
      id: favoriteId,
      userId,
      itemId: item.id,
      itemTitle: item.title,
      itemImage: item.imageUrls?.[0] || item.imageUrl || null,
      createdAt: serverTimestamp()
    })
    return true // isFavorite = true
  }
}

// Get all favorite items for a user
export const getFavoriteItems = async (userId: string): Promise<Item[]> => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "favorites"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )
  
  const snapshot = await getDocs(q)
  const favorites = snapshot.docs.map(doc => doc.data() as FavoriteItem)
  
  if (favorites.length === 0) return []
  
  // Fetch actual item details to ensure data is fresh
  // Note: This might be slow if many favorites. 
  // Optimization: Store min needed data in favorite doc and return that, 
  // or fetch in batches. For now, fetch individually is safest for data consistency.
  
  const itemPromises = favorites.map(async (fav) => {
    const itemRef = doc(db, "items", fav.itemId)
    const itemSnap = await getDoc(itemRef)
    if (itemSnap.exists()) {
      return { id: itemSnap.id, ...itemSnap.data() } as Item
    }
    return null
  })
  
  const items = await Promise.all(itemPromises)
  return items.filter((item): item is Item => item !== null)
}
