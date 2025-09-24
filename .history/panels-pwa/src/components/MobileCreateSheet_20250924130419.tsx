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
  initialDate?: Date
  desktop?: boolean
}

const MobileCreateSheet: React.FC<MobileCreateSheetProps> = ({ isOpen, onClose, title = 'Create', initialDate, desktop = false }) => {
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const startY = useRef<number | null>(null)
  const currentY = useRef<number>(0)
  const sheetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (desktop) {
      setRoot(document.body)
    } else {
      setRoot(ensureRoot())
    }
  }, [desktop])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (desktop) return
    startY.current = event.touches[0].clientY
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (desktop) return
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
    if (desktop) return
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

  const sheet = (
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
          desktop
            ? 'absolute inset-0 m-auto h-[85vh] w-full max-w-3xl rounded-3xl border border-border bg-card text-foreground shadow-2xl flex flex-col'
            : 'absolute left-0 right-0 bottom-0 bg-card text-foreground border-t border-border rounded-t-3xl shadow-lg transform transition-transform duration-250 ease-out max-h-[90vh] flex flex-col',
          desktop ? 'translate-y-0' : isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          backgroundColor: 'hsl(var(--card))',
          opacity: 1,
          backdropFilter: desktop ? 'blur(12px)' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={cn(
          'px-4 border-b border-border',
          desktop ? 'flex items-center justify-between py-4' : 'flex flex-col items-center pt-4 pb-3'
        )}>
          {!desktop && <span className="h-1.5 w-12 rounded-full bg-muted" />}
          <div className={cn('flex items-center w-full', desktop ? '' : 'mt-3')}>
            <div className={cn(
              'font-medium text-muted-foreground uppercase tracking-[0.08em]',
              desktop ? 'text-base' : 'text-sm'
            )}>{title}</div>
            <div className="ml-auto">
              <Button
                size="icon"
                variant="ghost"
                className={cn('text-muted-foreground hover:text-foreground', desktop ? 'h-9 w-9' : 'h-8 w-8')}
                onClick={onClose}
                aria-label="Close"
              >
                <X className={desktop ? 'h-5 w-5' : 'h-4 w-4'} />
              </Button>
            </div>
          </div>
        </div>
        <div className={cn('flex-1 overflow-y-auto', desktop ? 'px-6 py-6' : '')}>
          <CreateVisitForm
            initialDate={initialDate}
            onSave={() => {
              onClose()
            }}
            onCancel={onClose}
            className={desktop ? 'px-0 py-0 max-h-full overflow-y-auto' : 'px-0 py-0'}
          />
        </div>
      </div>
    </div>
  )

  return desktop ? sheet : createPortal(sheet, root)
}

export default MobileCreateSheet

