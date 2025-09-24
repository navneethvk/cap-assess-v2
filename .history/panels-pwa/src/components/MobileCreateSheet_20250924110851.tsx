import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import CreateVisitForm from './CreateVisitForm'

const SHEET_ROOT_ID = 'mobile-create-sheet-root'

const ensureRoot = () => {
  if (typeof document === 'undefined') return null
  let root = document.getElementById(SHEET_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = SHEET_ROOT_ID
    document.body.appendChild(root)
  }
  return root
}

interface MobileCreateSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

const MobileCreateSheet: React.FC<MobileCreateSheetProps> = ({ isOpen, onClose, title = 'Create', children }) => {
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const startY = useRef<number | null>(null)
  const currentY = useRef<number>(0)
  const sheetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setRoot(ensureRoot())
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    startY.current = event.touches[0].clientY
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (startY.current === null) return
    const delta = event.touches[0].clientY - startY.current
    if (delta > 0) {
      currentY.current = delta
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${Math.min(delta, 120)}px)`
      }
    }
  }

  const handleTouchEnd = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
    if (currentY.current > 80) {
      onClose()
    }
    startY.current = null
    currentY.current = 0
  }

  if (!root) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[60] transition-opacity duration-200',
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={cn(
          'absolute left-0 right-0 bottom-0 bg-card text-foreground border-t border-border rounded-t-3xl shadow-lg transform transition-transform duration-250 ease-out max-h-[90vh] flex flex-col',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col items-center px-4 pt-4 pb-3 border-b border-border">
          <span className="h-1.5 w-12 rounded-full bg-muted" />
          <div className="mt-3 flex items-center w-full">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-[0.08em]">{title}</div>
            <div className="ml-auto">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {children}
        </div>
      </div>
    </div>,
    root
  )
}

export default MobileCreateSheet

