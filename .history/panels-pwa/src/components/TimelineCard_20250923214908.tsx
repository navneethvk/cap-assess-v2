import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateDocument } from '@/firebase/firestoreService'
import { notify } from '@/utils/notify'
import { stripHtmlForPreview, stripHtmlForEditing, truncate } from '@/utils/htmlUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusDropdown } from '@/components/ui/status-dropdown'
import { PersonMetDropdown } from '@/components/ui/person-met-dropdown'
import { QualityDropdown } from '@/components/ui/quality-dropdown'
import { VisitHoursDropdown } from '@/components/ui/visit-hours-dropdown'
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

  const handleStatusChange = useCallback(async (newStatus: 'Scheduled' | 'Complete' | 'Cancelled') => {
    setUserManuallySetStatus(true)
    await save({ status: newStatus })
  }, [save])

  const handlePersonMetChange = useCallback(async (newPersonMet: 'Primary PoC' | 'Project Coordinator' | 'Staff' | 'none') => {
    // Check if personMet has content to auto-complete status (only if user hasn't manually set status)
    const shouldAutoComplete = newPersonMet !== 'none' && visit.status !== 'Complete' && !userManuallySetStatus
    
    await save({ 
      personMet: newPersonMet,
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
      <Card className={`transition-all duration-200 ${anyDragging ? 'scale-95 shadow-lg' : 'hover:shadow-md'} ${isDragTarget ? 'ring-2 ring-primary' : ''} w-full max-w-md mx-auto`}>
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
              <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Status and Quality Controls */}
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <StatusDropdown
              value={(visit.status === 'Complete' || visit.status === 'Cancelled') ? visit.status : 'Scheduled'}
              onChange={handleStatusChange}
              className="text-xs"
            />
            <QualityDropdown
              value={(visit.quality === 'Objectives Met' || visit.quality === 'Partially Met/Slow Pace' || visit.quality === 'Not Met' || visit.quality === 'Red Flag') ? visit.quality : 'none'}
              onChange={handleQualityChange}
              className="text-xs"
            />
          </div>

          {/* Person Met and Visit Hours Controls */}
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <PersonMetDropdown
              value={(visit.personMet === 'Primary PoC' || visit.personMet === 'Project Coordinator' || visit.personMet === 'Staff') ? visit.personMet : 'none'}
              onChange={handlePersonMetChange}
              className="text-xs"
            />
            <VisitHoursDropdown
              value={visit.visitHours || 'none'}
              onChange={handleVisitHoursChange}
              className="text-xs"
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
              <div className="text-xs text-gray-600 whitespace-pre-wrap">
                {agenda ? truncate(stripHtmlForPreview(agenda), 150) : 'No agenda set'}
              </div>
            )}
          </div>

          {/* Debrief Section */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-medium text-gray-700">Debrief</h4>
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
                  className="w-full p-2 text-xs border rounded resize-none"
                  rows={4}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleSave} className="h-6 text-xs">
                    <SaveIcon className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-6 text-xs">
                    <XIcon className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 whitespace-pre-wrap">
                {debrief ? truncate(stripHtmlForPreview(debrief), 200) : 'No debrief set'}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-medium text-gray-700">Notes ({notes.length})</h4>
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
                  className="w-full p-2 text-xs border rounded resize-none"
                  rows={2}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleAddNote} className="h-6 text-xs">
                    <SaveIcon className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => { e.stopPropagation(); setAddingNote(false); setNoteDraft('') }} 
                    className="h-6 text-xs"
                  >
                    <XIcon className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {notes.map((note) => (
                <div key={note.id} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {note.text}
                </div>
              ))}
            </div>
          </div>

          {/* View Details Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/meeting-notes/${visit.id}?mode=view`)
              }}
              className="h-7 text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TimelineCard
