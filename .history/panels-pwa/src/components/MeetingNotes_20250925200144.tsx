import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Edit, Bold, Italic, List, Link as LinkIcon, Image as ImageIcon, Hash, Quote, Plus, Trash2, History, Building2, X } from 'lucide-react'
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
  
  // Always in edit mode - no more view/edit toggle
  const [visit, setVisit] = useState<VisitDoc | null>(null)
  const [originalData, setOriginalData] = useState<VisitDoc | null>(null) // Last manual save
  const [, setCurrentData] = useState<VisitDoc | null>(null)   // Current edits
  const [editedDate, setEditedDate] = useState<Date | null>(null)
  const [lastAutosave, setLastAutosave] = useState<Date | null>(null)     // Autosave timestamp
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)       // Track changes
  const [isAutosaving, setIsAutosaving] = useState(false)                 // Autosave in progress
  
  // Autosave timeout ref
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
  const { canEditVisit, userId, capabilities } = usePermissionsStore()
  
  // Check if user can edit this visit - only if permissions store is initialized
  const canEdit = visit && userId && capabilities.canEditVisits ? canEditVisit(visit.id, visit.filledByUid) : false
  
  // Debug logging for permissions
  React.useEffect(() => {
    console.log('MeetingNotes: Permission check:', {
      visitId: visit?.id,
      filledByUid: visit?.filledByUid,
      userId,
      canEditVisits: capabilities.canEditVisits,
      canEdit,
      hasVisit: !!visit
    })
  }, [visit?.id, visit?.filledByUid, userId, capabilities.canEditVisits, canEdit, visit])
  
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
  

  // Removed unused defaultInstitutionOption

  // Autosave functionality - defined early to avoid hoisting issues
  const performAutosave = useCallback(async () => {
    if (!visit || !canEdit || isAutosaving) return

    try {
      setIsAutosaving(true)
      // Note: agendaEditor and debriefEditor will be available when this is called
      const agenda = (agendaEditor as any)?.getHTML?.() || ''
      const debrief = (debriefEditor as any)?.getHTML?.() || ''

      // Check if debrief has content to auto-complete status
      const debriefText = (debriefEditor as any)?.getText?.()?.trim() || ''
      const shouldAutoComplete = debriefText.length > 0 && visit.status !== 'Complete' && !userManuallySetStatus

      if (visit.id === 'new') {
        // For new visits, we can't autosave - they need to be created first
        return
      } else {
        // Update existing visit
        await visitEdit.updateVisit(visit.id, {
          agenda,
          debrief,
          ...(editedDate ? { date: editedDate } : {}),
          ...(editedCciId ? { cci_id: editedCciId } : {}),
        }, {
          autoComplete: shouldAutoComplete,
          onSuccess: () => {
            setLastAutosave(new Date())
            setHasUnsavedChanges(false)
            // Don't update originalData on autosave - only on manual save
            console.log('Autosave completed successfully')
          }
        }, visit)
      }
    } catch (error) {
      console.error('Autosave failed:', error)
    } finally {
      setIsAutosaving(false)
    }
  }, [visit, canEdit, isAutosaving, editedDate, editedCciId, userManuallySetStatus, visitEdit])

  // Debounced autosave trigger - removed duplicate, now inlined in handleDataChangeWithAutosave

  // Handle data changes with autosave - stable reference
  const handleDataChangeWithAutosave = useCallback(() => {
    setHasUnsavedChanges(true)
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      performAutosave()
    }, 2000)
  }, [performAutosave])

  // beforeunload handler for autosave - will be defined after autosave functions

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
        setOriginalData(newVisit) // For new visits, original and current are the same
        setCurrentData(newVisit)
        setEditedDate(initialDate)
        setHasUnsavedChanges(false) // New visits start with no changes
      } else {
        const foundVisit = visits?.find(v => v.id === visitId)
        if (foundVisit) {
          setVisit(foundVisit as VisitDoc)
          setOriginalData(foundVisit as VisitDoc) // Set original data from fetched visit
          setCurrentData(foundVisit as VisitDoc)  // Set current data from fetched visit
          
          const ts: any = foundVisit.date
          const d = ts?.toDate ? ts.toDate() : new Date(ts)
          setEditedDate(d)
          setEditedCciId(foundVisit.cci_id)
          setHasUnsavedChanges(false) // Existing visits start with no changes
        }
      }
    }
  }, [visits, visitId, searchParams])
  
  // Update filledBy status when CCI selection changes
  React.useEffect(() => {
    if (visit && editedCciId !== null) {
      const newFilledBy = getFilledByStatus(editedCciId)
      if (visit.filledBy !== newFilledBy) {
        const updatedVisit = { ...visit, filledBy: newFilledBy }
        setVisit(updatedVisit)
        setCurrentData(updatedVisit)
        handleDataChangeWithAutosave()
      }
    }
  }, [editedCciId, visit, getFilledByStatus, handleDataChangeWithAutosave])

  // Set title bar slots
  useEffect(() => {
    if (!visit) return

    const visitDate = timestampToDate(visit.date) || new Date()
    const currentDate = editedDate || visitDate

    setSlots({
      customLeft: (
        <div className="flex items-center gap-1 sm:gap-2">
          <SingleDatePicker
            value={currentDate}
            onChange={(value) => {
              if (value && typeof value === 'object' && 'from' in value) {
                // This is a DateRangeValue, but we only want the date
                return
              }
              if (value && value instanceof Date) {
                setEditedDate(value)
                handleDataChangeWithAutosave()
              }
            }}
            placeholder="Select date"
            className="h-7 min-w-0 max-w-[120px] sm:max-w-none"
            disabled={!canEdit}
          />
        </div>
      ),
      customCenter: (
        <TextSelect
          value={editedCciId ?? ''}
          onChange={(value) => {
            setEditedCciId(value || null)
            handleDataChangeWithAutosave()
          }}
          options={institutionOptions.map(option => ({
            label: option.label,
            value: option.value
          }))}
          placeholder="Select Institution"
          size="md"
          className="w-full min-w-0 max-w-[260px]"
          disabled={!canEdit}
        />
      ),
      customRight: (
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Autosave indicator */}
          {lastAutosave && (
            <span className="text-xs text-muted-foreground italic mr-2">
              autosaved on {format(lastAutosave, 'HH:mm')}
            </span>
          )}
          
          {/* History button */}
          <Button 
            onClick={() => setShowHistoryPopup(true)} 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0" 
            title="View History"
          >
            <History className="h-4 w-4" />
          </Button>
          
          {/* Discard button */}
          <Button 
            onClick={handleDiscard} 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0" 
            title="Discard changes"
            disabled={!hasUnsavedChanges || !canEdit}
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Save button */}
          <Button 
            onClick={handleSave} 
            size="sm" 
            className="h-7 w-7 p-0" 
            title="Save changes" 
            disabled={visitEdit.isSaving || !canEdit}
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      ),
    })

    return () => clearSlots()
  }, [visit, editedDate, editedCciId, institutionOptions, canEdit, lastAutosave, hasUnsavedChanges, visitEdit.isSaving])

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
    editable: canEdit, // Always editable if user has permissions
    onUpdate: ({ editor }) => {
      if (canEdit && visit) {
        const updatedVisit = { ...visit, agenda: editor.getHTML() }
        setVisit(updatedVisit)
        setCurrentData(updatedVisit)
        handleDataChangeWithAutosave()
      }
    },
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
    editable: canEdit, // Always editable if user has permissions
    onUpdate: ({ editor }) => {
      if (canEdit && visit) {
        const updatedVisit = { ...visit, debrief: editor.getHTML() }
        setVisit(updatedVisit)
        setCurrentData(updatedVisit)
        handleDataChangeWithAutosave()
      }
    },
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

  // Update editor editability when permissions change
  useEffect(() => {
    if (agendaEditor && debriefEditor) {
      agendaEditor.setEditable(canEdit)
      debriefEditor.setEditable(canEdit)
    }
  }, [canEdit, agendaEditor, debriefEditor])

  // Autosave functions are now defined above

  // beforeunload handler for autosave
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && canEdit) {
        // Trigger autosave immediately
        performAutosave()
        
        // Show confirmation dialog
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. They will be autosaved.'
        return 'You have unsaved changes. They will be autosaved.'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Clear timeout on unmount
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [hasUnsavedChanges, canEdit, performAutosave])

  const handleSave = async () => {
    if (!visit || !agendaEditor || !debriefEditor || !canEdit) return

    // Validate CCI selection for new visits
    if (visit.id === 'new' && (!editedCciId || editedCciId === '')) {
      notify.error('Please select a Child Care Institution before saving')
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
            // Update original data to current state after successful save
            const savedVisit = { ...visit, id: visitId, agenda, debrief }
            setOriginalData(savedVisit)
            setCurrentData(savedVisit)
            setHasUnsavedChanges(false)
            navigate(`/meeting-notes/${visitId}`)
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
            // Update original data to current state after successful save
            const savedVisit = { ...visit, agenda, debrief }
            setOriginalData(savedVisit)
            setCurrentData(savedVisit)
            setHasUnsavedChanges(false)
            notify.success('Changes saved successfully')
          }
        }, visit) // Pass current visit for validation
      }
    } catch (error) {
      console.error('Error saving meeting notes:', error)
      // Error handling is done in the centralized hooks
    }
  }

  const handleDiscard = () => {
    if (!originalData || !agendaEditor || !debriefEditor) return

    if (visit?.id === 'new') {
      // For new visits, navigate back to notes view
      navigate('/notes')
    } else {
      // Revert to original data (last manual save)
      const agendaContent = convertTextToHtml(originalData.agenda || '')
      const debriefContent = convertTextToHtml(originalData.debrief || '')
      
      agendaEditor.commands.setContent(agendaContent)
      debriefEditor.commands.setContent(debriefContent)
      
      setVisit(originalData)
      setCurrentData(originalData)
      setEditedDate(originalData.date ? ((originalData.date as any)?.toDate ? (originalData.date as any).toDate() : new Date(originalData.date as any)) : null)
      setEditedCciId(originalData.cci_id)
      setHasUnsavedChanges(false)
      setLastAutosave(null) // Clear autosave timestamp since we're discarding
      
      notify.success('Changes discarded')
    }
    
    notesManager.cancelAddingNote()
    notesManager.cancelEditingNote()
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

        {/* Rich Text Editor Toolbar - Always visible but disabled for read-only users */}
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
                  disabled={!canEdit}
                >
                  <Bold className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => agendaEditor?.chain().focus().toggleItalic().run()}
                  className={`${agendaEditor?.isActive('italic') ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                  title="Italic (Ctrl+I or *text*)"
                  disabled={!canEdit}
                >
                  <Italic className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => agendaEditor?.chain().focus().toggleBulletList().run()}
                  className={`${agendaEditor?.isActive('bulletList') ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                  title="Bullet List (use - for bullets)"
                  disabled={!canEdit}
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => agendaEditor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`${agendaEditor?.isActive('heading', { level: 2 }) ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                  title="Heading (use ## for heading)"
                  disabled={!canEdit}
                >
                  <Hash className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => agendaEditor?.chain().focus().toggleBlockquote().run()}
                  className={`${agendaEditor?.isActive('blockquote') ? 'bg-muted' : ''} flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0`}
                  title="Quote (use > for blockquote)"
                  disabled={!canEdit}
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
                  disabled={!canEdit}
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
                  disabled={!canEdit}
                >
                  <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                💡 <strong>Markdown shortcuts:</strong> Use <code>-</code> for bullets, <code>**bold**</code> for bold, <code>*italic*</code> for italic, <code>##</code> for headings, <code>&gt;</code> for quotes
                {!canEdit && <span className="ml-2 text-orange-600">(Read-only mode)</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agenda Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Agenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`prose prose-sm max-w-none min-h-[200px] border rounded-md p-4 ${!canEdit ? 'bg-gray-50 opacity-75' : ''}`}>
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
            <div className={`prose prose-sm max-w-none min-h-[200px] border rounded-md p-4 ${!canEdit ? 'bg-gray-50 opacity-75' : ''}`}>
              <EditorContent editor={debriefEditor} />
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notes</CardTitle>
              {canEdit && (
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
                  No notes yet. {canEdit && 'Click "Add Note" to create your first note.'}
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
                        {canEdit && (
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
