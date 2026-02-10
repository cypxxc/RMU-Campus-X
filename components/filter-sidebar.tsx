"use client"

import { useState } from "react"
import { Check, Filter, Package } from "lucide-react"
import type { ItemCategory, ItemStatus } from "@/types"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants"

interface FilterSidebarProps {
  categories: ItemCategory[]
  status: ItemStatus | "all"
  onCategoriesChange: (categories: ItemCategory[]) => void
  onStatusChange: (status: ItemStatus | "all") => void
}

function FilterContent({ categories, status, onCategoriesChange, onStatusChange }: FilterSidebarProps) {
  const { tt } = useI18n()
  const allSelected = categories.length === 0

  const toggleCategory = (value: ItemCategory) => {
    if (categories.includes(value)) {
      onCategoriesChange(categories.filter((category) => category !== value))
    } else {
      onCategoriesChange([...categories, value])
    }
  }

  const selectAll = () => onCategoriesChange([])

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{tt("หมวดหมู่", "Categories")}</h3>
        <div className="space-y-1">
          <div
            onClick={selectAll}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-sm ${
              allSelected ? "bg-primary/10 text-primary shadow-sm scale-[1.02]" : "hover:bg-muted"
            }`}
          >
            <Checkbox
              checked={allSelected}
              onCheckedChange={selectAll}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Package className="h-4 w-4 text-primary" />
            <Label className="flex-1 cursor-pointer text-sm font-medium">{tt("ทั้งหมด", "All")}</Label>
            {allSelected && <Check className="h-4 w-4 text-primary" />}
          </div>

          {CATEGORY_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = categories.includes(option.value)
            return (
              <div
                key={option.value}
                onClick={() => toggleCategory(option.value)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-sm ${
                  isSelected ? "bg-primary/10 text-primary shadow-sm scale-[1.02]" : "hover:bg-muted"
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleCategory(option.value)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Icon className={`h-4 w-4 transition-transform duration-200 ${option.color}`} />
                <Label className="flex-1 cursor-pointer text-sm font-medium">{option.label}</Label>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{tt("สถานะ", "Status")}</h3>
        <RadioGroup value={status} onValueChange={onStatusChange} className="space-y-1">
          {STATUS_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <div
                key={option.value}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-sm ${
                  status === option.value ? "bg-primary/10 text-primary shadow-sm scale-[1.02]" : "hover:bg-muted"
                }`}
              >
                <RadioGroupItem value={option.value} id={`status-${option.value}`} className="sr-only" />
                <Icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${option.color}`} />
                <Label htmlFor={`status-${option.value}`} className="flex-1 cursor-pointer text-sm font-medium">
                  {option.label}
                </Label>
                {status === option.value && <Check className="h-4 w-4 text-primary" />}
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
  const { tt } = useI18n()
  const activeFilters = (categories.length > 0 ? 1 : 0) + (status !== "all" ? 1 : 0)

  return (
    <>
      <Card className="hidden lg:block sticky top-24">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {tt("ตัวกรอง", "Filters")}
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

      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Filter className="h-4 w-4" />
              {tt("ตัวกรอง", "Filters")}
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
                {tt("ตัวกรอง", "Filters")}
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
                {tt("ล้างตัวกรอง", "Clear filters")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
