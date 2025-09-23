import React from 'react'
import { useVisitsTimeline } from '@/hooks/useVisitsTimeline'
import TimelineCard from './TimelineCard'
import AddVisit from './AddVisit'

// Debug flag for development logging (set to false in production)
const DEBUG_VISITS_TIMELINE_COMPONENT = false; // Disabled

const VisitsTimeline: React.FC = () => {
  const {
    visits,
    allUsers,
    allCcis,
    isLoading,
    error,
    openCardId,
    setOpenCardId,
    mutate
  } = useVisitsTimeline()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <div className="text-sm font-medium text-muted-foreground">Loading visits...</div>
        <div className="text-xs text-muted-foreground mt-1">Please wait while we fetch your data</div>
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="text-sm font-medium text-destructive mb-1">Error loading visits</div>
        <div className="text-xs text-muted-foreground text-center max-w-sm">{error.message}</div>
      </div>
    )
  }

  const displayVisits = visits

  if (DEBUG_VISITS_TIMELINE_COMPONENT) {
    console.log('VisitsTimeline - visits count:', visits.length)
    console.log('VisitsTimeline - displayVisits count:', displayVisits.length)
    console.log('VisitsTimeline - isLoading:', isLoading)
    console.log('VisitsTimeline - error:', error)
  }

  return (
    <div className="relative">
      {/* Add Visit Buttons */}
      <div className="flex justify-center mb-8">
        <AddVisit />
      </div>

      {displayVisits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
            </svg>
          </div>
          <div className="text-base font-medium text-foreground mb-2">No visits scheduled</div>
          <div className="text-sm text-muted-foreground text-center max-w-sm mb-4">
            No visits found for the selected date
          </div>
          <div className="text-xs text-muted-foreground">Use the + button above to schedule a new visit</div>
        </div>
      ) : (
        <>
          {/* Desktop layout */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Timeline spine */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-border -z-10" />
              
          {displayVisits.map((v: any, index: number) => {
                if (DEBUG_VISITS_TIMELINE_COMPONENT) {
                  console.log('VisitsTimeline - Rendering visit:', v.id, 'at index:', index)
                }
            const left = index % 2 === 0
                const isSingleVisit = displayVisits.length === 1
                
            return (
                  <div key={v.id} className="relative mb-12">
                    {/* Dot on spine */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-3 h-3 bg-primary rounded-full z-10 shadow-sm" />
                    
                    {isSingleVisit ? (
                      /* Centered layout for single visit */
                      <div className="flex justify-center">
                        <div className="relative z-20 max-w-md">
                          <TimelineCard
                            visit={v}
                            onUpdated={mutate}
                            expanded={openCardId === v.id}
                            onToggle={(e: React.MouseEvent) => { e.stopPropagation(); setOpenCardId(openCardId === v.id ? null : v.id) }}
                            users={allUsers}
                            ccis={allCcis}
                          />
                        </div>
                      </div>
                    ) : (
                      /* Alternating left/right layout for multiple visits */
                      <div className={`${left ? 'md:pr-8' : 'md:pl-8'} max-w-md ${left ? 'md:mr-auto md:text-right' : 'md:ml-auto md:text-left'}`}>
                  {left && (
                          <div className="relative z-20">
                      <TimelineCard
                              visit={v}
                        onUpdated={mutate}
                        expanded={openCardId === v.id}
                              onToggle={(e: React.MouseEvent) => { e.stopPropagation(); setOpenCardId(openCardId === v.id ? null : v.id) }}
                              users={allUsers}
                              ccis={allCcis}
                      />
                    </div>
                  )}
                  {!left && (
                          <div className="relative z-20">
                      <TimelineCard
                              visit={v}
                        onUpdated={mutate}
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
        <div className="md:hidden space-y-8">
          {displayVisits.map((v: any) => {
              if (DEBUG_VISITS_TIMELINE_COMPONENT) {
                console.log('VisitsTimeline - Rendering mobile visit:', v.id)
              }
            return (
              <div key={v.id} className="relative">
                <div className="relative z-20">
                  <TimelineCard
                      visit={v}
                    onUpdated={mutate}
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

        </>
      )}
    </div>
  )
}

export default VisitsTimeline
