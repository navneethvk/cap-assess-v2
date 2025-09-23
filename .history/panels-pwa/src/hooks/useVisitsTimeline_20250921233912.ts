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

export interface VisitDoc {
  id: string
  date: any
  cci_id: string
  cci_name: string
  filledByUid: string
  filledBy: 'EM' | 'Visitor'
  agenda?: string
  debrief?: string
  notes?: { id: string; text: string; createdAt: any }[]
  createdAt?: any
  order?: number
  status?: 'Scheduled' | 'Complete' | 'Cancelled'
  personMet?: 'Primary PoC' | 'Project Coordinator' | 'Staff' | 'none'
  quality?: 'Objectives Met' | 'Partially Met/Slow Pace' | 'Not Met' | 'Red Flag' | 'none'
  visitHours?: 'Full' | 'Half' | 'Drop-In' | 'Special' | 'none'
}

export interface User {
  uid: string
  email: string
  username?: string
  role: string
}

export interface CCI {
  id: string
  name: string
  city: string
  cohort: string
}

export interface VisitsTimelineState {
  // Data
  visits: VisitDoc[]
  allUsers: User[]
  allCcis: CCI[]
  isLoading: boolean
  error: any
  
  // Local state
  localVisits: VisitDoc[]
  openCardId: string | null
  draggedVisit: VisitDoc | null
  isDragging: boolean
  isInMoveMode: boolean
  dragOverIndex: number | null
  
  // Actions
  setOpenCardId: (id: string | null) => void
  handleDragStart: (e: React.DragEvent, visit: VisitDoc) => void
  handleDragOver: (e: React.DragEvent, targetVisit: VisitDoc) => void
  handleDragLeave: () => void
  handleDrop: (e: React.DragEvent, targetVisit: VisitDoc) => void
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
  const { data: visitsRaw, error: visitsError, mutate: mutateVisitsRaw } = useFirestoreCollection<VisitDoc>(
    isAdmin ? 'visits' : '', // Only fetch if user is admin
    { revalidateOnFocus: false }
  )
  const { data: userVisits, error: userVisitsError, mutate: mutateUserVisits } = useUserVisits('visits')
  const { data: allUsers } = useUsersForVisits()
  const ccisPath = 'ccis' // Temporarily hardcoded
  const { data: allCcis } = useFirestoreCollection<CCI>(ccisPath)

  // Use the appropriate data source based on admin status
  const allVisits = isAdmin ? visitsRaw : userVisits
  const currentError = isAdmin ? visitsError : userVisitsError

  // Refresh data when component mounts to clear any cache issues
  useEffect(() => {
    const refreshData = async () => {
      try {
        await Promise.all([mutateVisitsRaw(), mutateUserVisits()]);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    };
    refreshData();
  }, [mutateVisitsRaw, mutateUserVisits]);

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
    if (!allVisits) return []
    
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(selectedDate)
    end.setHours(23, 59, 59, 999)
    
    const filtered = (allVisits as VisitDoc[]).filter((v: VisitDoc) => {
      const visitDate = v.date?.toDate ? v.date.toDate() : new Date(v.date)
      return visitDate >= start && visitDate <= end
    }).sort((a: VisitDoc, b: VisitDoc) => {
      const orderA = (a as any).order ?? (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.getTime?.() ?? 0)
      const orderB = (b as any).order ?? (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.getTime?.() ?? 0)
      return orderA - orderB
    })
    
    return filtered
  }, [allVisits, selectedDate])

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
  const handleDragStart = useCallback((e: React.DragEvent, visit: VisitDoc) => {
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

  const handleDragOver = useCallback((e: React.DragEvent, targetVisit: VisitDoc) => {
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

  const handleDrop = useCallback((e: React.DragEvent, _targetVisit: VisitDoc) => {
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
    allUsers: (allUsers || []) as User[],
    allCcis: (allCcis || []) as CCI[],
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
