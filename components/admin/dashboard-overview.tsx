"use client"


import { Package, Users, MessageSquare } from "lucide-react"
import { useI18n } from "@/components/language-provider"
import { StatsCard } from "@/components/admin/stats-card"
import { ItemsActivityChart } from "@/components/admin/items-activity-chart"
import { CategoryDistributionChart } from "@/components/admin/category-distribution-chart"
import type { Item, SupportTicket } from "@/types"

function toSafeDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate()
  }
  if (value instanceof Date) return value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  if (value && typeof value === "object") {
    const seconds = (value as { seconds?: number; _seconds?: number }).seconds
      ?? (value as { seconds?: number; _seconds?: number })._seconds
    if (typeof seconds === "number") return new Date(seconds * 1000)
  }
  return new Date()
}

interface DashboardOverviewProps {
  items: Item[]
  tickets: SupportTicket[]
  totalUsersCount: number
  newItemsCount: number
  newTicketsCount: number
  onTabChange?: (tab: string) => void
}

export function DashboardOverview({
  items,
  tickets,
  totalUsersCount,
  newItemsCount,
  newTicketsCount,
}: DashboardOverviewProps) {
  const { tt } = useI18n()
  const totalItems = items.length

  // Calculate dynamic change percentages based on 7-day comparison
  const calculateChange = (data: { createdAt?: any; postedAt?: any }[], dateField: 'createdAt' | 'postedAt' = 'createdAt') => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const thisWeek = data.filter(item => {
      const date = toSafeDate(item[dateField])
      return date >= sevenDaysAgo && date <= now
    }).length

    const lastWeek = data.filter(item => {
      const date = toSafeDate(item[dateField])
      return date >= fourteenDaysAgo && date < sevenDaysAgo
    }).length

    if (lastWeek === 0) {
      return thisWeek > 0 ? { text: `+${thisWeek}`, trend: 'up' as const } : { text: '0', trend: 'up' as const }
    }

    const percentChange = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
    return {
      text: `${percentChange >= 0 ? '+' : ''}${percentChange}%`,
      trend: percentChange >= 0 ? 'up' as const : 'down' as const
    }
  }

  const itemsChange = calculateChange(items, 'postedAt')
  const ticketsChange = calculateChange(tickets, 'createdAt')

  return (
    <div className="space-y-8">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          title={tt("โพสทั้งหมด", "Total items")}
          value={totalItems}
          change={itemsChange.text}
          trend={itemsChange.trend}
          icon={Package}
          color="blue"
          description={
            newItemsCount > 0
              ? tt(`มี ${newItemsCount} รายการใน 24 ชม. ที่ผ่านมา`, `${newItemsCount} in last 24 hours`)
              : tt("จำนวนโพสในระบบ", "Total posted items")
          }
        />
        
        <StatsCard
          title={tt("ผู้ใช้งานทั้งหมด", "Total users")}
          value={totalUsersCount}
          change="—"
          trend="up"
          icon={Users}
          color="green"
          description={tt("จำนวนบัญชีที่สมัครแล้ว", "Registered user accounts")}
        />
        
        <StatsCard
          title={tt("คำร้องขอความช่วยเหลือ", "Support tickets")}
          value={tickets.length}
          change={ticketsChange.text}
          trend={ticketsChange.trend}
          icon={MessageSquare}
          color="red"
          description={
            newTicketsCount > 0
              ? tt(`มี ${newTicketsCount} รายการใน 24 ชม. ที่ผ่านมา`, `${newTicketsCount} in last 24 hours`)
              : tt("คำร้องและคำถามจากผู้ใช้", "User support requests and questions")
          }
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemsActivityChart items={items} />
        <CategoryDistributionChart items={items} />
      </div>


    </div>
  )
}
