import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useSelectedDateStore } from '@/store/selectedDate';
import useAuthStore from '../store/authStore'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { visitsCollection } from '@/firebase/paths'
import { updateDocument } from '@/firebase/firestoreService'
import { notify } from '@/utils/notify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { where } from 'firebase/firestore'

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
  order?: number // New field for custom ordering
  position?: number // New field for position in the timeline
}

const truncate = (s?: string, n = 160) => !s ? '' : (s.length > n ? s.slice(0, n) + '…' : s)

const TimelineCard: React.FC<{ v: VisitDoc; onUpdated: () => void }> = ({ v, onUpdated }) => {
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
    <div className="relative pl-5">
      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-border" />
      <div className="absolute left-[-5px] top-3 h-2.5 w-2.5 rounded-full bg-primary" />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">{v.cci_name}</CardTitle>
        </CardHeader>
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
      </Card>
    </div>
  )
}

const VisitsTimeline: React.FC = () => {
  const { selectedDate } = useSelectedDateStore()
  const { user } = useAuthStore()
  const [draggedVisit, setDraggedVisit] = useState<VisitDoc | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isInMoveMode, setIsInMoveMode] = useState(false) // New state for persistent move mode
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null) // Track where we're hovering during drag

  const start = useMemo(() => { const d = new Date(selectedDate); d.setHours(0,0,0,0); return d }, [selectedDate])
  const end = useMemo(() => { const d = new Date(selectedDate); d.setHours(24,0,0,0); return d }, [selectedDate])

  const { data: allVisits, mutate } = useFirestoreCollection<VisitDoc>(visitsCollection(), {
    queryConstraints: user ? [ where('filledByUid','==', user.uid) ] : [],
    revalidateOnFocus: true,
  })

  const visits = useMemo(() => {
    const list = allVisits ?? []
    const filtered = list.filter(v => {
      const ts: any = v.date
      const d = ts?.toDate ? ts.toDate() : new Date(ts)
      return d >= start && d < end
    })
    
    console.log('Filtered visits before sorting:', filtered.map(v => ({
      id: v.id,
      name: v.cci_name,
      order: (v as any).order,
      createdAt: v.createdAt,
      position: (v as any).position
    })))
    
    const sorted = filtered.sort((a, b) => {
      // Use custom order field if available, otherwise fall back to createdAt
      const orderA = (a as any).order ?? (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.getTime?.() ?? 0)
      const orderB = (b as any).order ?? (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.getTime?.() ?? 0)
      
      console.log(`Comparing ${a.cci_name} (order: ${orderA}) vs ${b.cci_name} (order: ${orderB})`)
      
      // Sort by order value (ascending) for proper timeline positioning
      return orderA - orderB
    })
    
    console.log('Sorted visits:', sorted.map(v => ({
      id: v.id,
      name: v.cci_name,
      order: (v as any).order,
      position: (v as any).position
    })))
    
    return sorted
  }, [allVisits, start, end])

  // Create a real-time reordered array for smooth visual feedback
  const reorderedVisits = useMemo(() => {
    if (!draggedVisit || dragOverIndex === null) return visits
    
    const draggedIndex = visits.findIndex(v => v.id === draggedVisit.id)
    if (draggedIndex === -1 || draggedIndex === dragOverIndex) return visits
    
    const newVisits = [...visits]
    const [movedItem] = newVisits.splice(draggedIndex, 1)
    newVisits.splice(dragOverIndex, 0, movedItem)
    
    return newVisits
  }, [visits, draggedVisit, dragOverIndex])

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, visit: VisitDoc) => {
    setDraggedVisit(visit)
    setIsDragging(true)
    setIsInMoveMode(true) // Enter move mode when drag starts
    setDragOverIndex(null) // Reset drag over index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', visit.id)
    
    // Create a custom drag image that follows the cursor
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.left = '-1000px'
    dragImage.style.width = '300px'
    dragImage.style.opacity = '0.8'
    dragImage.style.transform = 'rotate(5deg)'
    dragImage.style.zIndex = '9999'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 150, 20)
    
    // Clean up the drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage)
      }
    }, 100)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetVisit: VisitDoc) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    if (!draggedVisit || draggedVisit.id === targetVisit.id) return
    
    // Calculate the target index for real-time reordering
    const targetIndex = visits.findIndex(v => v.id === targetVisit.id)
    if (targetIndex !== -1) {
      setDragOverIndex(targetIndex)
    }
  }, [draggedVisit, visits])

  const handleDragLeave = useCallback(() => {
    // Don't reset dragOverIndex immediately to avoid flickering
    // Only reset if we're not hovering over any card
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetVisit: VisitDoc) => {
    e.preventDefault()
    if (!draggedVisit || draggedVisit.id === targetVisit.id) return

    try {
      // Use the final dragOverIndex for the actual reordering
      const finalIndex = dragOverIndex ?? visits.findIndex(v => v.id === targetVisit.id)
      const draggedIndex = visits.findIndex(v => v.id === draggedVisit.id)
      
      if (finalIndex === -1 || draggedIndex === -1) return

      // Calculate new order values
      let newOrder: number
      
      if (finalIndex === 0) {
        // Dropping at the top
        const firstOrder = visits[0].order ?? 0
        newOrder = firstOrder - 1000
      } else if (finalIndex === visits.length - 1) {
        // Dropping at the bottom
        const lastOrder = visits[visits.length - 1].order ?? 0
        newOrder = lastOrder + 1000
      } else {
        // Dropping between two visits
        const prevOrder = visits[finalIndex - 1].order ?? 0
        const nextOrder = visits[finalIndex].order ?? 0
        newOrder = prevOrder + (nextOrder - prevOrder) / 2
      }

      // Update the dragged visit's order
      await updateDocument(visitsCollection(), draggedVisit.id, { order: newOrder })
      notify.success('Visit reordered successfully')
      mutate() // Refresh the data
    } catch (error) {
      notify.error('Failed to reorder visit')
    } finally {
      setDraggedVisit(null)
      setIsDragging(false)
      setDragOverIndex(null)
      // Note: isInMoveMode stays true so user can continue reordering
    }
  }, [draggedVisit, visits, dragOverIndex, mutate])

  // Exit move mode
  const exitMoveMode = useCallback(() => {
    setIsInMoveMode(false)
    setDraggedVisit(null)
    setIsDragging(false)
    setDragOverIndex(null)
  }, [])

  // Listen for external refresh events (from AddVisit create)
  useEffect(() => {
    const h = (event: Event) => {
      // Check if it's a custom event with position info
      if (event instanceof CustomEvent && event.detail?.position) {
        // Refresh data to show new visit in correct position
        mutate()
      } else {
        // Regular refresh event
        mutate()
      }
    }
    
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

  // Use reorderedVisits for rendering to show real-time changes
  const displayVisits = reorderedVisits

  return (
    <div className="mt-4">
      {/* Move Mode Header */}
      {isInMoveMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">Move Mode Active</span>
            <span className="text-xs text-blue-600">Drag cards to reorder them</span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={exitMoveMode}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            Done
          </Button>
        </div>
      )}

      {/* Top + Button */}
      <AddVisit position="top" />
      
      {/* Visits */}
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
              onDrop={handleDrop}
              isDragging={isDragging && draggedVisit?.id === v.id}
              anyDragging={isInMoveMode} // Use move mode state instead of just isDragging
              isDragTarget={dragOverIndex === index && isDragging && draggedVisit?.id !== v.id}
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
