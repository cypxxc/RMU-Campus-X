"use client"

import { SiteBreadcrumb } from "@/components/site-breadcrumb"

/**
 * แถบ breadcrumb ติดใต้ navbar (sticky) ค่า top คงที่ ไม่ขยับเมื่อเลื่อนหรือเมื่อปิดประกาศ
 */
export function BreadcrumbBar() {
  return (
    <div className="sticky top-16 z-30 bg-background border-b min-h-10 flex items-center">
      <div className="container mx-auto px-4 w-full">
        <SiteBreadcrumb />
      </div>
    </div>
  )
}
