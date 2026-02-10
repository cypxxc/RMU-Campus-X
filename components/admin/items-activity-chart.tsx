"use client"

import { useMemo, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp } from "lucide-react"
import { useI18n } from "@/components/language-provider"
import type { Item } from "@/types"

interface ItemsActivityChartProps {
  items: Item[]
}

export const ItemsActivityChart = memo(function ItemsActivityChart({ 
  items 
}: ItemsActivityChartProps) {
  const { locale, tt } = useI18n()
  // ✅ Memoized chart data - only recomputes when items change
  const chartData = useMemo(() => {
    const data = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      
      // Count items posted on this day
      const posted = items.filter(item => {
        const postedAt = (item.postedAt as any)?.toDate?.() || new Date()
        return postedAt >= date && postedAt < nextDate
      }).length
      
      // Count items with status changes on this day
      const available = items.filter(item => {
        const postedAt = (item.postedAt as any)?.toDate?.() || new Date()
        return postedAt >= date && postedAt < nextDate && item.status === 'available'
      }).length
      
      const pending = items.filter(item => {
        const postedAt = (item.postedAt as any)?.toDate?.() || new Date()
        return postedAt >= date && postedAt < nextDate && item.status === 'pending'
      }).length
      
      data.push({
        date: date.toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short" }),
        posted,
        available,
        pending,
      })
    }
    
    return data
  }, [items, locale]) // Only recompute when items array changes

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {tt("กิจกรรมโพส (ย้อนหลัง 7 วัน)", "Item activity (last 7 days)")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="posted" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name={tt("โพสต์ใหม่", "New posts")}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              type="monotone" 
              dataKey="available" 
              stroke="hsl(142 76% 36%)" 
              strokeWidth={2}
              name={tt("พร้อมให้", "Available")}
              dot={{ fill: 'hsl(142 76% 36%)' }}
            />
            <Line 
              type="monotone" 
              dataKey="pending" 
              stroke="hsl(48 96% 53%)" 
              strokeWidth={2}
              name={tt("รอดำเนินการ", "Pending")}
              dot={{ fill: 'hsl(48 96% 53%)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
