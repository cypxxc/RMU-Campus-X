import { SiteBreadcrumb } from "@/components/site-breadcrumb"

/**
 * แถบ breadcrumb ใต้ Navbar ค้างเมื่อ scroll (sticky top-16 ให้อยู่ใต้ Navbar h-16)
 */
export function BreadcrumbBar() {
  return (
    <div className="sticky top-16 z-40 bg-background">
      <div className="container mx-auto px-4">
        <SiteBreadcrumb />
      </div>
    </div>
  )
}
