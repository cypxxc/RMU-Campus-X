"use client"

import { useQuery } from "@tanstack/react-query"
import { authFetchJson } from "@/lib/api-client"
import type { Item, User, SupportTicket } from "@/types"

interface UserWithReports extends User {
  reportCount: number
  reportedCount: number
  reporterCount: number
  lastReportDate?: Date
}

interface AdminStats {
  users: { total: number; active: number; suspended: number; banned: number; growth: string; trend: string }
  items: { total: number; active: number; pending: number; completed: number; newLast24h: number; growth: string; trend: string }
  reports: { total: number; pending: number; resolved: number }
  exchanges: { total: number; completed: number; rate: string; growth: string; trend: string }
}

/**
 * Admin dashboard โหลดข้อมูลผ่าน API ทั้งหมด (ไม่ใช้ Firestore บน client)
 */
export function useAdminDashboardData() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await authFetchJson<AdminStats>('/api/admin/stats', { method: 'GET' })
      if (!res?.data) throw new Error('Failed to fetch stats')
      return res.data
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const itemsQuery = useQuery({
    queryKey: ['admin', 'items'],
    queryFn: async () => {
      const res = await authFetchJson<{ items?: Item[] }>(
        '/api/admin/items?limit=200&sortBy=postedAt&sortOrder=desc',
        { method: 'GET' }
      )
      return (res?.data?.items ?? []) as Item[]
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const reportsQuery = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const res = await authFetchJson<{ reports?: any[] }>(
        '/api/admin/reports?limit=200',
        { method: 'GET' }
      )
      return res?.data?.reports ?? []
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await authFetchJson<{ users?: User[] }>(
        '/api/admin/users?limit=500',
        { method: 'GET' }
      )
      return res?.data?.users ?? []
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const ticketsQuery = useQuery({
    queryKey: ['admin', 'support-tickets'],
    queryFn: async () => {
      const res = await authFetchJson<{ tickets?: SupportTicket[] }>(
        '/api/admin/support?limit=100',
        { method: 'GET' }
      )
      return (res?.data?.tickets ?? []) as SupportTicket[]
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const reports = reportsQuery.data ?? []
  const usersData = usersQuery.data ?? []
  const reportedMap = new Map<string, { count: number; lastDate?: Date }>()
  const reporterMap = new Map<string, number>()
  reports.forEach((report: any) => {
    if (report.reportedUserId) {
      const current = reportedMap.get(report.reportedUserId) || { count: 0 }
      const reportDate = report.createdAt ? (typeof report.createdAt === 'string' ? new Date(report.createdAt) : (report.createdAt?.toDate?.() ?? new Date())) : new Date()
      reportedMap.set(report.reportedUserId, {
        count: current.count + 1,
        lastDate: !current.lastDate || reportDate > current.lastDate ? reportDate : current.lastDate,
      })
    }
    if (report.reporterId) {
      reporterMap.set(report.reporterId, (reporterMap.get(report.reporterId) || 0) + 1)
    }
  })
  const flaggedUsers: UserWithReports[] = usersData
    .map((u: any) => {
      const uid = u.uid ?? u.id
      const reportedCount = reportedMap.get(uid)?.count ?? 0
      const reporterCount = reporterMap.get(uid) ?? 0
      return {
        ...u,
        uid: uid,
        reportedCount,
        reporterCount,
        reportCount: reportedCount + reporterCount,
        lastReportDate: reportedMap.get(uid)?.lastDate,
      }
    })
    .filter((u: any) => u.reportCount > 0 || u.status !== 'ACTIVE')
    .sort((a: any, b: any) => (b.reportedCount ?? 0) - (a.reportedCount ?? 0))

  const totalUsersCount = statsQuery.data?.users?.total ?? 0

  return {
    items: itemsQuery.data ?? [],
    users: flaggedUsers,
    tickets: ticketsQuery.data ?? [],
    totalUsersCount,
    isLoading:
      statsQuery.isLoading ||
      itemsQuery.isLoading ||
      reportsQuery.isLoading ||
      usersQuery.isLoading ||
      ticketsQuery.isLoading,
    isError:
      statsQuery.isError ||
      itemsQuery.isError ||
      reportsQuery.isError ||
      usersQuery.isError ||
      ticketsQuery.isError,
    refetchAll: () => {
      statsQuery.refetch()
      itemsQuery.refetch()
      reportsQuery.refetch()
      usersQuery.refetch()
      ticketsQuery.refetch()
    },
  }
}
