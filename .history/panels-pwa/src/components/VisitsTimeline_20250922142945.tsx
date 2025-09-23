import React from 'react'
import { useVisitsTimeline } from '@/hooks/useVisitsTimeline'
import TimelineCard from './TimelineCard'
import TimelineControls from './TimelineControls'
import AddVisit from './AddVisit'

const VisitsTimeline: React.FC = () => {
  const {
    visits,
    allUsers,
    allCcis,
    isLoading,
    error,
    localVisits,
    openCardId,
    draggedVisit,
    isDragging,
    isInMoveMode,
    dragOverIndex,
    setOpenCardId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    exitMoveModeClick,
    mutate
  } = useVisitsTimeline()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading visits...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-500">Error loading visits: {error.message}</div>
      </div>
    )
  }

  const displayVisits = localVisits.length > 0 ? localVisits : visits

  console.log('VisitsTimeline - visits:', JSON.stringify(visits, null, 2))
  console.log('VisitsTimeline - localVisits:', JSON.stringify(localVisits, null, 2))
  console.log('VisitsTimeline - displayVisits:', JSON.stringify(displayVisits, null, 2))
  console.log('VisitsTimeline - displayVisits.length:', displayVisits.length)
  console.log('VisitsTimeline - isLoading:', isLoading)
  console.log('VisitsTimeline - error:', error)

  return (
    <div className="relative">
      {/* Add Visit Buttons */}
      <div className="flex justify-center mb-6">
        <AddVisit />
        </div>

      {displayVisits.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No visits found for this date
        </div>
      ) : (
        <>
          {/* Desktop layout */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Timeline spine */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gray-300 -z-10" />
              
          {displayVisits.map((v, index) => {
                console.log('VisitsTimeline - Rendering visit:', v.id, 'at index:', index)
            const left = index % 2 === 0
                const isSingleVisit = displayVisits.length === 1
                
            return (
                  <div key={v.id} className="relative mb-8">
                    {/* Dot on spine */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full z-10" />
                    
                    {isSingleVisit ? (
                      /* Centered layout for single visit */
                      <div className="flex justify-center">
                        <div className="relative z-10 max-w-md bg-white" data-visit-card-pos data-order={(v as any).order ?? (v.createdAt?.toDate ? v.createdAt.toDate().getTime() : v.createdAt?.getTime?.() ?? 0)}>
                          <TimelineCard
                            visit={v}
                            onUpdated={mutate}
                            onDragStart={handleDragStart}
                            onDragOver={(e) => handleDragOver(e, v)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, v)}
                            isDragging={isDragging && draggedVisit?.id === v.id}
                            anyDragging={isInMoveMode}
                            isDragTarget={dragOverIndex === index && !!draggedVisit && draggedVisit.id !== v.id}
                            expanded={openCardId === v.id}
                            onToggle={(e: React.MouseEvent) => { e.stopPropagation(); setOpenCardId(openCardId === v.id ? null : v.id) }}
                            users={allUsers}
                            ccis={allCcis}
                          />
                        </div>
                      </div>
                    ) : (
                      /* Alternating left/right layout for multiple visits */
                      <div className={`${left ? '' : 'md:pl-10'} max-w-md md:ml-0`}>
                  {left && (
                          <div className="md:mr-auto relative z-10 bg-white" data-visit-card-pos data-order={(v as any).order ?? (v.createdAt?.toDate ? v.createdAt.toDate().getTime() : v.createdAt?.getTime?.() ?? 0)}>
                      <TimelineCard
                              visit={v}
                        onUpdated={mutate}
                        onDragStart={handleDragStart}
                        onDragOver={(e) => handleDragOver(e, v)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, v)}
                        isDragging={isDragging && draggedVisit?.id === v.id}
                        anyDragging={isInMoveMode}
                        isDragTarget={dragOverIndex === index && !!draggedVisit && draggedVisit.id !== v.id}
                        expanded={openCardId === v.id}
                              onToggle={(e: React.MouseEvent) => { e.stopPropagation(); setOpenCardId(openCardId === v.id ? null : v.id) }}
                              users={allUsers}
                              ccis={allCcis}
                      />
                    </div>
                  )}
                  {!left && (
                          <div className="md:mr-auto relative z-10 bg-white" data-visit-card-pos data-order={(v as any).order ?? (v.createdAt?.toDate ? v.createdAt.toDate().getTime() : v.createdAt?.getTime?.() ?? 0)}>
                      <TimelineCard
                              visit={v}
                        onUpdated={mutate}
                        onDragStart={handleDragStart}
                        onDragOver={(e) => handleDragOver(e, v)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, v)}
                        isDragging={isDragging && draggedVisit?.id === v.id}
                        anyDragging={isInMoveMode}
                        isDragTarget={dragOverIndex === index && !!draggedVisit && draggedVisit.id !== v.id}
                        expanded={openCardId === v.id}
                              onToggle={(e: React.MouseEvent) => { e.stopPropagation(); setOpenCardId(openCardId === v.id ? null : v.id) }}
                              users={allUsers}
                              ccis={allCcis}
                      />
                    </div>
                  )}
                </div>
                    )}
              </div>
            )
          })}
            </div>
        </div>

        {/* Mobile single-column layout */}
        <div className="md:hidden space-y-6 sm:space-y-8">
          {displayVisits.map((v) => {
              console.log('VisitsTimeline - Rendering mobile visit:', v.id)
            return (
              <div key={v.id} className="relative">
                {/* Dot on spine - show only in move mode */}
                {isInMoveMode && (
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-6 timeline-dot z-0" />
                )}
                <div className="relative z-10 bg-white" data-visit-card-pos data-order={(v as any).order ?? (v.createdAt?.toDate ? v.createdAt.toDate().getTime() : v.createdAt?.getTime?.() ?? 0)}>
                  <TimelineCard
                      visit={v}
                    onUpdated={mutate}
                    onDragStart={handleDragStart}
                    onDragOver={(e) => handleDragOver(e, v)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, v)}
                    isDragging={isDragging && draggedVisit?.id === v.id}
                    anyDragging={isInMoveMode}
                    isDragTarget={false}
                    expanded={openCardId === v.id}
                      onToggle={(e) => { e.stopPropagation(); setOpenCardId(openCardId === v.id ? null : v.id) }}
                      users={allUsers}
                      ccis={allCcis}
                  />
                </div>
              </div>
            )
          })}
          </div>

          {/* Move Mode Controls */}
          <TimelineControls
            isInMoveMode={isInMoveMode}
            onExitMoveMode={exitMoveModeClick}
          />
        </>
      )}
    </div>
  )
}

export default VisitsTimeline