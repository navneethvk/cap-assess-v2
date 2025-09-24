import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateDocument } from '@/firebase/firestoreService'
import { notify } from '@/utils/notify'
import { stripHtmlForPreview, stripHtmlForEditing, truncate } from '@/utils/htmlUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PillSelector, statusOptions, personMetOptions, qualityOptions, visitHoursOptions } from '@/components/ui'
import { GripVertical, Save as SaveIcon, X as XIcon, Pencil as PencilIcon, ExternalLink } from 'lucide-react'
import type { VisitDoc, User, CCI } from '@/hooks/useVisitsTimeline'

interface TimelineCardProps {
  visit: VisitDoc
  onUpdated: () => void
  onDragStart?: (e: React.DragEvent, visit: VisitDoc) => void
  onDragOver?: (e: React.DragEvent, targetVisit: VisitDoc) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent, targetVisit: VisitDoc) => void
  isDragging?: boolean
  anyDragging?: boolean
  isDragTarget?: boolean
  expanded?: boolean
  onToggle?: (e: React.MouseEvent) => void
  users: User[]
  ccis: CCI[]
}

export const TimelineCard: React.FC<TimelineCardProps> = ({
  visit,
  onUpdated,
  onDragStart = () => {},
  onDragOver = () => {},
  onDragLeave = () => {},
  onDrop = () => {},
  isDragging = false,
  anyDragging = false,
  isDragTarget = false,
  expanded: _expanded,
  onToggle: _onToggle,
  users,
  ccis
}) => {
  const navigate = useNavigate()
  const initialAgenda = useMemo(() => stripHtmlForEditing(visit.agenda), [visit.agenda])
  const initialDebrief = useMemo(() => stripHtmlForEditing(visit.debrief), [visit.debrief])

  const [agenda, setAgenda] = useState(initialAgenda)
  const [debrief, setDebrief] = useState(initialDebrief)
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const notes = visit.notes ?? []
  const [baseAgenda, setBaseAgenda] = useState(initialAgenda)
  const [baseDebrief, setBaseDebrief] = useState(initialDebrief)
  const [userManuallySetStatus, setUserManuallySetStatus] = useState(false)
  
  const [agendaEditable, setAgendaEditable] = useState(false)
  const [debriefEditable, setDebriefEditable] = useState(false)
  
  const visitDate: Date = (() => {
    const ts: any = visit.date
    return ts?.toDate ? ts.toDate() : new Date(ts)
  })()

  // Get user and CCI information
  const user = useMemo(() => users?.find(u => u.uid === visit.filledByUid), [users, visit.filledByUid])
  const cci = useMemo(() => ccis?.find(c => c.id === visit.cci_id), [ccis, visit.cci_id])
  const userDisplayName = user?.username || user?.email || 'Unknown User'
  const cciCity = cci?.city || 'Unknown City'

  const save = useCallback(async (fields: Partial<VisitDoc>) => {
    try { 
      await updateDocument('visits', visit.id, fields)
      onUpdated()
      notify.success('Saved') 
    } catch { 
      notify.error('Save failed') 
    }
  }, [visit.id, onUpdated])

  useEffect(() => {
    const sanitizedAgenda = stripHtmlForEditing(visit.agenda)
    const sanitizedDebrief = stripHtmlForEditing(visit.debrief)

    setAgenda(sanitizedAgenda)
    setDebrief(sanitizedDebrief)
    setBaseAgenda(sanitizedAgenda)
    setBaseDebrief(sanitizedDebrief)
  }, [visit.agenda, visit.debrief])

  const handleStatusChange = useCallback(async (newStatus: string) => {
    setUserManuallySetStatus(true)
    await save({ status: newStatus as 'Scheduled' | 'Complete' | 'Cancelled' })
  }, [save])

  const handlePersonMetChange = useCallback(async (newPersonMet: string) => {
    // Check if personMet has content to auto-complete status (only if user hasn't manually set status)
    const shouldAutoComplete = newPersonMet !== 'none' && visit.status !== 'Complete' && !userManuallySetStatus
    
    await save({ 
      personMet: newPersonMet as 'Primary PoC' | 'Project Coordinator' | 'Staff' | 'none',
      ...(shouldAutoComplete && { status: 'Complete' })
    })
  }, [save, visit.status, userManuallySetStatus])

  const handleQualityChange = useCallback(async (newQuality: 'Objectives Met' | 'Partially Met/Slow Pace' | 'Not Met' | 'Red Flag' | 'none') => {
    await save({ quality: newQuality })
  }, [save])

  const handleVisitHoursChange = useCallback(async (newVisitHours: 'Full' | 'Half' | 'Drop-In' | 'Special' | 'none') => {
    await save({ visitHours: newVisitHours })
  }, [save])

  const handleSave = useCallback(async () => {
    await save({ agenda, debrief })
    setAgendaEditable(false)
    setDebriefEditable(false)
    setBaseAgenda(agenda)
    setBaseDebrief(debrief)
  }, [save, agenda, debrief])

  const handleCancel = useCallback(() => {
    setAgenda(baseAgenda)
    setDebrief(baseDebrief)
    setAgendaEditable(false)
    setDebriefEditable(false)
  }, [baseAgenda, baseDebrief])

  const handleAddNote = useCallback(async () => {
    if (!noteDraft.trim()) return
    const newNote = {
      id: Date.now().toString(),
      text: noteDraft.trim(),
      createdAt: new Date()
    }
    await save({ notes: [...notes, newNote] })
    setNoteDraft('')
    setAddingNote(false)
  }, [noteDraft, notes, save])


  return (
    <div
      className="relative"
      draggable={anyDragging}
      onDragStart={(e) => onDragStart(e, visit)}
      onDragOver={(e) => onDragOver(e, visit)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, visit)}
      onDragEnd={() => {}}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: anyDragging ? 'grabbing' : 'grab',
      }}
    >
      <Card className={`transition-all duration-200 ${anyDragging ? 'scale-95 shadow-lg' : 'hover:shadow-md'} ${isDragTarget ? 'ring-2 ring-primary' : ''} w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-foreground truncate leading-tight">
                {visit.cci_name}
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {visitDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {userDisplayName} • {cciCity}
              </div>
            </div>
            {anyDragging && (
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Status and Quality Controls */}
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <PillSelector
              value={(visit.status === 'Complete' || visit.status === 'Cancelled') ? visit.status : 'Scheduled'}
              onChange={handleStatusChange}
              options={statusOptions}
              size="sm"
              className="text-xs"
              title="Status"
              titlePlacement="dropdown"
              placeholder="Status"
              placeholderValue="Scheduled"
              placeholderOption={{
                label: 'Status',
                value: 'Scheduled'
              }}
              showDropdownIndicator
              showDropdownTitleWhenPlaceholder
            />
            <PillSelector
              value={(visit.quality === 'Objectives Met' || visit.quality === 'Partially Met/Slow Pace' || visit.quality === 'Not Met' || visit.quality === 'Red Flag') ? visit.quality : 'none'}
              onChange={handleQualityChange}
              options={qualityOptions}
              size="sm"
              className="text-xs"
              title="Quality"
              titlePlacement="dropdown"
              placeholderValue="none"
              placeholder="Quality"
              placeholderOption={{
                label: 'Quality',
                value: 'none'
              }}
              showDropdownIndicator
            />
          </div>

          {/* Person Met and Visit Hours Controls */}
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <PillSelector
              value={(visit.personMet === 'Primary PoC' || visit.personMet === 'Project Coordinator' || visit.personMet === 'Staff') ? visit.personMet : 'none'}
              onChange={handlePersonMetChange}
              options={personMetOptions}
              size="sm"
              className="text-xs"
              title="Person Met"
              titlePlacement="dropdown"
              placeholderValue="none"
              placeholder="Person Met"
              placeholderOption={{
                label: 'Person Met',
                value: 'none'
              }}
              showDropdownIndicator
            />
            <PillSelector
              value={visit.visitHours || 'none'}
              onChange={handleVisitHoursChange}
              options={visitHoursOptions}
              size="sm"
              className="text-xs"
              title="Visit Hours"
              titlePlacement="dropdown"
              placeholderValue="none"
              placeholder="Visit Hours"
              placeholderOption={{
                label: 'Visit Hours',
                value: 'none'
              }}
              showDropdownIndicator
            />
          </div>

          {/* Agenda Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">Agenda</h4>
              {!agendaEditable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setAgendaEditable(true) }}
                  className="h-6 w-6 p-0"
                >
                  <PencilIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
            {agendaEditable ? (
              <div className="space-y-2">
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  className="w-full p-3 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  rows={3}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Enter visit agenda..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} className="h-8 text-xs px-3">
                    <SaveIcon className="h-3 w-3 mr-1.5" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8 text-xs px-3">
                    <XIcon className="h-3 w-3 mr-1.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {agenda ? truncate(stripHtmlForPreview(agenda), 150) : <span className="italic">No agenda set</span>}
              </div>
            )}
          </div>

          {/* Debrief Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">Debrief</h4>
              {!debriefEditable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setDebriefEditable(true) }}
                  className="h-6 w-6 p-0"
                >
                  <PencilIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
            {debriefEditable ? (
              <div className="space-y-2">
                <textarea
                  value={debrief}
                  onChange={(e) => setDebrief(e.target.value)}
                  className="w-full p-3 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  rows={4}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Enter visit debrief..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} className="h-8 text-xs px-3">
                    <SaveIcon className="h-3 w-3 mr-1.5" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8 text-xs px-3">
                    <XIcon className="h-3 w-3 mr-1.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {debrief ? truncate(stripHtmlForPreview(debrief), 200) : <span className="italic">No debrief set</span>}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">Notes ({notes.length})</h4>
              {!addingNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setAddingNote(true) }}
                  className="h-6 w-6 p-0"
                >
                  <PencilIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {addingNote && (
              <div className="space-y-2 mb-2">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full p-3 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  rows={2}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddNote} className="h-8 text-xs px-3">
                    <SaveIcon className="h-3 w-3 mr-1.5" />
                    Add
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => { e.stopPropagation(); setAddingNote(false); setNoteDraft('') }} 
                    className="h-8 text-xs px-3"
                  >
                    <XIcon className="h-3 w-3 mr-1.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {notes.map((note) => (
                <div key={note.id} className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md leading-relaxed">
                  {note.text}
                </div>
              ))}
            </div>
          </div>

          {/* View Details Button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/meeting-notes/${visit.id}?mode=view`)
              }}
              className="h-9 text-sm px-4"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TimelineCard
