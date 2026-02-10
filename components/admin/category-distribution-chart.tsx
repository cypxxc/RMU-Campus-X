"use client"

import { useCallback, useMemo, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Package } from "lucide-react"
import { useI18n } from "@/components/language-provider"
import type { Item } from "@/types"
import { CATEGORY_LABELS } from "@/lib/constants"

interface CategoryDistributionChartProps {
  items: Item[]
}

const COLORS: Record<string, string> = {
  electronics: '#3b82f6',
  books: '#10b981',
  furniture: '#f59e0b',
  clothing: '#ec4899',
  sports: '#8b5cf6',
  other: '#6b7280',
}

const CATEGORY_LABELS_EN: Record<string, string> = {
  electronics: "Electronics",
  books: "Books",
  furniture: "Furniture",
  clothing: "Clothing",
  sports: "Sports",
  other: "Other",
}

function CategoryTooltip({
  active,
  payload,
  total,
  itemLabel,
}: {
  active?: boolean
  payload?: any[]
  total: number
  itemLabel: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value} {itemLabel} ({((payload[0].value / total) * 100).toFixed(1)}%)
        </p>
      </div>
    )
  }
  return null
}

export const CategoryDistributionChart = memo(function CategoryDistributionChart({ 
  items 
}: CategoryDistributionChartProps) {
  const { locale, tt } = useI18n()
  const resolveCategoryLabel = useCallback(
    (category: string) =>
      locale === "th"
        ? CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
        : CATEGORY_LABELS_EN[category] || category,
    [locale]
  )

  // Memoized chart data - only recomputes when items change
  const chartData = useMemo(() => {
    const categoryCounts: Record<string, number> = {}
    
    items.forEach(item => {
      const category = item.category || 'other'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })
    
    return Object.entries(categoryCounts).map(([category, count]) => ({
      name: resolveCategoryLabel(category),
      value: count,
      category,
    }))
  }, [items, resolveCategoryLabel]) // Only recompute when items array changes


  // Handle empty state
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {tt("การกระจายตามหมวดหมู่", "Category distribution")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{tt("ยังไม่มีข้อมูลโพส", "No item data yet")}</p>
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
          {tt("การกระจายตามหมวดหมู่", "Category distribution")}
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
            <Tooltip content={<CategoryTooltip total={items.length} itemLabel={tt("รายการ", "items")} />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
