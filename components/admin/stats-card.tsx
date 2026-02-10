"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { useI18n } from "@/components/language-provider"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  change?: string
  trend?: "up" | "down"
  color?: "blue" | "green" | "amber" | "red" | "purple"
  urgent?: boolean
  className?: string
}

const colorClasses = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    icon: "text-blue-500",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-600",
    icon: "text-green-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    icon: "text-amber-500",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-600",
    icon: "text-red-500",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-600",
    icon: "text-purple-500",
  },
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  change,
  trend,
  color = "blue",
  urgent = false,
  className,
}: StatsCardProps) {
  const { tt } = useI18n()
  const colors = colorClasses[color]

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
      urgent && "border-amber-500/50 shadow-amber-500/10",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold tracking-tight">
                {value}
              </h3>
              {change && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend === "up" ? "text-green-600" : "text-red-600"
                )}>
                  {trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{change}</span>
                </div>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          
          <div className={cn("rounded-lg p-3", colors.bg)}>
            <Icon className={cn("h-6 w-6", colors.icon)} />
          </div>
        </div>

        {urgent && (
          <div className="mt-4 pt-4 border-t border-amber-500/20">
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              {tt("ต้องดำเนินการ", "Needs action")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
