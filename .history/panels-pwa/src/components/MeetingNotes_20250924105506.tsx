import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Edit, X, Bold, Italic, List, Link as LinkIcon, Image as ImageIcon, Hash, Quote, Plus, Trash2, History, Building2 } from 'lucide-react'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { useUsersForVisits } from '@/hooks/useUsersForVisits'
import { useAllVisits } from '@/hooks/useVisitQueries'
import { useUserCciLinks } from '@/hooks/useUserCciLinks'
import { updateDocument, addDocument } from '@/firebase/firestoreService'
import { visitsCollection } from '@/firebase/paths'
import { PillSelector } from '@/components/ui/pill-selector'
import { notify } from '@/utils/notify'
import { format } from 'date-fns'
import { convertTextToHtml, stripHtmlForPreview } from '@/utils/htmlUtils'
import { useTitleBarSlots } from '@/store/titleBarSlots'
import useAuthStore from '@/store/authStore'
import VersionHistoryPopup from './VersionHistoryPopup'
import type { VisitDoc, CCIDoc, CreateData, UpdateData } from '@/types/firestore'
import { timestampToDate } from '@/types/firestore'

// Re-export for backward compatibility
export type { VisitDoc } from '@/types/firestore'

const MeetingNotes: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') as 'view' | 'edit' || 'view'
  
  const [isEditing, setIsEditing] = useState(mode === 'edit')
  const [isSaving, setIsSaving] = useState(false)
  const [visit, setVisit] = useState<VisitDoc | null>(null)
  const [editedDate, setEditedDate] = useState<Date | null>(null)
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [userManuallySetStatus] = useState(false)
  const [editedCciId, setEditedCciId] = useState<string | null>(null)
  const [showHistoryPopup, setShowHistoryPopup] = useState(false)

  // Title bar slots
  const { setSlots, clearSlots } = useTitleBarSlots()

  // Get current user and their CCI links
  const { user } = useAuthStore()
  const { data: userCciLinks } = useUserCciLinks(user?.uid || '')
  
  
  // Centralized query system automatically handles permissions
  const { visits, error: currentError, isLoading, mutate } = useAllVisits()
  const { data: users } = useUsersForVisits()
  const { data: ccis } = useFirestoreCollection<CCIDoc>('ccis')
  
  // Create sorted and organized CCI list
  const organizedCcis = React.useMemo(() => {
    if (!ccis) return { userCcis: [], otherCcis: [] }
    
    const userCciIds = userCciLinks?.cci_id || []
    
    // Sort CCIs by city, then alphabetically by name
    const sortedCcis = [...ccis].sort((a, b) => {
      // First sort by city
      const cityCompare = (a.city || '').localeCompare(b.city || '')
      if (cityCompare !== 0) return cityCompare
      
      // Then sort by name
      return (a.name || '').localeCompare(b.name || '')
    })
    
    // Separate user's CCIs from others
    const userCcis = sortedCcis.filter(cci => userCciIds.includes(cci.id))
    const otherCcis = sortedCcis.filter(cci => !userCciIds.includes(cci.id))
    
    return { userCcis, otherCcis }
  }, [ccis, userCciLinks])
  
  const institutionOptions = React.useMemo(() => {
    if (!organizedCcis) return []
    return [
      ...(organizedCcis.userCcis || []).map((c: CCIDoc) => ({
        label: c.name || c.cci_name || 'Unnamed CCI',
        value: c.id,
        icon: Building2,
        iconColor: 'text-primary'
      })),
      ...(organizedCcis.otherCcis || []).map((c: CCIDoc) => ({
        label: c.name || c.cci_name || 'Unnamed CCI',
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
          filledBy: 'EM',
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

  // Set title bar slots
  useEffect(() => {
    if (!visit) return

    const visitDate = timestampToDate(visit.date) || new Date()
    const currentDate = editedDate || visitDate

    setSlots({
      customLeft: (
        <div className="flex items-center gap-1 sm:gap-2">
          {isEditing ? (
            <input
              type="date"
              value={format(currentDate, 'yyyy-MM-dd')}
              onChange={(e) => setEditedDate(new Date(e.target.value))}
              className="h-7 px-1 sm:px-2 rounded-md border text-xs min-w-0 max-w-[120px] sm:max-w-none"
            />
          ) : (
            <span className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-none">
              {currentDate.toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
      ),
      customCenter: isEditing ? (
        <PillSelector
          value={editedCciId ?? ''}
          onChange={(value) => setEditedCciId(value || null)}
          options={institutionOptions}
          size="md"
          title="Institution"
          titlePlacement="dropdown"
          placeholder="Select Institution"
          placeholderValue=""
          placeholderOption={defaultInstitutionOption}
          showDropdownIndicator
          hidePlaceholderOptionInMenu={false}
          showDropdownTitleWhenPlaceholder
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
          <Button onClick={handleSave} size="sm" className="h-7 w-7 p-0" title="Save" disabled={isSaving}>
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
          <Button onClick={handleEdit} size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    })

    return () => clearSlots()
  }, [visit, isEditing, editedDate, editedCciId, institutionOptions, defaultInstitutionOption, setSlots, clearSlots])

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

    setIsSaving(true)
    try {
      const agenda = agendaEditor.getHTML()
      const debrief = debriefEditor.getHTML()

      // Check if debrief has content to auto-complete status (only if user hasn't manually set status)
      const debriefText = debriefEditor.getText().trim()
      const shouldAutoComplete = debriefText.length > 0 && visit.status !== 'Complete' && !userManuallySetStatus

      if (visit.id === 'new') {
        // Create a new visit
        const newVisitData: CreateData<VisitDoc> = {
          agenda,
          debrief,
          date: editedDate || new Date(),
          cci_id: editedCciId || '',
          cci_name: editedCciId && ccis ? (() => {
            const cci = ccis?.find(c => c.id === editedCciId)
            return cci?.name || cci?.cci_name || ''
          })() : '',
          filledByUid: user?.uid || '', // Set to current user's UID
          filledBy: user?.displayName || user?.email || 'EM',
          status: shouldAutoComplete ? 'Complete' : 'Scheduled',
          notes: []
        }

        console.log('MeetingNotes - Creating new visit with data:', newVisitData)
        console.log('MeetingNotes - Current user:', user)
        console.log('MeetingNotes - User UID:', user?.uid)

        // Create the new visit document
        const newId = await addDocument<VisitDoc>('visits', newVisitData)
        
        // Navigate to the new visit
        navigate(`/meeting-notes/${newId}?mode=view`)
        notify.success('New meeting notes created successfully')
      } else {
        // Update existing visit
        const updateData: UpdateData<VisitDoc> = {
          agenda,
          debrief,
          ...(editedDate ? { date: editedDate } : {}),
          ...(editedCciId && ccis ? (() => {
            const cci = ccis?.find(c => c.id === editedCciId)
            return cci ? { cci_id: editedCciId, cci_name: cci.name || cci.cci_name } : {}
          })() : {}),
          ...(shouldAutoComplete && { status: 'Complete' })
        }
        await updateDocument<VisitDoc>('visits', visit.id, updateData)

        notify.success('Meeting notes saved successfully')
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving meeting notes:', error)
      notify.error('Failed to save meeting notes')
    } finally {
      setIsSaving(false)
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
    setAddingNote(false)
    setNoteDraft('')
    setEditingNoteId(null)
    setEditingNoteText('')
  }

  const handleEdit = () => {
    setIsEditing(true)
  }


  // Note management functions
  const handleAddNote = async () => {
    if (!visit || !noteDraft.trim()) return

    try {
      const newNote = {
        id: String(Date.now()),
        text: noteDraft.trim(),
        createdAt: new Date()
      }
      
      const updatedNotes = [...(visit.notes || []), newNote]
      await updateDocument(visitsCollection(), visit.id, { notes: updatedNotes })
      
      setNoteDraft('')
      setAddingNote(false)
      notify.success('Note added successfully')
      
      // Refresh the data to show the new note
      mutate()
    } catch (error) {
      console.error('Error adding note:', error)
      notify.error('Failed to add note')
    }
  }

  const handleEditNote = (noteId: string, currentText: string) => {
    setEditingNoteId(noteId)
    setEditingNoteText(stripHtmlForPreview(currentText))
  }

  const handleSaveNote = async (noteId: string) => {
    if (!visit || !editingNoteText.trim()) return

    try {
      const updatedNotes = (visit.notes || []).map(note =>
        note.id === noteId ? { ...note, text: editingNoteText.trim() } : note
      )
      
      await updateDocument(visitsCollection(), visit.id, { notes: updatedNotes })
      
      setEditingNoteId(null)
      setEditingNoteText('')
      notify.success('Note updated successfully')
      
      // Refresh the data to show the updated note
      mutate()
    } catch (error) {
      console.error('Error updating note:', error)
      notify.error('Failed to update note')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!visit) return

    try {
      const updatedNotes = (visit.notes || []).filter(note => note.id !== noteId)
      await updateDocument(visitsCollection(), visit.id, { notes: updatedNotes })
      
      notify.success('Note deleted successfully')
      
      // Refresh the data to show the updated notes list
      mutate()
    } catch (error) {
      console.error('Error deleting note:', error)
      notify.error('Failed to delete note')
    }
  }

  const emUser = visit ? (users || []).find(u => u.uid === visit.filledByUid) : undefined
  const emLabel = emUser?.username || emUser?.email

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <div className="text-center text-muted-foreground">Loading meeting notes...</div>
        </div>
      </div>
    )
  }

  if (currentError || !visit) {
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
          <span className="px-2 py-0.5 rounded-full border text-xs">{visit.filledBy}</span>
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
                  onClick={() => setAddingNote(true)}
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
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full h-24 rounded-md border p-3 text-sm resize-none"
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        placeholder="Enter note content..."
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingNoteId(null)
                            setEditingNoteText('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveNote(note.id)}
                          disabled={!editingNoteText.trim()}
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

              {addingNote && (
                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="space-y-3">
                    <textarea
                      className="w-full h-24 rounded-md border p-3 text-sm resize-none"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Enter your note..."
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddingNote(false)
                          setNoteDraft('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!noteDraft.trim()}
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
