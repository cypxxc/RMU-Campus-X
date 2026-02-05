"use client"

import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { useAnnouncement } from "@/components/announcement-context"

/**
 * แถบ breadcrumb อยู่ใต้ Navbar (+ แบนเนอร์ประกาศถ้ามี)
 * top-28 เมื่อมีประกาศ, top-16 เมื่อไม่มี เพื่อไม่ให้มีช่องว่าง
 */
export function BreadcrumbBar() {
  const { hasAnnouncementVisible } = useAnnouncement()
  return (
    <div className={`sticky z-30 bg-background border-b ${hasAnnouncementVisible ? "top-28" : "top-16"}`}>
      <div className="container mx-auto px-4">
        <SiteBreadcrumb />
      </div>
    </div>
  )
}
