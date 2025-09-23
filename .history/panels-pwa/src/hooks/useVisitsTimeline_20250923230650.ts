import { useMemo, useState } from 'react'

import { useSelectedDateStore } from '@/store/selectedDate'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import type { VisitDoc, UserDoc, CCIDoc, DocumentWithId } from '@/types/firestore'
import { timestampToDate } from '@/types/firestore'
import { useVisitsInRange } from '@/hooks/useVisitQueries'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'

// Debug flag for development logging (set to false in production)
const DEBUG_VISITS_TIMELINE = false; // Disabled

// Re-export types for backward compatibility
export type { VisitDoc, UserDoc as User, CCIDoc as CCI } from '@/types/firestore'

export interface VisitsTimelineState {
  // Data
  visits: DocumentWithId<VisitDoc>[]
  allUsers: DocumentWithId<UserDoc>[]
  allCcis: DocumentWithId<CCIDoc>[]
  isLoading: boolean
  error: any
  
  // Local state
  openCardId: string | null
  
  // Actions
  setOpenCardId: (id: string | null) => void
  mutate: () => void
}

export const useVisitsTimeline = (): VisitsTimelineState => {
  const { selectedDate } = useSelectedDateStore()

  // Data fetching - only fetch all visits for admin users
  const { data: allUsers } = useUsersForVisits()
  const ccisPath = 'ccis' // Temporarily hardcoded
  const { data: allCcis } = useFirestoreCollection<CCIDoc>(ccisPath)

  const startOfDay = useMemo(() => {
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    return start
  }, [selectedDate])

  const endOfDay = useMemo(() => {
    const end = new Date(selectedDate)
    end.setHours(23, 59, 59, 999)
    return end
  }, [selectedDate])

  // Centralized query system automatically handles permissions
  const { visits: allVisits, mutate, error: currentError, isLoading } = useVisitsInRange(startOfDay, endOfDay)

  // Local state
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  // Filter visits by selected date
  const visits = useMemo(() => {
    if (DEBUG_VISITS_TIMELINE) {
      console.log('useVisitsTimeline - allVisits count:', allVisits?.length || 0)
      console.log('useVisitsTimeline - selectedDate:', selectedDate)
    }
    
    if (!allVisits) {
      if (DEBUG_VISITS_TIMELINE) {
        console.log('useVisitsTimeline - no allVisits data')
      }
      return []
    }
    
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(selectedDate)
    end.setHours(23, 59, 59, 999)
    
    if (DEBUG_VISITS_TIMELINE) {
      console.log('useVisitsTimeline - filtering between:', start, 'and', end)
    }
    
    const filtered = (allVisits as VisitDoc[]).filter((v: VisitDoc) => {
      const visitDate = timestampToDate(v.date) || new Date()
      const isInRange = visitDate >= start && visitDate <= end
      if (DEBUG_VISITS_TIMELINE) {
        console.log('useVisitsTimeline - visit:', v.id, 'date:', visitDate, 'inRange:', isInRange)
      }
      return isInRange
    }).sort((a: VisitDoc, b: VisitDoc) => {
      // Sort by creation date
      const dateA = (timestampToDate(a.createdAt) || new Date()).getTime()
      const dateB = (timestampToDate(b.createdAt) || new Date()).getTime()
      return dateA - dateB
    })
    
    if (DEBUG_VISITS_TIMELINE) {
      console.log('useVisitsTimeline - filtered visits count:', filtered.length)
    }
    return filtered
  }, [allVisits, selectedDate])


  return {
    // Data
    visits,
    allUsers: (allUsers || []) as DocumentWithId<UserDoc>[],
    allCcis: (allCcis || []) as DocumentWithId<CCIDoc>[],
    isLoading,
    error: currentError,
    
    // Local state
    openCardId,
    
    // Actions
    setOpenCardId,
    mutate
  }
}
