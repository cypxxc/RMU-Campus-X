"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Users,
  ScrollText,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    title: "ภาพรวม",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "โพส",
    href: "/admin/items",
    icon: Package,
  },
  {
    title: "รายงาน",
    href: "/admin/reports",
    icon: AlertTriangle,
  },
  {
    title: "ผู้ใช้",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "ประวัติ",
    href: "/admin/logs",
    icon: ScrollText,
  },
]

interface AdminSidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function AdminSidebar({ isCollapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">แผงจัดการ</h2>
              <p className="text-xs text-muted-foreground">RMU-Campus X</p>
            </div>
          </div>
        )}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className={cn(
              "h-8 w-8",
              isCollapsed && "mx-auto"
            )}
          >
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform",
              isCollapsed && "rotate-180"
            )} />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm">{item.title}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            แผงจัดการ v1.0
          </div>
        </div>
      )}
    </div>
  )
}
