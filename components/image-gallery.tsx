'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download } from 'lucide-react'
import { useI18n } from '@/components/language-provider'
import { cn } from '@/lib/utils'

interface ImageGalleryProps {
  images: string[]
  alt?: string
  className?: string
  thumbnailClassName?: string
  initialIndex?: number
  showThumbnails?: boolean
}

export function ImageGallery({
  images,
  alt = 'Image',
  className,
  thumbnailClassName,
  initialIndex = 0,
  showThumbnails = true,
}: ImageGalleryProps) {
  const { tt } = useI18n()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isOpen, setIsOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const effectiveAlt = alt || tt('รูปภาพ', 'Image')

  const handleOpen = useCallback(() => {
    setZoom(1)
    setIsOpen(true)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    setZoom(1)
  }, [])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    setZoom(1)
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    setZoom(1)
  }, [images.length])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious()
          break
        case 'ArrowRight':
          handleNext()
          break
        case 'Escape':
          setIsOpen(false)
          break
        case '+':
        case '=':
          setZoom((z) => Math.min(z + 0.25, 3))
          break
        case '-':
          setZoom((z) => Math.max(z - 0.25, 0.5))
          break
      }
    },
    [isOpen, handlePrevious, handleNext]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = images[currentIndex] || ''
    link.download = `image-${currentIndex + 1}.jpg`
    link.click()
  }

  if (images.length === 0) {
    return (
      <div className={cn('aspect-square bg-muted rounded-lg flex items-center justify-center', className)}>
        <span className="text-muted-foreground">{tt('ไม่มีรูปภาพ', 'No image')}</span>
      </div>
    )
  }

  return (
    <>
      {/* Main Image */}
      <div className={cn('relative group', className)}>
        <div 
          className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted cursor-zoom-in"
          onClick={handleOpen}
        >
          <Image
            src={images[currentIndex] || ''}
            alt={`${effectiveAlt} ${currentIndex + 1}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          
          {/* Zoom indicator */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
          </div>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Navigation arrows (main view) */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={tt('รูปก่อนหน้า', 'Previous image')}
              onClick={(e) => {
                e.stopPropagation()
                handlePrevious()
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={tt('รูปถัดไป', 'Next image')}
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index)
                setZoom(1)
              }}
              className={cn(
                'relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all',
                thumbnailClassName,
                index === currentIndex
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              <Image
                src={image}
                alt={`${effectiveAlt} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none" showCloseButton={false}>
          <div className="relative w-full h-[90vh] flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
              aria-label={tt('ปิดตัวอย่างรูป', 'Close image preview')}
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Zoom controls */}
            <div className="absolute top-4 left-4 z-50 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white rounded-full"
                aria-label={tt('ซูมออก', 'Zoom out')}
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white rounded-full"
                aria-label={tt('ซูมเข้า', 'Zoom in')}
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white rounded-full"
                aria-label={tt('ดาวน์โหลดรูป', 'Download image')}
                onClick={handleDownload}
              >
                <Download className="w-5 h-5" />
              </Button>
              <span className="bg-black/50 text-white text-sm px-3 py-2 rounded-full">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Image */}
            <div 
              className="relative w-full h-full flex items-center justify-center overflow-hidden"
              style={{ cursor: zoom > 1 ? 'move' : 'default' }}
            >
              <Image
                src={images[currentIndex] || ''}
                alt={`${effectiveAlt} ${currentIndex + 1}`}
                fill
                className="object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
                sizes="95vw"
                priority
              />
            </div>

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-12 h-12"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-12 h-12"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-full">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
