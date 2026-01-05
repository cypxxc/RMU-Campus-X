"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import type { ItemCategory, ItemStatus } from "@/types"
import { Filter, Package, BookOpen, Sofa, Shirt, Dumbbell, MoreHorizontal, CheckCircle, Clock, Check, X } from "lucide-react"
import { useState, useEffect } from "react"

interface FilterSidebarProps {
  category: ItemCategory | "all"
  status: ItemStatus | "all"
  onCategoryChange: (category: ItemCategory | "all") => void
  onStatusChange: (status: ItemStatus | "all") => void
}

const categoryOptions = [
  { value: "all", label: "ทั้งหมด", icon: Package },
  { value: "electronics", label: "อิเล็กทรอนิกส์", icon: Package },
  { value: "books", label: "หนังสือ", icon: BookOpen },
  { value: "furniture", label: "เฟอร์นิเจอร์", icon: Sofa },
  { value: "clothing", label: "เสื้อผ้า", icon: Shirt },
  { value: "sports", label: "กีฬา", icon: Dumbbell },
  { value: "other", label: "อื่นๆ", icon: MoreHorizontal },
]

const statusOptions = [
  { value: "all", label: "ทั้งหมด", icon: CheckCircle },
  { value: "available", label: "พร้อมให้", icon: Check },
  { value: "pending", label: "รอดำเนินการ", icon: Clock },
  { value: "completed", label: "เสร็จสิ้น", icon: X },
]

function FilterContent({ category, status, onCategoryChange, onStatusChange }: FilterSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">หมวดหมู่</h3>
        <RadioGroup value={category} onValueChange={onCategoryChange} className="space-y-1">
          {categoryOptions.map((option) => {
            const Icon = option.icon
            return (
              <div 
                key={option.value} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-sm ${
                  category === option.value 
                    ? 'bg-primary/10 text-primary shadow-sm scale-[1.02]' 
                    : 'hover:bg-muted'
                }`}
              >
                <RadioGroupItem 
                  value={option.value} 
                  id={`cat-${option.value}`} 
                  className="sr-only"
                />
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <Label 
                  htmlFor={`cat-${option.value}`} 
                  className="flex-1 cursor-pointer text-sm font-medium"
                >
                  {option.label}
                </Label>
                {category === option.value && (
                  <Check className="h-4 w-4 text-primary animate-fade-in" />
                )}
              </div>
            )
          })}
        </RadioGroup>
      </div>

      {/* Status Filter */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">สถานะ</h3>
        <RadioGroup value={status} onValueChange={onStatusChange} className="space-y-1">
          {statusOptions.map((option) => {
            const Icon = option.icon
            return (
              <div 
                key={option.value} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-sm ${
                  status === option.value 
                    ? 'bg-primary/10 text-primary shadow-sm scale-[1.02]' 
                    : 'hover:bg-muted'
                }`}
              >
                <RadioGroupItem 
                  value={option.value} 
                  id={`status-${option.value}`}
                  className="sr-only" 
                />
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <Label 
                  htmlFor={`status-${option.value}`} 
                  className="flex-1 cursor-pointer text-sm font-medium"
                >
                  {option.label}
                </Label>
                {status === option.value && (
                  <Check className="h-4 w-4 text-primary animate-fade-in" />
                )}
              </div>
            )
          })}
        </RadioGroup>
      </div>
    </div>
  )
}

export function FilterSidebar({ category, status, onCategoryChange, onStatusChange }: FilterSidebarProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeFilters = (category !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0)

  return (
    <>
      {/* Desktop Sidebar */}
      <Card className="hidden lg:block sticky top-24">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            ตัวกรอง
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FilterContent 
            category={category}
            status={status}
            onCategoryChange={onCategoryChange}
            onStatusChange={onStatusChange}
          />
        </CardContent>
      </Card>

      {/* Mobile Filter Button */}
      {mounted && (
        <div className="lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Filter className="h-4 w-4" />
                ตัวกรอง
                {activeFilters > 0 && (
                  <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {activeFilters}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  ตัวกรอง
                </SheetTitle>
              </SheetHeader>
              <FilterContent 
                category={category}
                status={status}
                onCategoryChange={(val) => {
                  onCategoryChange(val)
                }}
                onStatusChange={(val) => {
                  onStatusChange(val)
                }}
              />
              <div className="mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    onCategoryChange("all")
                    onStatusChange("all")
                  }}
                >
                  ล้างตัวกรอง
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </>
  )
}