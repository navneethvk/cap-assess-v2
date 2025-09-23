import React, { useEffect, useState, useMemo } from 'react'
import { useVisitStore } from '@/hooks/useVisitStore'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import TimelineCard from './TimelineCard'
import TimelineControls from './TimelineControls'
import AddVisit from './AddVisit'
import { timestampToDate } from '@/types/firestore'
import type { VisitDoc, UserDoc, CCIDoc, DocumentWithId } from '@/types/firestore'

// Debug flag for development logging (set to false in production)
const DEBUG_VISITS_TIMELINE_COMPONENT = false; // Disabled

const VisitsTimeline: React.FC = () => {
  const {
    loadTimelineData,
    getVisitsInRange,
    isWindowLoading,
    getWindowError,
  } = useVisitStore()
  
  const [selectedDate] = useState(new Date())
  const [isInMoveMode, setIsInMoveMode] = useState(false)
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [draggedVisit, setDraggedVisit] = useState<DocumentWithId<VisitDoc> | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // Load timeline data for the selected date
  useEffect(() => {
    loadTimelineData(selectedDate)
  }, [selectedDate, loadTimelineData])
  
  // Get visits for the current date range (month view)
  const visits = useMemo(() => {
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    return getVisitsInRange(startDate, endDate)
  }, [selectedDate, getVisitsInRange])
  
  const isLoading = useMemo(() => {
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    return isWindowLoading(startDate, endDate)
  }, [selectedDate, isWindowLoading])
  
  const error = useMemo(() => {
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    return getWindowError(startDate, endDate)
  }, [selectedDate, getWindowError])
  
  // Fetch users and CCIs for the timeline
  const { data: allUsers } = useUsersForVisits()
  const { data: allCcis } = useFirestoreCollection<CCIDoc>('ccis')
  
  // Group visits by date
  const visitsByDate = useMemo(() => {
    const grouped: Record<string, DocumentWithId<VisitDoc>[]> = {}
    
    visits.forEach((visit: any) => {
      const visitDate = timestampToDate(visit.date) || new Date()
      const dateKey = visitDate.toISOString().split('T')[0]
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(visit)
    })
    
    // Sort visits within each date by creation time
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => {
        const timeA = timestampToDate(a.createdAt) || new Date()
        const timeB = timestampToDate(b.createdAt) || new Date()
        return timeB.getTime() - timeA.getTime()
      })
    })
    
    return grouped
  }, [visits])
  
  // Get sorted dates
  const sortedDates = useMemo(() => {
    return Object.keys(visitsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  }, [visitsByDate])
  
  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, visit: DocumentWithId<VisitDoc>) => {
    if (!isInMoveMode) return
    
    setDraggedVisit(visit)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }
  
  const handleDragLeave = () => {
    setDragOverIndex(null)
  }
  
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    
    if (!draggedVisit || !isInMoveMode) return
    
    // TODO: Implement reordering logic with the central store
    console.log('Reordering visit:', draggedVisit.id, 'to position:', targetIndex)
    
    setDraggedVisit(null)
    setIsDragging(false)
    setDragOverIndex(null)
  }
  
  const handleToggleMoveMode = async () => {
    setIsInMoveMode(!isInMoveMode)
    if (isInMoveMode) {
      setDraggedVisit(null)
      setIsDragging(false)
      setDragOverIndex(null)
    }
  }
  
  const exitMoveModeClick = () => {
    setIsInMoveMode(false)
    setDraggedVisit(null)
    setIsDragging(false)
    setDragOverIndex(null)
  }
  
  // Handle card toggle
  const handleToggle = (visitId: string) => {
    setOpenCardId(openCardId === visitId ? null : visitId)
  }
  
  if (DEBUG_VISITS_TIMELINE_COMPONENT) {
    console.log('VisitsTimeline - visits count:', visits.length)
    console.log('VisitsTimeline - isLoading:', isLoading)
    console.log('VisitsTimeline - error:', error)
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
  
  const displayVisits = visits
  
  return (
    <div className="relative">
      {/* Add Visit Buttons */}
      <div className="flex justify-center mb-6">
        <AddVisit />
      </div>
      
      {/* Timeline Controls */}
      <TimelineControls
        isInMoveMode={isInMoveMode}
        onToggleMoveMode={handleToggleMoveMode}
        onExitMoveMode={exitMoveModeClick}
      />
      
      {/* Timeline Content */}
      {displayVisits.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p>No visits found for this period.</p>
          <p className="text-sm mt-2">Try selecting a different date or create a new visit.</p>
        </div>
      ) : (
        <>
          {/* Desktop layout */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Timeline spine */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gray-300 -z-10" />
              
              {sortedDates.map((dateKey, dateIndex) => {
                const dateVisits = visitsByDate[dateKey]
                const visitDate = new Date(dateKey)
                
                return (
                  <div key={dateKey} className="relative mb-8">
                    {/* Date header */}
                    <div className="text-center mb-4">
                      <div className="inline-block bg-white px-4 py-2 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {visitDate.toLocaleDateString('en-IN', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Visits for this date */}
                    {dateVisits.map((visit, visitIndex) => {
                      if (DEBUG_VISITS_TIMELINE_COMPONENT) {
                        console.log('VisitsTimeline - Rendering visit:', visit.id, 'at index:', visitIndex)
                      }
                      
                      const left = visitIndex % 2 === 0
                      const isSingleVisit = dateVisits.length === 1
                      
                      return (
                        <div key={visit.id} className="relative mb-8">
                          <div className={`relative z-20 max-w-md ${left ? 'mr-auto' : 'ml-auto'} ${isSingleVisit ? 'mx-auto' : ''}`}>
                            <TimelineCard
                              visit={visit}
                              allUsers={allUsers as DocumentWithId<UserDoc>[]}
                              allCcis={allCcis as DocumentWithId<CCIDoc>[]}
                              expanded={openCardId === visit.id}
                              onToggle={handleToggle}
                              isDragTarget={dragOverIndex === visitIndex}
                              isDragging={isDragging}
                              isInMoveMode={isInMoveMode}
                              onDragStart={(e) => handleDragStart(e, visit)}
                              onDragOver={(e) => handleDragOver(e, visitIndex)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, visitIndex)}
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
            {sortedDates.map((dateKey) => {
              const dateVisits = visitsByDate[dateKey]
              const visitDate = new Date(dateKey)
              
              return (
                <div key={dateKey} className="space-y-4">
                  {/* Date header */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {visitDate.toLocaleDateString('en-IN', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                  </div>
                  
                  {/* Visits for this date */}
                  {dateVisits.map((visit) => {
                    if (DEBUG_VISITS_TIMELINE_COMPONENT) {
                      console.log('VisitsTimeline - Rendering mobile visit:', visit.id)
                    }
                    
                    return (
                      <div key={visit.id} className="relative">
                        {/* Dot on spine - show only in move mode */}
                        {isInMoveMode && (
                          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-6 timeline-dot z-0" />
                        )}
                        
                        <div className="relative z-20 max-w-md mx-auto">
                          <TimelineCard
                            visit={visit}
                            allUsers={allUsers as DocumentWithId<UserDoc>[]}
                            allCcis={allCcis as DocumentWithId<CCIDoc>[]}
                            expanded={openCardId === visit.id}
                            onToggle={handleToggle}
                            isDragTarget={false}
                            isDragging={isDragging}
                            isInMoveMode={isInMoveMode}
                            onDragStart={(e) => handleDragStart(e, visit)}
                            onDragOver={(e) => handleDragOver(e, 0)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 0)}
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
  )
}

export default VisitsTimeline
