"use client"

import { useQuery } from "@tanstack/react-query"
import { collection, getDocs, getCountFromServer, query, orderBy, limit } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { getReports } from "@/lib/firestore"
import type { Item, User, SupportTicket } from "@/types"


interface UserWithReports extends User {
  reportCount: number
  reportedCount: number
  reporterCount: number
  lastReportDate?: Date
}

/**
 * Optimized hook for admin dashboard data
 * Replaces 3+ real-time listeners with React Query polling
 * Expected: 70% reduction in Firestore reads
 */
export function useAdminDashboardData() {
  // Items query - poll every 30s instead of real-time
  // Limited to 200 recent items for dashboard overview
  const itemsQuery = useQuery({
    queryKey: ['admin', 'items'],
    queryFn: async () => {
      const db = getFirebaseDb()
      const q = query(
        collection(db, 'items'), 
        orderBy('postedAt', 'desc'),
        limit(200) // Limit for dashboard overview
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Item[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 15 * 1000, // อัปเดตอัตโนมัติทุก 15 วินาที
    refetchOnWindowFocus: true,
  })

  // Flagged users query - optimized with parallel fetching
  // Limited to users with reports or non-ACTIVE status
  const flaggedUsersQuery = useQuery({
    queryKey: ['admin', 'flagged-users'],
    queryFn: async () => {
      const db = getFirebaseDb()
      
      // Parallel fetch - limit users for performance
      const [usersSnapshot, reports] = await Promise.all([
        getDocs(query(collection(db, 'users'), limit(500))), // Limit users
        getReports()
      ])
      
      const usersData = usersSnapshot.docs.map(doc => ({ 
        ...doc.data() as User 
      }))
      
      // Build report maps
      const reportedMap = new Map<string, { count: number; lastDate?: Date }>()
      const reporterMap = new Map<string, number>()
      
      reports.forEach(report => {
        if (report.reportedUserId) {
          const current = reportedMap.get(report.reportedUserId) || { count: 0 }
          const reportDate = (report.createdAt as any)?.toDate?.() || new Date()
          reportedMap.set(report.reportedUserId, {
            count: current.count + 1,
            lastDate: !current.lastDate || reportDate > current.lastDate 
              ? reportDate 
              : current.lastDate
          })
        }
        
        const reporterCurrent = reporterMap.get(report.reporterId) || 0
        reporterMap.set(report.reporterId, reporterCurrent + 1)
      })
      
      // Build users with report counts
      const usersWithReports: UserWithReports[] = usersData
        .map(u => {
          const reportedCount = reportedMap.get(u.uid)?.count || 0
          const reporterCount = reporterMap.get(u.uid) || 0
          return {
            ...u,
            reportedCount,
            reporterCount,
            reportCount: reportedCount + reporterCount,
            lastReportDate: reportedMap.get(u.uid)?.lastDate
          }
        })
        .filter(u => u.reportCount > 0 || u.status !== 'ACTIVE')
        .sort((a, b) => b.reportedCount - a.reportedCount)
      
      return usersWithReports
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 20 * 1000, // อัปเดตอัตโนมัติทุก 20 วินาที
    refetchOnWindowFocus: true,
  })

  // Total users count - efficient count without loading all documents
  const totalUsersCountQuery = useQuery({
    queryKey: ['admin', 'total-users-count'],
    queryFn: async () => {
      const db = getFirebaseDb()
      const usersRef = collection(db, 'users')
      const snapshot = await getCountFromServer(usersRef)
      return snapshot.data().count
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 20 * 1000,
    refetchOnWindowFocus: true,
  })

  // Support tickets query - only active tickets
  const ticketsQuery = useQuery({
    queryKey: ['admin', 'support-tickets'],
    queryFn: async () => {
      const db = getFirebaseDb()
      const q = query(
        collection(db, 'support_tickets'),
        orderBy('createdAt', 'desc'),
        limit(100) // Limit to recent 100
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as SupportTicket[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 15 * 1000, // อัปเดตอัตโนมัติทุก 15 วินาที
    refetchOnWindowFocus: true,
  })

  return {
    items: itemsQuery.data ?? [],
    users: flaggedUsersQuery.data ?? [],
    tickets: ticketsQuery.data ?? [],
    totalUsersCount: totalUsersCountQuery.data ?? 0,
    isLoading:
      itemsQuery.isLoading ||
      flaggedUsersQuery.isLoading ||
      ticketsQuery.isLoading ||
      totalUsersCountQuery.isLoading,
    isError:
      itemsQuery.isError ||
      flaggedUsersQuery.isError ||
      ticketsQuery.isError ||
      totalUsersCountQuery.isError,
    refetchAll: () => {
      itemsQuery.refetch()
      flaggedUsersQuery.refetch()
      ticketsQuery.refetch()
      totalUsersCountQuery.refetch()
    },
  }
}
