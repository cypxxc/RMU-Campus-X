"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Ban, AlertTriangle, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface BulkActionsBarProps {
  selectedCount: number
  onActivate: () => void
  onSuspend: () => void
  onBan: () => void
  onClear: () => void
}

export function BulkActionsBar({
  selectedCount,
  onActivate,
  onSuspend,
  onBan,
  onClear,
}: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-card border shadow-2xl rounded-xl p-4 flex items-center gap-4 min-w-[400px]">
            {/* Selection Count */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm font-semibold">
                {selectedCount} รายการ
              </Badge>
              <span className="text-sm text-muted-foreground">ที่เลือก</span>
            </div>

            <div className="h-8 w-px bg-border" />

            {/* Actions */}
            <div className="flex items-center gap-2 flex-1">
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
                onClick={onActivate}
              >
                <CheckCircle2 className="h-4 w-4" />
                เปิดใช้งาน
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={onSuspend}
              >
                <AlertTriangle className="h-4 w-4" />
                ระงับ
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                onClick={onBan}
              >
                <Ban className="h-4 w-4" />
                แบน
              </Button>
            </div>

            {/* Clear Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
