import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

import { Button, buttonConfigs } from '@/components/ui/button'
import AddVisit from '@/components/AddVisit'
import TimelineCard from '@/components/TimelineCard'
import { useTitleBarSlots } from '@/store/titleBarSlots'
import { useVisitsForDate } from '@/hooks/useVisitQueries'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { timestampToDate } from '@/types/firestore'
import type { VisitDoc, UserDoc, CCIDoc, DocumentWithId } from '@/types/firestore'

// Debug flag for development logging (set to false in production)
const DEBUG_DAY_VIEW = false; // Disabled

// Helper function to get start of day
const getStartOfDay = (date: Date): Date => {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  return startOfDay
}

// Helper function to get end of day
const getEndOfDay = (date: Date): Date => {
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  return endOfDay
}

const DayView: React.FC = () => {
  const { setSlots, clearSlots } = useTitleBarSlots()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  
  // Get start and end of selected day
  const dayStart = useMemo(() => getStartOfDay(selectedDate), [selectedDate])
  const dayEnd = useMemo(() => getEndOfDay(selectedDate), [selectedDate])
  
  // Load visits for the selected day only
  const { visits, isLoading, error } = useVisitsForDate(selectedDate)
  
  // Fetch users and CCIs for the timeline
  const { data: allUsers } = useUsersForVisits()
  const { data: allCcis } = useFirestoreCollection<CCIDoc>('ccis')
  
  // Sort visits by creation time (newest first)
  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => {
      const timeA = timestampToDate(a.createdAt) || new Date()
      const timeB = timestampToDate(b.createdAt) || new Date()
      return timeB.getTime() - timeA.getTime()
    })
  }, [visits])
  
  // Navigation functions
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
  
  const goToToday = () => {
    setSelectedDate(new Date())
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

  // Title bar slots: center = week range, right = arrows
  useEffect(() => {
    const center = (
      <div className="font-semibold">
        {currentWeekStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        {' - '}
        {currentWeekEnd.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
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
  }, [currentWeekStart, currentWeekEnd, setSlots, clearSlots])
  
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
            const dayVisits = visitsByDate[day.toISOString().split('T')[0]] || []
            
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
                {dayVisits.length > 0 && (
                  <span className="text-xs text-blue-600 font-medium">
                    {dayVisits.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Add Visit Buttons */}
      <div className="flex justify-center mb-6 pt-4">
        <AddVisit />
      </div>
      
      {/* Timeline Content with Swipe Support */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative"
      >
        {visits.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>No visits found for this week.</p>
            <p className="text-sm mt-2">Try selecting a different week or create a new visit.</p>
          </div>
        ) : (
          <>
            {/* Desktop layout */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Timeline spine */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gray-300 -z-10" />
                
                {weekDays.map((day) => {
                  const dayVisits = visitsByDate[day.toISOString().split('T')[0]] || []
                  const isSelected = day.toDateString() === selectedDate.toDateString()
                  
                  if (dayVisits.length === 0) return null
                  
                  return (
                    <div key={day.toISOString()} className="relative mb-8">
                      {/* Date header */}
                      <div className="text-center mb-4">
                        <div className={`inline-block px-4 py-2 rounded-lg shadow-sm border ${
                          isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white'
                        }`}>
                          <h3 className={`text-lg font-semibold ${
                            isSelected ? 'text-blue-800' : 'text-gray-800'
                          }`}>
                            {day.toLocaleDateString('en-IN', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Visits for this date */}
                      {dayVisits.map((visit, visitIndex) => {
                        if (DEBUG_DAY_VIEW) {
                          console.log('DayView - Rendering visit:', visit.id, 'at index:', visitIndex)
                        }
                        
                        const left = visitIndex % 2 === 0
                        const isSingleVisit = dayVisits.length === 1
                        
                        return (
                          <div key={visit.id} className="relative mb-8">
                            <div className={`relative z-20 max-w-md ${left ? 'mr-auto' : 'ml-auto'} ${isSingleVisit ? 'mx-auto' : ''}`}>
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
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Mobile single-column layout */}
            <div className="md:hidden space-y-6 sm:space-y-8">
              {weekDays.map((day) => {
                const dayVisits = visitsByDate[day.toISOString().split('T')[0]] || []
                const isSelected = day.toDateString() === selectedDate.toDateString()
                
                if (dayVisits.length === 0) return null
                
                return (
                  <div key={day.toISOString()} className="space-y-4">
                    {/* Date header */}
                    <div className="text-center">
                      <h3 className={`text-lg font-semibold ${
                        isSelected ? 'text-blue-800' : 'text-gray-800'
                      }`}>
                        {day.toLocaleDateString('en-IN', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h3>
                    </div>
                    
                    {/* Visits for this date */}
                    {dayVisits.map((visit) => {
                      if (DEBUG_DAY_VIEW) {
                        console.log('DayView - Rendering mobile visit:', visit.id)
                      }
                      
                      return (
                        <div key={visit.id} className="relative">
                          <div className="relative z-20 max-w-md mx-auto">
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
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DayView
