"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, MessageSquare } from "lucide-react"
import { StatsCard } from "@/components/admin/stats-card"
import { ItemsActivityChart } from "@/components/admin/items-activity-chart"
import { CategoryDistributionChart } from "@/components/admin/category-distribution-chart"
import type { Item, SupportTicket } from "@/types"

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
  const totalItems = items.length

  // Calculate dynamic change percentages based on 7-day comparison
  const calculateChange = (data: { createdAt?: any; postedAt?: any }[], dateField: 'createdAt' | 'postedAt' = 'createdAt') => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const thisWeek = data.filter(item => {
      const date = (item[dateField] as any)?.toDate?.() || new Date()
      return date >= sevenDaysAgo && date <= now
    }).length

    const lastWeek = data.filter(item => {
      const date = (item[dateField] as any)?.toDate?.() || new Date()
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
          title="โพสทั้งหมด"
          value={totalItems}
          change={itemsChange.text}
          trend={itemsChange.trend}
          icon={Package}
          color="blue"
          description={newItemsCount > 0 ? `มี ${newItemsCount} รายการใน 24 ชม. ที่ผ่านมา` : 'จำนวนโพสในระบบ'}
        />
        
        <StatsCard
          title="ผู้ใช้งานทั้งหมด"
          value={totalUsersCount}
          change="—"
          trend="up"
          icon={Users}
          color="green"
          description="จำนวนบัญชีที่สมัครแล้ว"
        />
        
        <StatsCard
          title="คำร้องขอความช่วยเหลือ"
          value={tickets.length}
          change={ticketsChange.text}
          trend={ticketsChange.trend}
          icon={MessageSquare}
          color="red"
          description={newTicketsCount > 0 ? `มี ${newTicketsCount} รายการใน 24 ชม. ที่ผ่านมา` : 'คำร้องและคำถามจากผู้ใช้'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemsActivityChart items={items} />
        <CategoryDistributionChart items={items} />
      </div>

      {/* รายการโพส */}
      <Card>
        <CardHeader>
          <CardTitle>รายการโพส</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.slice(0, 10).map((item) => (
              <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.category} • {item.status}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date((item.postedAt as any)?.toDate?.() || new Date()).toLocaleDateString('th-TH')}
                </span>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีโพสในระบบ</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
