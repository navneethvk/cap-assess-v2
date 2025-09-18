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
  position?: string
}

const truncate = (s?: string, n = 160) => !s ? '' : (s.length > n ? s.slice(0, n) + '…' : s)

const TimelineCard: React.FC<{ 
  v: VisitDoc; 
  onUpdated: () => void;
  onDragStart: (e: React.DragEvent, visit: VisitDoc) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetVisit: VisitDoc) => void;
  isDragging: boolean;
  anyDragging: boolean; // New prop to indicate if any card is being dragged
}> = ({ v, onUpdated, onDragStart, onDragOver, onDrop, isDragging, anyDragging }) => {
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
      className={`relative pl-5 ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, v)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, v)}
    >
      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-border" />
      <div className="absolute left-[-5px] top-3 h-2.5 w-2.5 rounded-full bg-primary" />
      
      {/* Drag Handle */}
      <div className="absolute left-[-20px] top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </div>
      
      {anyDragging ? (
        /* Compact view when ANY card is being dragged - just the title */
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border-2 border-dashed border-primary/50">
          <div className="font-medium text-sm text-foreground">{v.cci_name}</div>
        </div>
      ) : (
        /* Full card view when no dragging is happening */
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
      )}
    </div>
  )
}

const VisitsTimeline: React.FC = () => {
  const { selectedDate } = useSelectedDateStore()
  const { user } = useAuthStore()
  const [draggedVisit, setDraggedVisit] = useState<VisitDoc | null>(null)
  const [isDragging, setIsDragging] = useState(false)

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

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, visit: VisitDoc) => {
    setDraggedVisit(visit)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', visit.id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetVisit: VisitDoc) => {
    e.preventDefault()
    if (!draggedVisit || draggedVisit.id === targetVisit.id) return

    try {
      // Find the index of the target visit
      const targetIndex = visits.findIndex(v => v.id === targetVisit.id)
      const draggedIndex = visits.findIndex(v => v.id === draggedVisit.id)
      
      if (targetIndex === -1 || draggedIndex === -1) return

      // Calculate new order values
      let newOrder: number
      
      if (targetIndex === 0) {
        // Dropping at the top
        const firstOrder = visits[0].order ?? 0
        newOrder = firstOrder - 1000
      } else if (targetIndex === visits.length - 1) {
        // Dropping at the bottom
        const lastOrder = visits[visits.length - 1].order ?? 0
        newOrder = lastOrder + 1000
      } else {
        // Dropping between two visits
        const prevOrder = visits[targetIndex - 1].order ?? 0
        const nextOrder = visits[targetIndex].order ?? 0
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
    }
  }, [draggedVisit, visits, mutate])

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

  return (
    <div className="mt-4">
      {/* Top + Button */}
      <AddVisit position="top" />
      
      {/* Visits */}
      {(visits.length === 0) ? (
        <div className="text-center text-sm text-muted-foreground py-8">No visits for this date yet.</div>
      ) : (
        <div>
          {visits.map(v => (
            <TimelineCard 
              key={v.id} 
              v={v} 
              onUpdated={mutate}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={isDragging && draggedVisit?.id === v.id}
              anyDragging={isDragging} // Pass the global dragging state to all cards
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
