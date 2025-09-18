import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useSelectedDateStore } from '@/store/selectedDate';
import useAuthStore from '../store/authStore'
import { useReorderStore } from '@/store/reorderStore'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { visitsCollection } from '@/firebase/paths'
import { updateDocument } from '@/firebase/firestoreService'
import { notify } from '@/utils/notify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { where } from 'firebase/firestore'
import AddVisit from './AddVisit'
import { GripVertical } from 'lucide-react'

interface VisitDoc {
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
}

const truncate = (s?: string, n = 160) => !s ? '' : (s.length > n ? s.slice(0, n) + '…' : s)

const TimelineCard: React.FC<{ 
  v: VisitDoc; 
  onUpdated: () => void;
  onDragStart: (e: React.DragEvent, visit: VisitDoc) => void;
  onDragOver: (e: React.DragEvent, targetVisit: VisitDoc) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetVisit: VisitDoc) => void;
  isDragging: boolean;
  anyDragging: boolean;
  isDragTarget: boolean;
}> = ({ v, onUpdated, onDragStart, onDragOver, onDragLeave, onDrop, isDragging, anyDragging }) => {
  const [agenda, setAgenda] = useState(v.agenda ?? '')
  const [debrief, setDebrief] = useState(v.debrief ?? '')
  const [editingAgenda, setEditingAgenda] = useState(!v.agenda)
  const [editingDebrief, setEditingDebrief] = useState(!v.debrief)
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const notes = v.notes ?? []

  const save = async (fields: Partial<VisitDoc>) => {
    try { await updateDocument(visitsCollection(), v.id, fields); onUpdated(); notify.success('Saved') } catch { notify.error('Save failed') }
  }

  return (
    <div
      className="relative pl-5"
      draggable
      onDragStart={(e) => onDragStart(e, v)}
      onDragOver={(e) => onDragOver(e, v)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, v)}
      onDragEnd={() => {}} // Clean up drag image
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: anyDragging ? 'grabbing' : 'grab',
        transform: isDragging ? 'rotate(5deg)' : 'none',
        transition: 'transform 0.1s ease-in-out',
      }}
    >
      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-border" />
      <div className="absolute left-[-5px] top-3 h-2.5 w-2.5 rounded-full bg-primary" />
      
      {/* Drag Handle */}
      <div className="absolute left-[-20px] top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </div>
      
      {/* Always render the full card, but use CSS to compress it when dragging */}
      <Card className={`mb-4 transition-all duration-200 ${anyDragging ? 'max-h-16 overflow-hidden' : ''}`}>
        <CardHeader className={`transition-all duration-200 ${anyDragging ? 'py-2' : ''}`}>
          <CardTitle className={`text-base transition-all duration-200 ${anyDragging ? 'text-sm' : ''}`}>{v.cci_name}</CardTitle>
        </CardHeader>
        
        {/* Content that gets hidden during drag */}
        <div className={`transition-all duration-200 ${anyDragging ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100'}`}>
          <CardContent className="space-y-3">
            {/* Agenda */}
            <div>
              <div className="text-xs font-medium mb-1">Agenda</div>
              {editingAgenda ? (
                <div className="space-y-2">
                  <textarea className="w-full h-24 rounded-md border p-2 text-sm" value={agenda} onChange={(e) => setAgenda(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingAgenda(false); setAgenda(v.agenda ?? '') }}>Cancel</Button>
                    <Button size="sm" onClick={() => { setEditingAgenda(false); save({ agenda }) }}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{agenda ? truncate(agenda) : '—'}</p>
                  <Button size="sm" variant="ghost" onClick={() => setEditingAgenda(true)}>Edit</Button>
                </div>
              )}
            </div>

            {/* Debrief */}
            <div>
              <div className="text-xs font-medium mb-1">Debrief</div>
              {editingDebrief ? (
                <div className="space-y-2">
                  <textarea className="w-full h-24 rounded-md border p-2 text-sm" value={debrief} onChange={(e) => setDebrief(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingDebrief(false); setDebrief(v.debrief ?? '') }}>Cancel</Button>
                    <Button size="sm" onClick={() => { setEditingDebrief(false); save({ debrief }) }}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{debrief ? truncate(debrief) : '—'}</p>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDebrief(true)}>Edit</Button>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <div className="text-xs font-medium mb-2">Notes</div>
              <div className="space-y-2">
                {notes.length === 0 && <div className="text-xs text-muted-foreground">No notes yet.</div>}
                {notes.map(n => (
                  <div key={n.id} className="border rounded-md p-2 text-sm text-muted-foreground">{truncate(n.text)}</div>
                ))}
              </div>
              {addingNote ? (
                <div className="mt-2 space-y-2">
                  <textarea className="w-full h-20 rounded-md border p-2 text-sm" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setAddingNote(false); setNoteDraft('') }}>Cancel</Button>
                    <Button size="sm" onClick={async () => { const item = { id: String(Date.now()), text: noteDraft, createdAt: new Date() as any }; await save({ notes: [...notes, item] }); setAddingNote(false); setNoteDraft('') }}>Add</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2"><Button size="sm" variant="outline" onClick={() => setAddingNote(true)}>+ Add note</Button></div>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  )
}

const VisitsTimeline: React.FC = () => {
  const { selectedDate } = useSelectedDateStore()
  const { user } = useAuthStore()
  const {
    localOrderIdsByDate,
    startMove,
    updateLocalOrder,
    exitMove,
    queueUpdates,
    removeQueueForDate,
    pendingUpdates,
  } = useReorderStore()
  const [draggedVisit, setDraggedVisit] = useState<VisitDoc | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isInMoveMode, setIsInMoveMode] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [localVisits, setLocalVisits] = useState<VisitDoc[]>([])

  const start = useMemo(() => { const d = new Date(selectedDate); d.setHours(0,0,0,0); return d }, [selectedDate])
  const end = useMemo(() => { const d = new Date(selectedDate); d.setHours(24,0,0,0); return d }, [selectedDate])

  const { data: allVisits, mutate } = useFirestoreCollection<VisitDoc>(visitsCollection(), {
    queryConstraints: user ? [ where('filledByUid','==', user.uid) ] : [],
    revalidateOnFocus: true,
  })

  const visits = useMemo(() => {
    const list = allVisits ?? []
    return list
      .filter(v => {
        const ts: any = v.date
        const d = ts?.toDate ? ts.toDate() : new Date(ts)
        return d >= start && d < end
      })
      .sort((a, b) => {
        const orderA = (a as any).order ?? (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.getTime?.() ?? 0)
        const orderB = (b as any).order ?? (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.getTime?.() ?? 0)
        return orderA - orderB
      })
  }, [allVisits, start, end])

  const dateKey = useMemo(() => new Date(selectedDate).toDateString(), [selectedDate])

  // Initialize local state from store (or fresh) on date change
  useEffect(() => {
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
  }, [dateKey, localOrderIdsByDate, visits])

  // Drag handlers for local-only reordering (no Firestore writes here)
  const handleDragStart = useCallback((e: React.DragEvent, visit: VisitDoc) => {
    setDraggedVisit(visit)
    setIsDragging(true)
    setIsInMoveMode(true)
    setDragOverIndex(null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', visit.id)
    // Enter move mode in store
    const ids = (visits ?? []).map(v => v.id)
    startMove(dateKey, ids)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetVisit: VisitDoc) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!draggedVisit || draggedVisit.id === targetVisit.id) return

    const targetIndex = localVisits.findIndex(v => v.id === targetVisit.id)
    const draggedIndex = localVisits.findIndex(v => v.id === draggedVisit.id)
    if (targetIndex === -1 || draggedIndex === -1 || targetIndex === draggedIndex) return

    setDragOverIndex(targetIndex)
    // Reorder local list for immediate visual feedback
    setLocalVisits(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(draggedIndex, 1)
      arr.splice(targetIndex, 0, moved)
      return arr
    })
    // Store local id order for offline continuity
    updateLocalOrder(dateKey, localVisits.map(v => v.id))
  }, [draggedVisit, localVisits])

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
        .map(u => updateDocument(visitsCollection(), u.id, { order: u.order }))
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
    const flushQueued = async () => {
      if (!navigator.onLine) return
      if (!pendingUpdates || pendingUpdates.length === 0) return
      try {
        const tasks: Promise<any>[] = []
        pendingUpdates.forEach(batch => {
          batch.updates.forEach(u => {
            tasks.push(updateDocument(visitsCollection(), u.id, { order: u.order }))
          })
        })
        if (tasks.length > 0) await Promise.all(tasks)
        pendingUpdates.forEach(b => removeQueueForDate(b.dateKey))
        notify.success('Offline order changes synced')
        await mutate()
      } catch {
        // keep queue; will retry later
      }
    }
    const onlineHandler = () => { flushQueued() }
    window.addEventListener('online', onlineHandler)
    flushQueued()
    return () => window.removeEventListener('online', onlineHandler)
  }, [pendingUpdates, removeQueueForDate, mutate])

  // Listen for external refresh events (from AddVisit create)
  useEffect(() => {
    const h = () => mutate()
    window.addEventListener('visits:changed', h)
    return () => window.removeEventListener('visits:changed', h)
  }, [mutate])

  if (!user) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please log in to view your visits
      </div>
    );
  }

  if (!selectedDate) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please select a date to view visits
      </div>
    );
  }

  const displayVisits = isInMoveMode ? localVisits : visits

  return (
    <div className="mt-4">
      {isInMoveMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="text-sm font-medium text-blue-800">Move mode: drag cards to reorder</div>
          <Button size="sm" variant="outline" onClick={exitMoveModeClick} className="border-blue-300 text-blue-700 hover:bg-blue-100">Done</Button>
        </div>
      )}

      {/* Top + Button */}
      <AddVisit position="top" />

      {(displayVisits.length === 0) ? (
        <div className="text-center text-sm text-muted-foreground py-8">No visits for this date yet.</div>
      ) : (
        <div>
          {displayVisits.map((v, index) => (
            <TimelineCard
              key={v.id}
              v={v}
              onUpdated={mutate}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, v)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, v)}
              isDragging={isDragging && draggedVisit?.id === v.id}
              anyDragging={isInMoveMode}
              isDragTarget={dragOverIndex === index && !!draggedVisit && draggedVisit.id !== v.id}
            />
          ))}
        </div>
      )}
      {/* Bottom + Button */}
      <AddVisit position="bottom" />
    </div>
  )
}

export default VisitsTimeline
