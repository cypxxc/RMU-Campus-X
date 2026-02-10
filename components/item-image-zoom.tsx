"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Image from "next/image"

interface ItemImageZoomProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string | null
  title: string
  currentIndex: number
  totalImages: number
}

export function ItemImageZoom({
  open,
  onOpenChange,
  imageUrl,
  title,
  currentIndex,
  totalImages,
}: ItemImageZoomProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-fit p-0 bg-transparent border-none shadow-none flex items-center justify-center" showCloseButton={false}>
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <div className="relative group">
          {imageUrl && (
            <div className="relative max-h-[90vh] max-w-full overflow-hidden rounded-2xl shadow-2xl bg-black/50 backdrop-blur-sm p-1">
              <Image 
                src={imageUrl} 
                alt={title} 
                width={1200} 
                height={1200} 
                className="object-contain max-h-[85vh] w-auto h-auto rounded-xl"
                unoptimized
              />
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full h-10 w-10 shadow-lg border border-white/20 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              {/* Image counter */}
              {totalImages > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                  {currentIndex + 1} / {totalImages}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
