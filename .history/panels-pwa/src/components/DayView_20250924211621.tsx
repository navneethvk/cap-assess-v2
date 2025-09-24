import React, { useEffect, useMemo, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import FloatingCreateButton from '@/components/FloatingCreateButton'
import MobileCreateSheet from '@/components/MobileCreateSheet'
import useIsMobile from '@/hooks/useIsMobile'
import TimelineCard from '@/components/TimelineCard'
import { useTitleBarSlots } from '@/store/titleBarSlots'
import { useSharedVisitsForDate } from '@/hooks/useSharedVisitsListener'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { timestampToDate } from '@/types/firestore'
import type { VisitDoc, UserDoc, CCIDoc, DocumentWithId } from '@/types/firestore'
import { SingleDatePicker } from '@/components/ui'
import { PillSelector } from '@/components/ui/pill-selector'
import type { PillOption } from '@/components/ui/pill-selector'

// Debug flag for development logging (set to false in production)
const DEBUG_DAY_VIEW = false; // Disabled

// Helper function to get the start of the week (Monday)
const getStartOfWeek = (date: Date): Date => {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  startOfWeek.setDate(diff)
  startOfWeek.setHours(0, 0, 0, 0)
  return startOfWeek
}


// Helper function to get all days in a week
const getWeekDays = (startDate: Date): Date[] => {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)
    days.push(day)
  }
  return days
}

// Helper function to get start and end of a specific day
const getDayRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

const DayView: React.FC = () => {
  const { setSlots, clearSlots } = useTitleBarSlots()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTitle, setSheetTitle] = useState<string>('Create')
  const isMobile = useIsMobile()
  
  // Touch handlers refs - must be declared before any early returns
  const dayTouchStartX = useRef<number | null>(null)
  const dayTouchStartY = useRef<number | null>(null)
  const dateScrollerTouchStartX = useRef<number | null>(null)
  const dateScrollerTouchStartY = useRef<number | null>(null)
  
  // Get current week for the date strip
  const currentWeekStart = useMemo(() => getStartOfWeek(selectedDate), [selectedDate])
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart])
  
  // Load visits for the selected date only
  const { data: visits, loading: isLoading, error } = useSharedVisitsForDate(selectedDate)
  
  // Fetch users and CCIs for the timeline
  const { data: allUsers } = useUsersForVisits()
  const { data: allCcis } = useFirestoreCollection<CCIDoc>('ccis')
  
  // Sort visits for the selected date by creation time
  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => {
      const timeA = timestampToDate(a.createdAt) || new Date()
      const timeB = timestampToDate(b.createdAt) || new Date()
      return timeB.getTime() - timeA.getTime()
    })
  }, [visits])
  

  // Helper function to get Monday of the week
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Navigation functions
  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 7)
    const mondayOfWeek = getMondayOfWeek(newDate)
    setSelectedDate(mondayOfWeek)
  }

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 7)
    const mondayOfWeek = getMondayOfWeek(newDate)
    setSelectedDate(mondayOfWeek)
  }

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  // No-op drag handlers to satisfy TimelineCard props while keeping DayView lean
  const noopDragStart = (_e: React.DragEvent, _v: DocumentWithId<VisitDoc>) => {}
  const noopDragOver = (e: React.DragEvent, _v: DocumentWithId<VisitDoc>) => { e.preventDefault?.() }
  const noopDragLeave = () => {}
  const noopDrop = (_e: React.DragEvent, _v: DocumentWithId<VisitDoc>) => {}

  // Handle card toggle
  const handleToggle = (visitId: string) => {
    setOpenCardId(openCardId === visitId ? null : visitId)
  }

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; query?: string; to?: string; mode?: string }>).detail
      setSheetOpen(true)
      setSheetTitle(detail?.title || 'Create')
    }

    const handleClose = () => setSheetOpen(false)

    window.addEventListener('create:open', handleOpen as EventListener)
    window.addEventListener('create:close', handleClose)

    return () => {
      window.removeEventListener('create:open', handleOpen as EventListener)
      window.removeEventListener('create:close', handleClose)
    }
  }, [])


  // Title bar slots: center = date picker, right = view switcher
  useEffect(() => {
    const center = (
      <SingleDatePicker
        value={selectedDate}
        onChange={(value) => {
          if (!value) {
            setSelectedDate(new Date())
            return
          }
          if (value && typeof value === 'object' && 'from' in value) {
            return
          }
          if (value instanceof Date) {
            setSelectedDate(value)
          }
        }}
        className="min-w-[100px]"
        placeholder="Select date"
      />
    )
    
    const viewOptions: PillOption[] = [
      { label: 'D', value: 'day' },
      { label: 'M', value: 'month' }
    ]
    
    const right = (
      <PillSelector
        value="day"
        onChange={(value) => {
          if (value === 'month') {
            window.location.href = '/monthview'
          }
        }}
        options={viewOptions}
        size="sm"
        className="min-w-[40px] h-6 flex items-center justify-center"
        showDropdownIndicator={false}
      />
    )
    
    setSlots({ customLeft: null, customCenter: center, customRight: right })
    return () => clearSlots()
  }, [selectedDate, setSlots, clearSlots])
  
  if (DEBUG_DAY_VIEW) {
    console.log('DayView - visits count:', visits.length)
    console.log('DayView - isLoading:', isLoading)
    console.log('DayView - error:', error)
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Loading visits...</div>
      </div>
    )
  }
  
  if (error && !isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-destructive">Error loading visits: {String(error)}</div>
      </div>
    )
  }

  // Day-by-day swipe handlers for main content area
  const onDayTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    dayTouchStartX.current = event.touches[0].clientX
    dayTouchStartY.current = event.touches[0].clientY
  }

  const onDayTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (dayTouchStartX.current === null || dayTouchStartY.current === null) return
    const deltaX = event.touches[0].clientX - dayTouchStartX.current
    const deltaY = event.touches[0].clientY - dayTouchStartY.current
    if (Math.abs(deltaY) > Math.abs(deltaX)) return
    if (Math.abs(deltaX) > 60) {
      if (deltaX > 0) {
        goToPreviousDay()
      } else {
        goToNextDay()
      }
      dayTouchStartX.current = null
      dayTouchStartY.current = null
    }
  }

  const onDayTouchEnd = () => {
    dayTouchStartX.current = null
    dayTouchStartY.current = null
  }

  // Week navigation swipe handlers for date scroller
  const onDateScrollerTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    dateScrollerTouchStartX.current = event.touches[0].clientX
    dateScrollerTouchStartY.current = event.touches[0].clientY
  }

  const onDateScrollerTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (dateScrollerTouchStartX.current === null || dateScrollerTouchStartY.current === null) return
    const deltaX = event.touches[0].clientX - dateScrollerTouchStartX.current
    const deltaY = event.touches[0].clientY - dateScrollerTouchStartY.current
    if (Math.abs(deltaY) > Math.abs(deltaX)) return
    if (Math.abs(deltaX) > 80) { // Higher threshold for week navigation
      if (deltaX > 0) {
        goToPreviousWeek()
      } else {
        goToNextWeek()
      }
      dateScrollerTouchStartX.current = null
      dateScrollerTouchStartY.current = null
    }
  }

  const onDateScrollerTouchEnd = () => {
    dateScrollerTouchStartX.current = null
    dateScrollerTouchStartY.current = null
  }

  return (
    <div className="relative pb-24">
      {/* Week Days Row below title bar */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          {/* Desktop arrows - hidden on mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToPreviousWeek} 
            title="Previous week" 
            className="shrink-0 hidden md:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Date scroller with swipe support */}
          <div 
            className="flex-1 flex justify-between"
            onTouchStart={onDateScrollerTouchStart}
            onTouchMove={onDateScrollerTouchMove}
            onTouchEnd={onDateScrollerTouchEnd}
          >
            {weekDays.map((day, index) => {
            const isSelected = day.toDateString() === selectedDate.toDateString()
            
            return (
              <button
                key={index}
                onClick={(e) => {
                  // Prevent click if it was part of a swipe gesture
                  if (dateScrollerTouchStartX.current !== null) {
                    e.preventDefault()
                    return
                  }
                  setSelectedDate(day)
                }}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'hover:bg-accent/50 text-foreground'
                }`}
                style={isSelected ? { 
                  backgroundColor: 'hsl(var(--primary))', 
                  color: 'hsl(var(--primary-foreground))' 
                } : undefined}
              >
                <span className="text-xs font-medium">
                  {day.toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
                <span className="text-sm font-semibold">
                  {day.getDate()}
                </span>
              </button>
            )
          })}
          </div>
          
          {/* Desktop arrows - hidden on mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToNextWeek} 
            title="Next week" 
            className="shrink-0 hidden md:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Floating Add Visit Button */}
      <FloatingCreateButton
        date={selectedDate}
        className="bottom-24 right-6 sm:right-8"
        label="Create visit"
        buildQuery={(params) => {
          params.set('date', selectedDate.toISOString())
          return params
        }}
      />

      {/* Create sheet (mobile bottom sheet, desktop modal) */}
      <MobileCreateSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
        initialDate={selectedDate}
        desktop={!isMobile}
      />
      
      {/* Simple list of visits for the selected date */}
      <div 
        className="px-4"
        onTouchStart={onDayTouchStart}
        onTouchMove={onDayTouchMove}
        onTouchEnd={onDayTouchEnd}
      >
        {sortedVisits.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>No visits found for {selectedDate.toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}.</p>
            <p className="text-sm mt-2">Try selecting a different date or create a new visit.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
            {sortedVisits.map((visit) => {
              if (DEBUG_DAY_VIEW) {
                console.log('DayView - Rendering visit:', visit.id)
              }
              
              return (
                <div key={visit.id} className="relative">
                  <TimelineCard
                    visit={visit}
                    users={(allUsers as DocumentWithId<UserDoc>[]) || []}
                    ccis={(allCcis as DocumentWithId<CCIDoc>[]) || []}
                    expanded={openCardId === visit.id}
                    onToggle={() => handleToggle(visit.id)}
                    onDragStart={noopDragStart}
                    onDragOver={noopDragOver}
                    onDragLeave={noopDragLeave}
                    onDrop={noopDrop}
                    isDragging={false}
                    anyDragging={false}
                    isDragTarget={false}
                    onUpdated={() => {}}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default DayView
