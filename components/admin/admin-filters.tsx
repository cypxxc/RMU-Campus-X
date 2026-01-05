"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Search, Filter, X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

// ============ Filter Card ============

interface FilterCardProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  onReset?: () => void
  showReset?: boolean
}

export function FilterCard({ 
  children, 
  title, 
  description, 
  className,
  onReset,
  showReset = true 
}: FilterCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-br from-card via-card to-muted/30",
      "border-t-4 border-t-primary/60",
      "shadow-lg hover:shadow-xl transition-all duration-300",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="relative p-6">
        {(title || description || showReset) && (
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <div>
                {title && (
                  <h3 className="font-semibold text-foreground">{title}</h3>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                )}
              </div>
            </div>
            {showReset && onReset && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onReset}
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                รีเซ็ต
              </Button>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {children}
        </div>
      </div>
    </Card>
  )
}

// ============ Filter Item ============

interface FilterItemProps {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
  span?: 1 | 2 | 3 | 4
}

export function FilterItem({ label, icon, children, span = 1 }: FilterItemProps) {
  const spanClass = {
    1: "lg:col-span-1",
    2: "lg:col-span-2", 
    3: "lg:col-span-3",
    4: "lg:col-span-4"
  }

  return (
    <div className={cn("space-y-2", spanClass[span])}>
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

// ============ Search Input ============

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = "ค้นหา...", className }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10 bg-background border-border/60 focus:border-primary transition-colors"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-60 hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

// ============ Status Filter Tabs ============

interface StatusTab {
  value: string
  label: string
  count?: number
  color?: string
  pulse?: boolean
}

interface StatusFilterTabsProps {
  tabs: StatusTab[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function StatusFilterTabs({ tabs, value, onChange, className }: StatusFilterTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tabs.map((tab) => {
        const isActive = value === tab.value
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              "transition-all duration-200 ease-out",
              "border shadow-sm",
              isActive ? [
                "bg-primary text-primary-foreground border-primary",
                "shadow-lg shadow-primary/25",
                "scale-105"
              ] : [
                "bg-card text-muted-foreground border-border/50",
                "hover:bg-muted hover:text-foreground hover:border-border",
                "hover:shadow-md"
              ]
            )}
          >
            {tab.pulse && !isActive && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <Badge 
                variant={isActive ? "secondary" : "outline"}
                className={cn(
                  "px-1.5 py-0 text-[10px] font-bold min-w-[20px] justify-center",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "",
                  tab.color && !isActive ? tab.color : ""
                )}
              >
                {tab.count}
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ============ Enhanced Select ============

interface EnhancedSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; icon?: React.ReactNode }[]
  placeholder?: string
  className?: string
}

export function EnhancedSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = "เลือก...",
  className 
}: EnhancedSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(
        "bg-background border-border/60",
        "hover:border-primary/50 focus:border-primary",
        "transition-colors duration-200",
        className
      )}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/60">
        {options.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            className="cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {option.icon}
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ============ Active Filters Display ============

interface ActiveFilter {
  key: string
  label: string
  value: string
  displayValue: string
}

interface ActiveFiltersProps {
  filters: ActiveFilter[]
  onRemove: (key: string) => void
  onClearAll?: () => void
}

export function ActiveFilters({ filters, onRemove, onClearAll }: ActiveFiltersProps) {
  const activeFilters = filters.filter(f => f.value && f.value !== "all")
  
  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 px-4 rounded-lg bg-muted/50 border border-border/50">
      <span className="text-xs font-medium text-muted-foreground mr-1">กรองโดย:</span>
      {activeFilters.map((filter) => (
        <Badge 
          key={filter.key}
          variant="secondary"
          className="pl-2 pr-1 py-1 gap-1 bg-background border shadow-sm"
        >
          <span className="text-[10px] text-muted-foreground">{filter.label}:</span>
          <span className="text-xs font-medium">{filter.displayValue}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(filter.key)}
            className="h-4 w-4 ml-1 hover:bg-destructive/20 hover:text-destructive rounded-full"
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </Badge>
      ))}
      {onClearAll && activeFilters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 text-xs text-muted-foreground hover:text-destructive"
        >
          ล้างทั้งหมด
        </Button>
      )}
    </div>
  )
}
