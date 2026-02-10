"use client"

import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { AccountStatusBanner } from "@/components/account-status-banner"

/**
 * Keep breadcrumb directly under navbar at all times.
 * Additional banners are rendered below breadcrumb.
 */
export function BreadcrumbBar() {
  return (
    <>
      <div className="sticky top-16 z-30 min-h-10 border-b bg-background flex items-center">
        <div className="container mx-auto px-4 w-full">
          <SiteBreadcrumb />
        </div>
      </div>

      <AnnouncementBanner />
      <AccountStatusBanner />
    </>
  )
}

