import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelectedDateStore } from '@/store/selectedDate';
import useAuthStore from '../store/authStore'
import { useReorderStore } from '@/store/reorderStore'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { useUserVisits } from '@/hooks/useUserVisits'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import { visitsCollection, ccisCollection } from '@/firebase/paths'
import { updateDocument } from '@/firebase/firestoreService'
import { notify } from '@/utils/notify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AddVisit from './AddVisit'
import { GripVertical, Save as SaveIcon, X as XIcon, Pencil as PencilIcon, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

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

interface User {
  uid: string
  email: string
  username?: string
  role: string
}

interface CCI {
  id: string
  name: string
  city: string
  cohort: string
}

const truncate = (s?: string, n = 160) => !s ? '' : (s.length > n ? s.slice(0, n) + '…' : s)

// Utility function to strip HTML tags and convert entities for preview display
const stripHtmlForPreview = (html?: string): string => {
  if (!html) return ''
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Get text content and clean it up
  let text = tempDiv.textContent || tempDiv.innerText || ''
  
  // Convert common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim()
  
  return text
}

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
  expanded: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onEnterMoveMode: (visit: VisitDoc) => void;
  users: User[];
  ccis: CCI[];
}> = ({ v, onUpdated, onDragStart, onDragOver, onDragLeave, onDrop, isDragging, anyDragging, expanded, onToggle, onEnterMoveMode, users, ccis }) => {
  const navigate = useNavigate()
  const [agenda, setAgenda] = useState(v.agenda ?? '')
  const [debrief, setDebrief] = useState(v.debrief ?? '')
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const notes = v.notes ?? []
  const [baseAgenda, setBaseAgenda] = useState(v.agenda ?? '')
  const [baseDebrief, setBaseDebrief] = useState(v.debrief ?? '')
  
  const [agendaEditable, setAgendaEditable] = useState(false)
  const [debriefEditable, setDebriefEditable] = useState(false)
  const [, setNotesEditable] = useState(false)
  const visitDate: Date = (() => {
    const ts: any = v.date
    return ts?.toDate ? ts.toDate() : new Date(ts)
  })()

  // Get user and CCI information
  const user = useMemo(() => users.find(u => u.uid === v.filledByUid), [users, v.filledByUid])
  const cci = useMemo(() => ccis.find(c => c.id === v.cci_id), [ccis, v.cci_id])
  const userDisplayName = user?.username || user?.email || 'Unknown User'
  const cciCity = cci?.city || 'Unknown City'

  // Long-press to enter move mode
  const longPressRef = React.useRef<number | null>(null)
  const longPressedRef = React.useRef(false)
  const startLongPress = () => {
    if (expanded) return
    longPressedRef.current = false
    if (longPressRef.current) window.clearTimeout(longPressRef.current)
    longPressRef.current = window.setTimeout(() => {
      if (expanded) { cancelLongPress(); return }
      longPressedRef.current = true
      onEnterMoveMode(v)
    }, 500)
  }
  const cancelLongPress = () => {
    if (longPressRef.current) window.clearTimeout(longPressRef.current)
    longPressRef.current = null
  }

  const save = async (fields: Partial<VisitDoc>) => {
    try { await updateDocument(visitsCollection(), v.id, fields); onUpdated(); notify.success('Saved') } catch { notify.error('Save failed') }
  }

  // Section-level long-press to enable inline edit (prevents bubbling to card long-press)
  const useSectionLongPress = (enable: React.Dispatch<React.SetStateAction<boolean>>) => {
    const timerRef = React.useRef<number | null>(null)
    const start = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation()
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => { enable(true) }, 500)
    }
    const cancel = (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) e.stopPropagation()
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    return { start, cancel }
  }
  const agendaLP = useSectionLongPress(setAgendaEditable)
  const debriefLP = useSectionLongPress(setDebriefEditable)
  const notesLP = useSectionLongPress(setNotesEditable)

  return (
    <div
      className="relative"
      draggable={anyDragging}
      onDragStart={(e) => onDragStart(e, v)}
      onDragOver={(e) => onDragOver(e, v)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, v)}
      onDragEnd={() => {}}
      onMouseDown={() => { if (!expanded) startLongPress() }}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onTouchStart={() => { if (!expanded) startLongPress() }}
      onTouchEnd={cancelLongPress}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: anyDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Card with collapsed/expanded behavior — styled like dialog box */}
      <Card className={`relative mb-4 transition-all duration-200 bg-white dark:bg-[hsl(var(--card))] border border-blue-100/70 dark:border-foreground/20 rounded-none shadow-md hover:shadow-lg hover:border-blue-200 hover:scale-[1.02] ${anyDragging ? 'max-h-16 overflow-hidden' : ''}`}>
        <CardHeader 
          className={`transition-all duration-200 text-center ${anyDragging ? 'py-2' : 'pb-3'}`}
          onClick={(e) => { if (!anyDragging && !longPressedRef.current) onToggle(e) }}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {anyDragging && (<GripVertical className="h-4 w-4 text-muted-foreground" />)}
            <CardTitle className={`text-base transition-all duration-200 ${anyDragging ? 'text-sm' : ''}`}>{v.cci_name}</CardTitle>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="text-xs text-muted-foreground whitespace-nowrap">{format(visitDate, 'MMMM dd, yyyy')}</div>
            <span className={`text-[10px] px-2 py-1 rounded-full border ${v.filledBy === 'EM' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{v.filledBy}</span>
          </div>
          {!anyDragging && (
            <div className="flex items-center justify-center gap-2">
              <div className="text-xs text-muted-foreground italic">{userDisplayName}</div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{cciCity}</span>
            </div>
          )}
        </CardHeader>
        {/* Expand button - top left */}
        {expanded && !anyDragging && (
          <button
            type="button"
            aria-label="Expand to full view"
            className="absolute top-2 left-2 h-8 w-8 rounded-full border border-slate-300 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50"
            onClick={(e) => { 
              e.stopPropagation(); 
              const mode = (agendaEditable || debriefEditable) ? 'edit' : 'view';
              navigate(`/meeting-notes/${v.id}?mode=${mode}`);
            }}
          >
            <ExternalLink className="h-4 w-4 text-slate-700" />
          </button>
        )}
        {/* Action icons: Pencil when not editing; Save/Discard when editing */}
        {expanded && !anyDragging && !(agendaEditable || debriefEditable) && (
          <button
            type="button"
            aria-label="Edit"
            className="absolute top-2 right-2 h-8 w-8 rounded-full border border-slate-300 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50"
            onClick={(e) => { e.stopPropagation(); try { setAgendaEditable(true); setDebriefEditable(true) } catch {} }}
          >
            <PencilIcon className="h-4 w-4 text-slate-700" />
          </button>
        )}
        {expanded && !anyDragging && (agendaEditable || debriefEditable) && (
          <>
            <button
              type="button"
              aria-label="Save changes"
              className="absolute top-2 right-2 h-8 w-8 rounded-full border border-blue-300 bg-white shadow-sm flex items-center justify-center hover:bg-blue-50"
              onClick={async (e) => { e.stopPropagation(); await save({ agenda, debrief }); setBaseAgenda(agenda); setBaseDebrief(debrief); /* exit inline edit */; try { (agendaEditable) && setAgendaEditable(false); (debriefEditable) && setDebriefEditable(false) } catch {} }}
            >
              <SaveIcon className="h-4 w-4 text-blue-700" />
            </button>
            <button
              type="button"
              aria-label="Discard changes"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full border border-slate-300 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50"
              onClick={(e) => { e.stopPropagation(); setAgenda(baseAgenda); setDebrief(baseDebrief); /* exit inline edit */; try { (agendaEditable) && setAgendaEditable(false); (debriefEditable) && setDebriefEditable(false) } catch {} }}
            >
              <XIcon className="h-4 w-4 text-slate-700" />
            </button>
          </>
        )}
        
        {/* Content that gets hidden during drag */}
        <div className={`transition-all duration-200 ${(!expanded || anyDragging) ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100'}`}>
        <CardContent className="space-y-6">
          {/* Agenda (view-only until long-press) */}
          <div>
            <div className="text-xs font-medium mb-1">Agenda</div>
            {agendaEditable ? (
                <textarea className="w-full h-24 rounded-md border p-2 text-sm" value={agenda} onChange={(e) => setAgenda(e.target.value)} />
            ) : (
              <div
                className="w-full min-h-[3rem] border rounded-md p-3 text-sm bg-slate-50"
                onMouseDown={agendaLP.start}
                onMouseUp={agendaLP.cancel}
                onMouseLeave={agendaLP.cancel}
                onTouchStart={agendaLP.start}
                onTouchEnd={agendaLP.cancel}
              >
                {stripHtmlForPreview(agenda) || '—'}
              </div>
            )}
          </div>

          {/* Debrief (view-only until long-press) */}
          <div>
            <div className="text-xs font-medium mb-1">Debrief</div>
            {debriefEditable ? (
                <textarea className="w-full h-24 rounded-md border p-2 text-sm" value={debrief} onChange={(e) => setDebrief(e.target.value)} />
            ) : (
              <div
                className="w-full min-h-[3rem] border rounded-md p-3 text-sm bg-slate-50"
                onMouseDown={debriefLP.start}
                onMouseUp={debriefLP.cancel}
                onMouseLeave={debriefLP.cancel}
                onTouchStart={debriefLP.start}
                onTouchEnd={debriefLP.cancel}
              >
                {debrief || '—'}
              </div>
            )}
          </div>

          {/* Notes (view-only list; add button always visible) */}
          <div>
            <div className="text-xs font-medium mb-2">Notes</div>
            <div
              className="space-y-2"
              onMouseDown={notesLP.start}
              onMouseUp={notesLP.cancel}
              onMouseLeave={notesLP.cancel}
              onTouchStart={notesLP.start}
              onTouchEnd={notesLP.cancel}
            >
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
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full px-4 py-1 border-2"
                  onClick={() => { setNotesEditable(true); setAddingNote(true) }}
                >
                  + Add note
                </Button>
              </div>
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
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const start = useMemo(() => { const d = new Date(selectedDate); d.setHours(0,0,0,0); return d }, [selectedDate])
  const end = useMemo(() => { const d = new Date(selectedDate); d.setHours(24,0,0,0); return d }, [selectedDate])

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const role = idTokenResult.claims.role as string;
          setIsAdmin(role === 'Admin');
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Always call both hooks to maintain hook order, but only use the appropriate one
  const { data: allVisitsAdmin, mutate: mutateAdmin, error: visitsErrorAdmin } = useFirestoreCollection<VisitDoc>(visitsCollection(), { revalidateOnFocus: true })
  const { data: allVisitsUser, mutate: mutateUser, error: visitsErrorUser } = useUserVisits<VisitDoc>(visitsCollection(), { revalidateOnFocus: true })
  
  // Select the appropriate data based on admin status
  const allVisits = isAdmin ? allVisitsAdmin : allVisitsUser
  const mutate = isAdmin ? mutateAdmin : mutateUser
  const visitsError = isAdmin ? visitsErrorAdmin : visitsErrorUser
  
  const { data: allUsers } = useUsersForVisits()
  const { data: allCcis } = useFirestoreCollection<CCI>(ccisCollection())

  const visits = useMemo(() => {
    if (!allVisits || visitsError) {
      return []
    }
    
    const list = Array.isArray(allVisits) ? allVisits : []
    const filtered = list
      .filter(v => {
        if (!v || !v.date) return false
        const ts: any = v.date
        const d = ts?.toDate ? ts.toDate() : new Date(ts)
        return d >= start && d < end
      })
      .sort((a, b) => {
        const orderA = (a as any).order ?? (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.getTime?.() ?? 0)
        const orderB = (b as any).order ?? (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.getTime?.() ?? 0)
        return orderA - orderB
      })
    
    return filtered
  }, [allVisits, start, end, visitsError])

  const dateKey = useMemo(() => new Date(selectedDate).toDateString(), [selectedDate])

  // Initialize local state from store (or fresh) on date change
  useEffect(() => {
    if (isInMoveMode) return; // don't reset while user is reordering
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
  }, [])

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

  // Listen for external refresh events (from AddVisit create); close only on outside clicks
  useEffect(() => {
    const h = () => mutate()
    window.addEventListener('visits:changed', h)
    const container = document.getElementById('visits-timeline-root')
    const clickAway = (e: MouseEvent) => {
      if (!container) return
      const target = e.target as Node | null
      if (target && !container.contains(target)) setOpenCardId(null)
    }
    document.addEventListener('click', clickAway, true)
    return () => {
      window.removeEventListener('visits:changed', h)
      document.removeEventListener('click', clickAway, true)
    }
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

  if (visitsError) {
    return (
      <div className="p-4 text-center text-red-600">
        Error loading visits: {visitsError.message || 'Unknown error'}
      </div>
    );
  }

  const displayVisits = isInMoveMode ? localVisits : visits

  return (
    <div id="visits-timeline-root" className="mt-4 relative">
      {isInMoveMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="text-sm font-medium text-blue-800">Move mode: drag cards to reorder</div>
          <Button size="sm" variant="outline" onClick={exitMoveModeClick} className="border-blue-300 text-blue-700 hover:bg-blue-100">Done</Button>
        </div>
      )}

      {/* Timeline spine - positioned behind everything */}
      {(displayVisits.length === 0) ? (
        <>
          {/* Top spine segment - above the empty state text */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-[3px] timeline-spine rounded z-0" style={{ height: 'calc(50% - 2rem)' }} />
          {/* Bottom spine segment - below the empty state text */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-0 w-[3px] timeline-spine rounded z-0" style={{ height: 'calc(50% - 2rem)' }} />
        </>
      ) : (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[3px] timeline-spine rounded z-0" />
      )}

      {/* Center spine - interactive to show + on hover (wide zone) */}
      <div
        className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-24 z-5 pointer-events-auto"
        onMouseMove={(e) => {
          const zoneRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const indicator = document.getElementById('spine-add-indicator')
          if (indicator) {
            const yWithin = e.clientY - zoneRect.top
            indicator.style.top = `${yWithin}px`
            indicator.style.display = 'flex'
          }
        }}
        onMouseEnter={() => {
          const indicator = document.getElementById('spine-add-indicator')
          if (indicator) indicator.style.display = 'flex'
        }}
        onMouseLeave={() => {
          const indicator = document.getElementById('spine-add-indicator')
          if (indicator) indicator.style.display = 'none'
        }}
        onClick={(e) => {
          // Compute order relative to current list based on Y position.
          const positions = Array.from(document.querySelectorAll('[data-visit-card-pos]')) as HTMLElement[]
          const rects = positions.map(el => el.getBoundingClientRect())
          // Prefer explicit within-card detection: top half -> above, bottom half -> below
          let insertIndex = -1
          const withinIdx = rects.findIndex(r => e.clientY >= r.top && e.clientY <= r.bottom)
          if (withinIdx !== -1) {
            const r = rects[withinIdx]
            const isTopHalf = e.clientY < (r.top + r.height / 2)
            insertIndex = isTopHalf ? withinIdx : withinIdx + 1
          } else {
            // Fallback to first midpoint below pointer
            const midpoints = rects.map(r => r.top + r.height / 2)
            insertIndex = midpoints.findIndex(m => e.clientY < m)
            if (insertIndex === -1) insertIndex = positions.length
          }
          // derive order value
          let orderValue = 0
          if (insertIndex === 0 && positions.length > 0) {
            const first = positions[0].dataset.order ? Number(positions[0].dataset.order) : 0
            orderValue = first - 1000
          } else if (insertIndex >= positions.length && positions.length > 0) {
            const last = positions[positions.length - 1].dataset.order ? Number(positions[positions.length - 1].dataset.order) : 0
            orderValue = last + 1000
          } else if (positions.length > 0) {
            const prev = positions[insertIndex - 1].dataset.order ? Number(positions[insertIndex - 1].dataset.order) : 0
            const next = positions[insertIndex].dataset.order ? Number(positions[insertIndex].dataset.order) : prev + 2000
            orderValue = prev + (next - prev) / 2
          } else {
            orderValue = 1000
          }
          try {
            window.dispatchEvent(new CustomEvent('addvisit:open', { detail: { order: orderValue } }))
          } catch {}
        }}
      >
        {/* floating add indicator (inside zone to avoid flicker) */}
        <div id="spine-add-indicator" style={{ display: 'none' }} className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-5">
          <button
            type="button"
            className="pointer-events-auto -translate-y-1/2 h-10 w-10 rounded-full border-2 border-blue-300 text-blue-900 bg-white shadow-sm flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              try { window.dispatchEvent(new CustomEvent('addvisit:open', { detail: { order: 1000 } })) } catch {}
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* + Button centered on spine */}
      <AddVisit position="top" variant="spine" />

      {(displayVisits.length === 0) ? (
        <div className="text-center text-sm text-muted-foreground py-8">No visits for this date yet.</div>
      ) : (
        <>
          {/* Desktop two-column layout */}
          <div className="hidden md:block space-y-10">
          {displayVisits.map((v, index) => {
            const left = index % 2 === 0
            return (
              <div key={v.id} className="relative grid grid-cols-2 gap-6 md:gap-12 items-start">
                {/* Dot on spine - show only in move mode */}
                {isInMoveMode && (
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-6 timeline-dot z-0" />
                )}
                {/* Left column */}
                <div className={`${left ? 'pr-10' : ''}`}>
                  {left && (
                    <div className="md:ml-auto max-w-md relative z-20" data-visit-card-pos data-order={(v as any).order ?? (v.createdAt?.toDate ? v.createdAt.toDate().getTime() : v.createdAt?.getTime?.() ?? 0)}>
                      <TimelineCard
                        v={v}
                        onUpdated={mutate}
                        onDragStart={handleDragStart}
                        onDragOver={(e) => handleDragOver(e, v)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, v)}
                        isDragging={isDragging && draggedVisit?.id === v.id}
                        anyDragging={isInMoveMode}
                        isDragTarget={dragOverIndex === index && !!draggedVisit && draggedVisit.id !== v.id}
                        expanded={openCardId === v.id}
                        onToggle={(e) => { e.stopPropagation(); setOpenCardId(prev => prev === v.id ? null : v.id) }}
                        onEnterMoveMode={(visit) => {
                          // Enter move mode and immediately mark this as dragged
                          if (!isInMoveMode) setIsInMoveMode(true)
                          setDraggedVisit(visit)
                          setIsDragging(true)
                          setDragOverIndex(localVisits.findIndex(x => x.id === visit.id))
                        }}
                        users={allUsers || []}
                        ccis={allCcis || []}
                      />
                    </div>
                  )}
                </div>
                {/* Right column */}
                <div className={`${left ? '' : 'md:pl-10'} max-w-md md:ml-0`}>
                  {!left && (
                    <div className="md:mr-auto relative z-20" data-visit-card-pos data-order={(v as any).order ?? (v.createdAt?.toDate ? v.createdAt.toDate().getTime() : v.createdAt?.getTime?.() ?? 0)}>
                      <TimelineCard
                        v={v}
                        onUpdated={mutate}
                        onDragStart={handleDragStart}
                        onDragOver={(e) => handleDragOver(e, v)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, v)}
                        isDragging={isDragging && draggedVisit?.id === v.id}
                        anyDragging={isInMoveMode}
                        isDragTarget={dragOverIndex === index && !!draggedVisit && draggedVisit.id !== v.id}
                        expanded={openCardId === v.id}
                        onToggle={(e) => { e.stopPropagation(); setOpenCardId(prev => prev === v.id ? null : v.id) }}
                        onEnterMoveMode={(visit) => {
                          if (!isInMoveMode) setIsInMoveMode(true)
                          setDraggedVisit(visit)
                          setIsDragging(true)
                          setDragOverIndex(localVisits.findIndex(x => x.id === visit.id))
                        }}
                        users={allUsers || []}
                        ccis={allCcis || []}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile single-column layout */}
        <div className="md:hidden space-y-10">
          {displayVisits.map((v) => {
            return (
              <div key={v.id} className="relative">
                {/* Dot on spine - show only in move mode */}
                {isInMoveMode && (
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-6 timeline-dot z-0" />
                )}
                <div className="relative z-20" data-visit-card-pos data-order={(v as any).order ?? (v.createdAt?.toDate ? v.createdAt.toDate().getTime() : v.createdAt?.getTime?.() ?? 0)}>
                  <TimelineCard
                    v={v}
                    onUpdated={mutate}
                    onDragStart={handleDragStart}
                    onDragOver={(e) => handleDragOver(e, v)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, v)}
                    isDragging={isDragging && draggedVisit?.id === v.id}
                    anyDragging={isInMoveMode}
                    isDragTarget={false}
                    expanded={openCardId === v.id}
                    onToggle={(e) => { e.stopPropagation(); setOpenCardId(prev => prev === v.id ? null : v.id) }}
                    onEnterMoveMode={(visit) => {
                      if (!isInMoveMode) setIsInMoveMode(true)
                      setDraggedVisit(visit)
                      setIsDragging(true)
                      setDragOverIndex(localVisits.findIndex(x => x.id === visit.id))
                    }}
                    users={allUsers || []}
                    ccis={allCcis || []}
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
