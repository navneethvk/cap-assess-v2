import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSelectedDateStore } from '@/store/selectedDate'
import { useReorderStore } from '@/store/reorderStore'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { useUserVisits } from '@/hooks/useUserVisits'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import useAuthStore from '@/store/authStore'
// import { visitsCollection, ccisCollection } from '@/firebase/paths' // Temporarily disabled
import { updateDocument } from '@/firebase/firestoreService'
import { notify } from '@/utils/notify'
import type { VisitDoc, UserDoc, CCIDoc, DocumentWithId } from '@/types/firestore'
import { timestampToDate } from '@/types/firestore'

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
  localVisits: DocumentWithId<VisitDoc>[]
  openCardId: string | null
  draggedVisit: DocumentWithId<VisitDoc> | null
  isDragging: boolean
  isInMoveMode: boolean
  dragOverIndex: number | null
  
  // Actions
  setOpenCardId: (id: string | null) => void
  handleDragStart: (e: React.DragEvent, visit: DocumentWithId<VisitDoc>) => void
  handleDragOver: (e: React.DragEvent, targetVisit: DocumentWithId<VisitDoc>) => void
  handleDragLeave: () => void
  handleDrop: (e: React.DragEvent, targetVisit: DocumentWithId<VisitDoc>) => void
  exitMoveModeClick: () => Promise<void>
  mutate: () => void
}

export const useVisitsTimeline = (): VisitsTimelineState => {
  const { selectedDate } = useSelectedDateStore()
  const { user } = useAuthStore()
  const { 
    localOrderIdsByDate, 
    startMove, 
    updateLocalOrder, 
    exitMove, 
    queueUpdates, 
    removeQueueForDate 
  } = useReorderStore()

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false)
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true)
          const role = idTokenResult.claims.role as string
          setIsAdmin(role === 'Admin')
        } catch (err) {
          console.error('Error checking admin status:', err)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
    }
    checkAdminStatus()
  }, [user])

  // Data fetching - only fetch all visits for admin users
  const adminVisitsResult = useFirestoreCollection<VisitDoc>(
    'visits',
    { revalidateOnFocus: false }
  )
  
  // Only use admin visits data if user is admin, otherwise provide empty fallback
  const visitsRaw = isAdmin ? adminVisitsResult.data : []
  const visitsError = isAdmin ? adminVisitsResult.error : null
  const mutateVisitsRaw = isAdmin ? adminVisitsResult.mutate : () => Promise.resolve()
  const { data: userVisits, error: userVisitsError, mutate: mutateUserVisits } = useUserVisits('visits')
  const { data: allUsers } = useUsersForVisits()
  const ccisPath = 'ccis' // Temporarily hardcoded
  const { data: allCcis } = useFirestoreCollection<CCIDoc>(ccisPath)

  // Use the appropriate data source based on admin status
  const allVisits = isAdmin ? visitsRaw : userVisits
  const currentError = isAdmin ? visitsError : userVisitsError

  // Refresh data when component mounts to clear any cache issues
  useEffect(() => {
    const refreshData = async () => {
      try {
        if (isAdmin) {
          await mutateVisitsRaw();
        } else {
          await mutateUserVisits();
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    };
    refreshData();
  }, [isAdmin, mutateVisitsRaw, mutateUserVisits]);

  // Expose the appropriate mutate function
  const mutate = isAdmin ? mutateVisitsRaw : mutateUserVisits

  // Local state
  const [localVisits, setLocalVisits] = useState<VisitDoc[]>([])
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [draggedVisit, setDraggedVisit] = useState<VisitDoc | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isInMoveMode, setIsInMoveMode] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Filter visits by selected date
  const visits = useMemo(() => {
    if (DEBUG_VISITS_TIMELINE) {
      console.log('useVisitsTimeline - allVisits count:', allVisits?.length || 0)
      console.log('useVisitsTimeline - selectedDate:', selectedDate)
      console.log('useVisitsTimeline - isAdmin:', isAdmin)
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
      const orderA = (a as any).order ?? (timestampToDate(a.createdAt) || new Date()).getTime()
      const orderB = (b as any).order ?? (timestampToDate(b.createdAt) || new Date()).getTime()
      return orderA - orderB
    })
    
    if (DEBUG_VISITS_TIMELINE) {
      console.log('useVisitsTimeline - filtered visits count:', filtered.length)
    }
    return filtered
  }, [allVisits, selectedDate, isAdmin])

  const dateKey = useMemo(() => new Date(selectedDate).toDateString(), [selectedDate])

  // Initialize local state from store (or fresh) on date change
  useEffect(() => {
    if (isInMoveMode) return // don't reset while user is reordering
    const storedIds = localOrderIdsByDate[dateKey]
    if (storedIds && storedIds.length) {
      // Map stored order to visit objects
      const idToVisit = new Map(visits.map(v => [v.id, v]))
      const ordered = storedIds.map(id => idToVisit.get(id)).filter(Boolean) as VisitDoc[]
      const missing = visits.filter(v => !storedIds.includes(v.id))
      setLocalVisits([...ordered, ...missing])
    } else {
      setLocalVisits(visits)
    }
  }, [dateKey, localOrderIdsByDate, visits, isInMoveMode])

  // Drag handlers for local-only reordering (no Firestore writes here)
  const handleDragStart = useCallback((e: React.DragEvent, visit: DocumentWithId<VisitDoc>) => {
    setDraggedVisit(visit)
    setIsDragging(true)
    setIsInMoveMode(true)
    setDragOverIndex(null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', visit.id)
    // Enter move mode in store using current local order (preserve prior moves)
    const currentIds = (localVisits && localVisits.length
      ? localVisits.map(v => v.id)
      : (localOrderIdsByDate[dateKey] ?? (visits ?? []).map(v => v.id)))
    startMove(dateKey, currentIds)
  }, [localVisits, localOrderIdsByDate, dateKey, visits, startMove])

  const handleDragOver = useCallback((e: React.DragEvent, targetVisit: DocumentWithId<VisitDoc>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!draggedVisit || draggedVisit.id === targetVisit.id) return

    const targetIndex = localVisits.findIndex(v => v.id === targetVisit.id)
    const draggedIndex = localVisits.findIndex(v => v.id === draggedVisit.id)
    if (targetIndex === -1 || draggedIndex === -1 || targetIndex === draggedIndex) return

    setDragOverIndex(targetIndex)
    // Compute the new order deterministically, then update state and store
    const next = [...localVisits]
    const [moved] = next.splice(draggedIndex, 1)
    next.splice(targetIndex, 0, moved)
    setLocalVisits(next)
    updateLocalOrder(dateKey, next.map(v => v.id))
  }, [draggedVisit, localVisits, updateLocalOrder, dateKey])

  const handleDragLeave = useCallback(() => {
    // Intentionally no-op to avoid flicker
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, _targetVisit: DocumentWithId<VisitDoc>) => {
    e.preventDefault()
    // Do not persist here; staying in move mode
    setIsDragging(false)
    setDraggedVisit(null)
  }, [])

  const exitMoveModeClick = useCallback(async () => {
    // Persist orders to Firestore only when Done is clicked
    try {
      // Assign normalized order values spaced by 1000
      const updates = localVisits.map((v, idx) => ({ id: v.id, order: (idx + 1) * 1000 }))
      // Only update documents whose order changed
      const tasks = updates
        .filter(u => {
          const current = visits.find(x => x.id === u.id)
          return (current as any)?.order !== u.order
        })
        .map(u => updateDocument('visits', u.id, { order: u.order }))
      if (navigator.onLine) {
        if (tasks.length > 0) await Promise.all(tasks)
        removeQueueForDate(dateKey)
      } else {
        queueUpdates(dateKey, updates)
      }
      notify.success('Order saved')
    } catch {
      notify.error('Failed to save order')
    } finally {
      setIsInMoveMode(false)
      setIsDragging(false)
      setDraggedVisit(null)
      setDragOverIndex(null)
      exitMove(dateKey)
      await mutate()
    }
  }, [localVisits, visits, mutate, dateKey, queueUpdates, removeQueueForDate, exitMove])

  // Flush queued order updates when online
  useEffect(() => {
    if (!navigator.onLine) return
    const queued = localOrderIdsByDate[dateKey]
    if (!queued || queued.length === 0) return

    const updates = queued.map((id, idx) => ({ id, order: (idx + 1) * 1000 }))
    const tasks = updates.map(u => updateDocument('visits', u.id, { order: u.order }))
    Promise.all(tasks).then(() => {
      removeQueueForDate(dateKey)
      mutate()
    }).catch(() => {
      notify.error('Failed to sync queued updates')
    })
  }, [navigator.onLine, localOrderIdsByDate, dateKey, removeQueueForDate, mutate])

  return {
    // Data
    visits,
    allUsers: (allUsers || []) as DocumentWithId<UserDoc>[],
    allCcis: (allCcis || []) as DocumentWithId<CCIDoc>[],
    isLoading: !allVisits && !currentError,
    error: currentError,
    
    // Local state
    localVisits,
    openCardId,
    draggedVisit,
    isDragging,
    isInMoveMode,
    dragOverIndex,
    
    // Actions
    setOpenCardId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    exitMoveModeClick,
    mutate
  }
}
