"use client"

import { useMemo, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Package } from "lucide-react"
import type { Item } from "@/types"

interface CategoryDistributionChartProps {
  items: Item[]
}

const COLORS = {
  electronics: '#3b82f6', // blue
  books: '#10b981', // green
  furniture: '#f59e0b', // amber
  clothing: '#ec4899', // pink
  sports: '#8b5cf6', // purple
  other: '#6b7280', // gray
}

const categoryLabels: Record<string, string> = {
  electronics: "อิเล็กทรอนิกส์",
  books: "หนังสือ",
  furniture: "เฟอร์นิเจอร์",
  clothing: "เสื้อผ้า",
  sports: "กีฬา",
  other: "อื่นๆ",
}

function CategoryTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: any[]
  total: number
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value} รายการ ({((payload[0].value / total) * 100).toFixed(1)}%)
        </p>
      </div>
    )
  }
  return null
}

export const CategoryDistributionChart = memo(function CategoryDistributionChart({ 
  items 
}: CategoryDistributionChartProps) {
  // Memoized chart data - only recomputes when items change
  const chartData = useMemo(() => {
    const categoryCounts: Record<string, number> = {}
    
    items.forEach(item => {
      const category = item.category || 'other'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })
    
    return Object.entries(categoryCounts).map(([category, count]) => ({
      name: categoryLabels[category] || category,
      value: count,
      category,
    }))
  }, [items]) // Only recompute when items array changes


  // Handle empty state
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            การกระจายตามหมวดหมู่
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">ยังไม่มีข้อมูลโพส</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          การกระจายตามหมวดหมู่
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.category as keyof typeof COLORS] || COLORS.other} 
                />
              ))}
            </Pie>
            <Tooltip content={<CategoryTooltip total={items.length} />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
