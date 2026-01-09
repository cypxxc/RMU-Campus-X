"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import type { ItemCategory, ItemStatus } from "@/types"
import { Filter, Package, BookOpen, Sofa, Shirt, Dumbbell, MoreHorizontal, CheckCircle, Clock, Check, X, Smartphone } from "lucide-react"
import { useState, useEffect } from "react"

interface FilterSidebarProps {
  categories: ItemCategory[]
  status: ItemStatus | "all"
  onCategoriesChange: (categories: ItemCategory[]) => void
  onStatusChange: (status: ItemStatus | "all") => void
}

const categoryOptions: { value: ItemCategory; label: string; icon: typeof Package; color: string }[] = [
  { value: "electronics", label: "อิเล็กทรอนิกส์", icon: Smartphone, color: "text-blue-500" },
  { value: "books", label: "หนังสือ", icon: BookOpen, color: "text-amber-500" },
  { value: "furniture", label: "เฟอร์นิเจอร์", icon: Sofa, color: "text-purple-500" },
  { value: "clothing", label: "เสื้อผ้า", icon: Shirt, color: "text-pink-500" },
  { value: "sports", label: "กีฬา", icon: Dumbbell, color: "text-cyan-500" },
  { value: "other", label: "อื่นๆ", icon: MoreHorizontal, color: "text-orange-500" },
]

const statusOptions = [
  { value: "all", label: "ทั้งหมด", icon: CheckCircle, color: "text-primary" },
  { value: "available", label: "พร้อมให้", icon: Check, color: "text-green-500" },
  { value: "pending", label: "รอดำเนินการ", icon: Clock, color: "text-amber-500" },
  { value: "completed", label: "เสร็จสิ้น", icon: X, color: "text-gray-500" },
]

function FilterContent({ categories, status, onCategoriesChange, onStatusChange }: FilterSidebarProps) {
  const allSelected = categories.length === 0
  
  const toggleCategory = (value: ItemCategory) => {
    if (categories.includes(value)) {
      onCategoriesChange(categories.filter(c => c !== value))
    } else {
      onCategoriesChange([...categories, value])
    }
  }
  
  const selectAll = () => {
    onCategoriesChange([])
  }

  return (
    <div className="space-y-6">
      {/* Category Filter - Multi-select */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">หมวดหมู่</h3>
        <div className="space-y-1">
          {/* All Categories Option */}
          <div 
            onClick={selectAll}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-sm ${
              allSelected 
                ? 'bg-primary/10 text-primary shadow-sm scale-[1.02]' 
                : 'hover:bg-muted'
            }`}
          >
            <Checkbox 
              checked={allSelected}
              onCheckedChange={selectAll}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Package className="h-4 w-4 text-primary" />
            <Label className="flex-1 cursor-pointer text-sm font-medium">
              ทั้งหมด
            </Label>
            {allSelected && (
              <Check className="h-4 w-4 text-primary animate-fade-in" />
            )}
          </div>
          
          {/* Individual Categories */}
          {categoryOptions.map((option) => {
            const Icon = option.icon
            const isSelected = categories.includes(option.value)
            return (
              <div 
                key={option.value}
                onClick={() => toggleCategory(option.value)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-sm ${
                  isSelected 
                    ? 'bg-primary/10 text-primary shadow-sm scale-[1.02]' 
                    : 'hover:bg-muted'
                }`}
              >
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => toggleCategory(option.value)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Icon className={`h-4 w-4 transition-transform duration-200 ${option.color}`} />
                <Label className="flex-1 cursor-pointer text-sm font-medium">
                  {option.label}
                </Label>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary animate-fade-in" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Status Filter - Single select */}
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
                <Icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${option.color}`} />
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

export function FilterSidebar({ categories, status, onCategoriesChange, onStatusChange }: FilterSidebarProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeFilters = (categories.length > 0 ? 1 : 0) + (status !== "all" ? 1 : 0)

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
            categories={categories}
            status={status}
            onCategoriesChange={onCategoriesChange}
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
                categories={categories}
                status={status}
                onCategoriesChange={onCategoriesChange}
                onStatusChange={onStatusChange}
              />
              <div className="mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    onCategoriesChange([])
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