import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button, buttonConfigs } from '@/components/ui/button'
import TimelineCard from '@/components/TimelineCard'
import { useTitleBarSlots } from '@/store/titleBarSlots'
import { useVisitsInRange } from '@/hooks/useVisitQueries'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { timestampToDate } from '@/types/firestore'
import type { VisitDoc, UserDoc, CCIDoc, DocumentWithId } from '@/types/firestore'
import { DatePicker } from '@/components/ui/DatePicker'

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
  const navigate = useNavigate()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  
  // Get current week for the date strip
  const currentWeekStart = useMemo(() => getStartOfWeek(selectedDate), [selectedDate])
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart])
  
  // Get the day range for the selected date
  const dayRange = useMemo(() => getDayRange(selectedDate), [selectedDate])
  
  // Load visits for the selected date only
  const { visits, isLoading, error } = useVisitsInRange(dayRange.start, dayRange.end)
  
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
  
  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

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
  
  // No-op drag handlers to satisfy TimelineCard props while keeping DayView lean
  const noopDragStart = (_e: React.DragEvent, _v: DocumentWithId<VisitDoc>) => {}
  const noopDragOver = (e: React.DragEvent, _v: DocumentWithId<VisitDoc>) => { e.preventDefault?.() }
  const noopDragLeave = () => {}
  const noopDrop = (_e: React.DragEvent, _v: DocumentWithId<VisitDoc>) => {}

  // Handle card toggle
  const handleToggle = (visitId: string) => {
    setOpenCardId(openCardId === visitId ? null : visitId)
  }


  // Title bar slots: center = date picker, right = arrows for week navigation
  useEffect(() => {
    const center = (
      <DatePicker
        value={selectedDate}
        onChange={(date) => date && setSelectedDate(date)}
        className="min-w-[100px]"
      />
    )
    const right = (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek} title="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded">
          W{getWeekNumber(selectedDate)}
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextWeek} title="Next week">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
    setSlots({ customCenter: center, customRight: right })
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
  
  return (
    <div className="relative pb-24">
      {/* Week Days Row below title bar */}
      <div className="px-4 pt-3">
        <div className="flex justify-between">
          {weekDays.map((day, index) => {
            const isSelected = day.toDateString() === selectedDate.toDateString()
            
            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
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
      </div>
      
      {/* Floating Add Visit Button */}
      <button
        type="button"
        onClick={() => navigate(`/meeting-notes/new?mode=edit&date=${selectedDate.toISOString()}`)}
        className="fixed bottom-24 right-6 sm:right-8 z-40 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Create visit"
      >
        <Plus className="h-6 w-6 sm:h-7 sm:w-7 m-auto" />
      </button>
      
      {/* Simple list of visits for the selected date */}
      <div className="px-4">
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
          <div className="space-y-4 max-w-2xl mx-auto">
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
