import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button, buttonConfigs } from '@/components/ui/button'
import AddVisit from '@/components/AddVisit'
import TimelineCard from '@/components/TimelineCard'
import { useTitleBarSlots } from '@/store/titleBarSlots'
import { useVisitsInRange } from '@/hooks/useVisitQueries'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { timestampToDate } from '@/types/firestore'
import type { VisitDoc, UserDoc, CCIDoc, DocumentWithId } from '@/types/firestore'

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

// Helper function to get the end of the week (Sunday)
const getEndOfWeek = (date: Date): Date => {
  const endOfWeek = new Date(date)
  const day = endOfWeek.getDay()
  const diff = endOfWeek.getDate() - day + (day === 0 ? 0 : 7) // Adjust when day is Sunday
  endOfWeek.setDate(diff)
  endOfWeek.setHours(23, 59, 59, 999)
  return endOfWeek
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
  
  // Get current week for the date strip
  const currentWeekStart = useMemo(() => getStartOfWeek(selectedDate), [selectedDate])
  const currentWeekEnd = useMemo(() => getEndOfWeek(selectedDate), [selectedDate])
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
  
  // Navigation functions
  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 7)
    setSelectedDate(newDate)
  }
  
  const goToNextWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 7)
    setSelectedDate(newDate)
  }
  
  const goToDate = (date: Date) => {
    setSelectedDate(date)
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

  // Title bar slots: center = selected date, right = arrows
  useEffect(() => {
    const center = (
      <div className="font-semibold">
        {selectedDate.toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
    )
    const right = (
      <div className="flex gap-2">
        <Button {...buttonConfigs.icon} onClick={goToPreviousWeek} title="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button {...buttonConfigs.icon} onClick={goToNextWeek} title="Next week">
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
        <div className="text-gray-500">Loading visits...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">Error loading visits: {error}</div>
      </div>
    )
  }
  
  return (
    <div className="relative">
      {/* Week Days Row below title bar */}
      <div className="px-4 pt-3">
        <div className="flex justify-between">
          {weekDays.map((day, index) => {
            const isSelected = day.toDateString() === selectedDate.toDateString()
            
            return (
              <button
                key={index}
                onClick={() => goToDate(day)}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  isSelected 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
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
      
      {/* Add Visit Button */}
      <div className="flex justify-center mb-6 pt-4">
        <AddVisit />
      </div>
      
      {/* Simple list of visits for the selected date */}
      <div className="px-4">
        {sortedVisits.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
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
