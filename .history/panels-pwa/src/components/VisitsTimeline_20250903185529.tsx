import React, { useEffect, useMemo, useState } from 'react'
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

  const start = useMemo(() => { const d = new Date(selectedDate); d.setHours(0,0,0,0); return d }, [selectedDate])
  const end = useMemo(() => { const d = new Date(selectedDate); d.setHours(24,0,0,0); return d }, [selectedDate])

  const { data: allVisits, mutate } = useFirestoreCollection<VisitDoc>(visitsCollection(), {
    queryConstraints: user ? [ where('filledByUid','==', user.uid) ] : [],
    revalidateOnFocus: true,
  })

  const visits = useMemo(() => {
    const list = allVisits ?? []
    return list.filter(v => {
      const ts: any = v.date
      const d = ts?.toDate ? ts.toDate() : new Date(ts)
      return d >= start && d < end
    }).sort((a, b) => {
      // Use custom order field if available, otherwise fall back to createdAt
      const orderA = (a as any).order ?? (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.getTime?.() ?? 0)
      const orderB = (b as any).order ?? (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.getTime?.() ?? 0)
      
      // Sort by order value (ascending) for proper timeline positioning
      return orderA - orderB
    })
  }, [allVisits, start, end])

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

  return (
    <div className="mt-4">
      {(visits.length === 0) ? (
        <div className="text-center text-sm text-muted-foreground py-8">No visits for this date yet.</div>
      ) : (
        <div>
          {visits.map(v => (
            <TimelineCard key={v.id} v={v} onUpdated={mutate} />
          ))}
        </div>
      )}
    </div>
  )
}

export default VisitsTimeline
