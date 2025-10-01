import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Edit, X, Bold, Italic, List, Link as LinkIcon, Image as ImageIcon, Hash, Quote, Plus, Trash2, History, Building2, RotateCcw } from 'lucide-react'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import { useAllVisits } from '@/hooks/useVisitQueries'
import { useVisitEdit } from '@/hooks/useVisitEdit'
import { useVisitNotes } from '@/hooks/useVisitNotes'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { useUserCciLinks } from '@/hooks/useUserCciLinks'
import useAuthStore from '@/store/authStore'
import { usePermissionsStore } from '@/store/permissionsStore'
import { SingleDatePicker, TextSelect } from '@/components/ui'
import { notify } from '@/utils/notify'
import { format } from 'date-fns'
import { convertTextToHtml, stripHtmlForPreview } from '@/utils/htmlUtils'
import { useTitleBarSlots } from '@/store/titleBarSlots'
import VersionHistoryPopup from './VersionHistoryPopup'
import type { VisitDoc, CCIDoc } from '@/types/firestore'
import { timestampToDate } from '@/types/firestore'

// Re-export for backward compatibility
export type { VisitDoc } from '@/types/firestore'

const MeetingNotes: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') as 'view' | 'edit' || 'view'
  
  const [isEditing, setIsEditing] = useState(mode === 'edit')
  const [visit, setVisit] = useState<VisitDoc | null>(null)
  const [editedDate, setEditedDate] = useState<Date | null>(null)
  // Use centralized notes management
  const notesManager = useVisitNotes(visit)
  const [userManuallySetStatus] = useState(false)
  const [editedCciId, setEditedCciId] = useState<string | null>(null)
  const [showHistoryPopup, setShowHistoryPopup] = useState(false)

  // Title bar slots
  const { setSlots, clearSlots } = useTitleBarSlots()

  
  
  // Centralized query system automatically handles permissions
  const { visits, error: currentError, isLoading, mutate } = useAllVisits()
  const { data: users } = useUsersForVisits()
  
  // Get current user
  const { user } = useAuthStore()
  
  // Use centralized visit edit logic
  const visitEdit = useVisitEdit(visit)
  const { getFilledByStatus } = visitEdit
  
  // Use centralized permission system
  const { canEditVisit } = usePermissionsStore()
  
  // Get CCI data directly to avoid infinite loops
  const { data: ccis } = useFirestoreCollection<CCIDoc>('ccis')
  const { data: userCciLinks } = useUserCciLinks(user?.uid || '')
  
  // Get organized CCI options - memoized to prevent infinite loops
  const organizedCcis = React.useMemo(() => {
    if (!ccis || !userCciLinks) return { userCcis: [], otherCcis: [] }
    
    const userCciIds = userCciLinks.cci_id || []
    const isEM = userCciIds.length > 0
    
    // Sort CCIs by city, then by name
    const sortedCcis = [...ccis].sort((a, b) => {
      const cityCompare = (a.city || '').localeCompare(b.city || '')
      if (cityCompare !== 0) return cityCompare
      return (a.name || '').localeCompare(b.name || '')
    })
    
    // Separate user's CCIs from others
    const userCcis = sortedCcis.filter(cci => userCciIds.includes(cci.id))
    const otherCcis = sortedCcis.filter(cci => !userCciIds.includes(cci.id))
    
    // For EM users, show assigned CCIs first, then others
    // For non-EM users, show all CCIs together
    if (isEM) {
      return { userCcis, otherCcis }
    } else {
      const allCcis = [...userCcis, ...otherCcis].sort((a, b) => {
        const cityCompare = (a.city || '').localeCompare(b.city || '')
        if (cityCompare !== 0) return cityCompare
        return (a.name || '').localeCompare(b.name || '')
      })
      return { userCcis: allCcis, otherCcis: [] }
    }
  }, [ccis, userCciLinks])
  
  const institutionOptions = React.useMemo(() => {
    if (!organizedCcis) return []
    
    const formatLabel = (c: CCIDoc) => {
      const name = c.name || c.cci_name || 'Unnamed CCI'
      const city = c.city ? ` (${c.city})` : ''
      return `${name}${city}`
    }
    
    return [
      ...(organizedCcis.userCcis || []).map((c: CCIDoc) => ({
        label: formatLabel(c),
        value: c.id,
        icon: Building2,
        iconColor: 'text-primary'
      })),
      ...(organizedCcis.otherCcis || []).map((c: CCIDoc) => ({
        label: formatLabel(c),
        value: c.id,
        icon: Building2,
        iconColor: 'text-muted-foreground'
      }))
    ]
  }, [organizedCcis])
  

  const defaultInstitutionOption = React.useMemo(() => {
    if (!organizedCcis) return undefined
    const first = organizedCcis.userCcis?.[0] || organizedCcis.otherCcis?.[0]
    if (!first) return undefined
    return {
      label: first.name || first.cci_name || 'Select Institution',
      value: first.id,
      icon: Building2,
      iconColor: 'text-muted-foreground'
    }
  }, [organizedCcis])

  useEffect(() => {
    if (visits && visitId) {
      if (visitId === 'new') {
        // Create a new visit object for editing
        const today = new Date()
        const dateParam = searchParams.get('date')
        const initialDate = dateParam ? new Date(dateParam) : today
        
        const newVisit: VisitDoc = {
          id: 'new',
          date: initialDate,
          cci_id: '',
          cci_name: '',
          filledByUid: '',
          filledBy: 'Visitor', // Default to Visitor until CCI is selected
          status: 'Scheduled',
          agenda: '',
          debrief: '',
          notes: []
        }
        
        setVisit(newVisit)
        setEditedDate(initialDate)
        setIsEditing(true) // Always start in edit mode for new visits
      } else {
        const foundVisit = visits?.find(v => v.id === visitId)
        setVisit(foundVisit as VisitDoc | null)
        if (foundVisit) {
          const ts: any = foundVisit.date
          const d = ts?.toDate ? ts.toDate() : new Date(ts)
          setEditedDate(d)
        }
        if (foundVisit?.cci_id) setEditedCciId(foundVisit.cci_id)
      }
    }
  }, [visits, visitId, searchParams])
  
  // Update filledBy status when CCI selection changes
  React.useEffect(() => {
    if (visit && isEditing && editedCciId !== null) {
      const newFilledBy = getFilledByStatus(editedCciId)
      if (visit.filledBy !== newFilledBy) {
        setVisit(prev => prev ? { ...prev, filledBy: newFilledBy } : null)
      }
    }
  }, [editedCciId, visit, isEditing, getFilledByStatus])

  // Set title bar slots
  useEffect(() => {
    if (!visit) return

    const visitDate = timestampToDate(visit.date) || new Date()
    const currentDate = editedDate || visitDate

    setSlots({
      customLeft: (
        <div className="flex items-center gap-1 sm:gap-2">
          {isEditing ? (
            <SingleDatePicker
              value={currentDate}
              onChange={(value) => {
                if (value && typeof value === 'object' && 'from' in value) {
                  // This is a DateRangeValue, but we only want the date
                  return
                }
                if (value && value instanceof Date) {
                  setEditedDate(value)
                }
              }}
              placeholder="Select date"
              className="h-7 min-w-0 max-w-[120px] sm:max-w-none"
            />
          ) : (
            <span className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-none">
              {currentDate.toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
      ),
      customCenter: isEditing ? (
        <TextSelect
          value={editedCciId ?? ''}
          onChange={(value) => setEditedCciId(value || null)}
          options={institutionOptions.map(option => ({
            label: option.label,
            value: option.value
          }))}
          placeholder="Select Institution"
          size="md"
          className="w-full min-w-0 max-w-[260px]"
        />
      ) : (
        <div className="text-xs sm:text-sm md:text-base font-semibold text-foreground truncate w-full min-w-0 max-w-[200px] sm:max-w-[300px]">
          {visit.cci_name || (visit.id === 'new' ? 'New Note' : 'No Institution')}
        </div>
      ),
      customRight: isEditing ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button onClick={handleCancel} variant="ghost" size="sm" className="h-7 w-7 p-0" title="Cancel">
            <X className="h-4 w-4" />
          </Button>
          <Button onClick={handleSave} size="sm" className="h-7 w-7 p-0" title="Save" disabled={visitEdit.isSaving}>
            <Save className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button 
            onClick={() => setShowHistoryPopup(true)} 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0" 
            title="View History"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleEdit} 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0" 
            title={visit && canEditVisit(visit.id, visit.filledByUid) ? "Edit" : "You can only edit visits that you created"}
            disabled={!visit || !canEditVisit(visit.id, visit.filledByUid)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    })

    return () => clearSlots()
  }, [visit, isEditing, editedDate, editedCciId, institutionOptions, defaultInstitutionOption])

  // Initialize editors
  const agendaEditor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-600 underline',
          },
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder: 'Enter meeting agenda... (supports markdown: use - for bullets, **bold**, *italic*)',
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: false,
        breaks: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: visit?.agenda || '',
    editable: isEditing,
  })

  const debriefEditor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-600 underline',
          },
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder: 'Enter meeting debrief... (supports markdown: use - for bullets, **bold**, *italic*)',
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: false,
        breaks: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: visit?.debrief || '',
    editable: isEditing,
  })



  // Update editor content when visit data changes
  useEffect(() => {
    if (visit && agendaEditor && debriefEditor) {
      const agendaContent = convertTextToHtml(visit.agenda || '')
      const debriefContent = convertTextToHtml(visit.debrief || '')
      
      agendaEditor.commands.setContent(agendaContent)
      debriefEditor.commands.setContent(debriefContent)
    }
  }, [visit, agendaEditor, debriefEditor])


  // Update editor editability when mode changes
  useEffect(() => {
    if (agendaEditor && debriefEditor) {
      agendaEditor.setEditable(isEditing)
      debriefEditor.setEditable(isEditing)
    }
  }, [isEditing, agendaEditor, debriefEditor])

  const handleSave = async () => {
    if (!visit || !agendaEditor || !debriefEditor) return

    // Validate CCI selection for new visits
    if (visit.id === 'new' && (!editedCciId || editedCciId === '')) {
      notify.error('Please select a Child Care Institution before saving')
      return
    }

    // Check edit permissions for existing visits
    if (visit.id !== 'new' && !canEditVisit(visit.id, visit.filledByUid)) {
      notify.error('You can only edit visits that you created')
      return
    }

    try {
      const agenda = agendaEditor.getHTML()
      const debrief = debriefEditor.getHTML()

      // Check if debrief has content to auto-complete status (only if user hasn't manually set status)
      const debriefText = debriefEditor.getText().trim()
      const shouldAutoComplete = debriefText.length > 0 && visit.status !== 'Complete' && !userManuallySetStatus

      if (visit.id === 'new') {
        // Create new visit using centralized logic
        await visitEdit.createVisit({
          agenda,
          debrief,
          date: editedDate || new Date(),
          cci_id: editedCciId || '',
        }, {
          autoComplete: shouldAutoComplete,
          onSuccess: (visitId) => {
            navigate(`/meeting-notes/${visitId}?mode=view`)
          }
        })
      } else {
        // Update existing visit using centralized logic with current visit for validation
        await visitEdit.updateVisit(visit.id, {
          agenda,
          debrief,
          ...(editedDate ? { date: editedDate } : {}),
          ...(editedCciId ? { cci_id: editedCciId } : {}),
        }, {
          autoComplete: shouldAutoComplete,
          onSuccess: () => {
            setIsEditing(false)
          }
        }, visit) // Pass current visit for validation
      }
    } catch (error) {
      console.error('Error saving meeting notes:', error)
      // Error handling is done in the centralized hooks
    }
  }

  const handleCancel = () => {
    if (visit?.id === 'new') {
      // For new visits, navigate back to notes view
      navigate('/notes')
    } else if (agendaEditor && debriefEditor && visit) {
      agendaEditor.commands.setContent(visit.agenda || '')
      debriefEditor.commands.setContent(visit.debrief || '')
    }
    setIsEditing(false)
    notesManager.cancelAddingNote()
    notesManager.cancelEditingNote()
  }

  const handleEdit = () => {
    // Check if user can edit this visit
    if (visit && !canEditVisit(visit.id, visit.filledByUid)) {
      notify.error('You can only edit visits that you created')
      return
    }
    setIsEditing(true)
  }


  // Note management functions
  const handleAddNote = async () => {
    await notesManager.addNote(notesManager.noteDraft)
    // Refresh the data to show the new note
    mutate()
  }

  const handleEditNote = (noteId: string, currentText: string) => {
    notesManager.startEditingNote(noteId, stripHtmlForPreview(currentText))
  }

  const handleSaveNote = async (noteId: string) => {
    await notesManager.updateNote(noteId, notesManager.editingNoteText)
    // Refresh the data to show the updated note
    mutate()
  }

  const handleDeleteNote = async (noteId: string) => {
    await notesManager.deleteNote(noteId)
    // Refresh the data to show the updated notes list
    mutate()
  }

  const emUser = visit ? (users || []).find(u => u.uid === visit.filledByUid) : undefined
  const emLabel = emUser?.username || emUser?.email

  if (isLoading || (visits && visitId && visitId !== 'new' && !visit)) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <div className="text-center text-muted-foreground">Loading meeting notes...</div>
        </div>
      </div>
    )
  }

  if (currentError || (!visit && visitId !== 'new')) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                {currentError ? `Error loading meeting notes: ${currentError?.message || 'Unknown error'}` : 'Meeting notes not found'}
              </div>
              <div className="text-center mt-4">
                <Button onClick={() => navigate(-1)} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8 lg:py-12 xl:py-16">
        {/* Chips row for role and EM name */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-0.5 rounded-full border text-xs">{visit?.filledBy}</span>
          {emLabel && <span className="px-2 py-0.5 rounded-full border text-xs">{emLabel}</span>}
        </div>

        {/* Rich Text Editor Toolbar */}
        {isEditing && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleBold().run()}
                    className={`${agendaEditor?.isActive('bold') ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                    title="Bold (Ctrl+B or **text**)"
                  >
                    <Bold className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleItalic().run()}
                    className={`${agendaEditor?.isActive('italic') ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                    title="Italic (Ctrl+I or *text*)"
                  >
                    <Italic className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleBulletList().run()}
                    className={`${agendaEditor?.isActive('bulletList') ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                    title="Bullet List (use - for bullets)"
                  >
                    <List className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`${agendaEditor?.isActive('heading', { level: 2 }) ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                    title="Heading (use ## for heading)"
                  >
                    <Hash className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleBlockquote().run()}
                    className={`${agendaEditor?.isActive('blockquote') ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                    title="Quote (use > for blockquote)"
                  >
                    <Quote className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = window.prompt('Enter URL:')
                      if (url) {
                        agendaEditor?.chain().focus().setLink({ href: url }).run()
                      }
                    }}
                    className={`${agendaEditor?.isActive('link') ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                    title="Link ([text](url))"
                  >
                    <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = window.prompt('Enter image URL:')
                      if (url) {
                        agendaEditor?.chain().focus().setImage({ src: url }).run()
                      }
                    }}
                    className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
                    title="Image (![alt](url))"
                  >
                    <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  💡 <strong>Markdown shortcuts:</strong> Use <code>-</code> for bullets, <code>**bold**</code> for bold, <code>*italic*</code> for italic, <code>##</code> for headings, <code>&gt;</code> for quotes
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agenda Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Agenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`prose prose-sm max-w-none ${isEditing ? 'min-h-[200px] border rounded-md p-4' : ''}`}>
              <EditorContent editor={agendaEditor} />
            </div>
          </CardContent>
        </Card>

        {/* Debrief Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Debrief</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`prose prose-sm max-w-none ${isEditing ? 'min-h-[200px] border rounded-md p-4' : ''}`}>
              <EditorContent editor={debriefEditor} />
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notes</CardTitle>
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={notesManager.startAddingNote}
                  className="rounded-full px-4 py-1 border-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visit?.notes && visit.notes.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No notes yet. {isEditing && 'Click "Add Note" to create your first note.'}
                </div>
              )}
              
              {visit?.notes?.map((note) => (
                <div key={note.id} className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                  {notesManager.editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full h-24 rounded-md border p-3 text-sm resize-none"
                        value={notesManager.editingNoteText}
                        onChange={(e) => notesManager.setEditingNoteText(e.target.value)}
                        placeholder="Enter note content..."
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={notesManager.cancelEditingNote}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveNote(note.id)}
                          disabled={!notesManager.editingNoteText.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {stripHtmlForPreview(note.text)}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {format(timestampToDate(note.createdAt) || new Date(), 'MMM dd, yyyy HH:mm')}
                        </div>
                        {isEditing && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditNote(note.id, note.text)}
                              className="h-8 w-8 p-0 hover:bg-blue-100"
                              title="Edit note"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteNote(note.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                              title="Delete note"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {notesManager.isAddingNote && (
                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="space-y-3">
                    <textarea
                      className="w-full h-24 rounded-md border p-3 text-sm resize-none"
                      value={notesManager.noteDraft}
                      onChange={(e) => notesManager.setNoteDraft(e.target.value)}
                      placeholder="Enter your note..."
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={notesManager.cancelAddingNote}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!notesManager.noteDraft.trim()}
                      >
                        Add Note
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Version History Popup */}
      {visitId && (
        <VersionHistoryPopup
          visitId={visitId}
          isOpen={showHistoryPopup}
          onClose={() => setShowHistoryPopup(false)}
        />
      )}
    </div>
  )
}

export default MeetingNotes
