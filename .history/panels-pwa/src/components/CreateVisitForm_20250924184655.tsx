import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Save, X, Bold, Italic, List, Link as LinkIcon, Image as ImageIcon, Hash, Quote, Plus, Trash2, Edit } from 'lucide-react'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { useCciLinksForVisits } from '@/hooks/useCciLinksForVisits'
import { addDocument } from '@/firebase/firestoreService'
import { ccisCollection } from '@/firebase/paths'
import { TextSelect } from '@/components/ui/text-select'
import { SingleDatePicker } from '@/components/ui'
import { notify } from '@/utils/notify'
import { format } from 'date-fns'
import { stripHtmlForPreview } from '@/utils/htmlUtils'
import useAuthStore from '@/store/authStore'
import type { VisitDoc, CCIDoc, CreateData } from '@/types/firestore'
import { cn } from '@/lib/utils'

interface CreateVisitFormProps {
  initialDate?: Date
  onSave?: (visitId: string) => void
  onCancel?: () => void
  className?: string
}

const CreateVisitForm: React.FC<CreateVisitFormProps> = ({
  initialDate = new Date(),
  onSave,
  onCancel,
  className = ''
}) => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate)
  const [selectedCciId, setSelectedCciId] = useState<string>('')
  const [showAllCcis, setShowAllCcis] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [notes, setNotes] = useState<Array<{ id: string; text: string; createdAt: Date }>>([])

  // Fetch CCIs and organize them
  const { data: ccis } = useFirestoreCollection<CCIDoc>(ccisCollection())
  const { data: cciLinks } = useCciLinksForVisits()

  const allocatedIds = React.useMemo(() => {
    if (!user || !cciLinks) return [] as string[]
    const link = cciLinks.find(link => link.id === user.uid)
    return link?.cci_id ?? []
  }, [cciLinks, user])

  const organizedCcis = React.useMemo(() => {
    const list = (ccis ?? []).filter(c => c.status !== 'Inactive')
    const sorted = [...list].sort((a, b) => {
      const cityCompare = (a.city || '').localeCompare(b.city || '')
      if (cityCompare !== 0) return cityCompare
      return (a.name || a.cci_name || '').localeCompare(b.name || b.cci_name || '')
    })
    const userCcis = sorted.filter(c => allocatedIds.includes(c.id))
    const otherCcis = sorted.filter(c => !allocatedIds.includes(c.id))
    return { userCcis, otherCcis }
  }, [ccis, allocatedIds])

  // Institution options for TextSelect
  const institutionOptions = React.useMemo(() => {
    const mapOption = (c: CCIDoc) => ({
      label: c.name || c.cci_name || 'Unnamed CCI',
      value: c.id,
      description: c.city ? `${c.city}` : undefined
    })

    const userOpts = (organizedCcis.userCcis || []).map(mapOption)
    const otherOpts = (organizedCcis.otherCcis || []).map(mapOption)

    return showAllCcis ? [...userOpts, ...otherOpts] : userOpts
  }, [organizedCcis, showAllCcis])

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
    content: '',
    editable: true,
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
    content: '',
    editable: true,
  })

  const handleSave = async () => {
    if (!agendaEditor || !debriefEditor) return

    // Validate CCI selection
    if (!selectedCciId || selectedCciId === '') {
      notify.error('Please select a Child Care Institution before saving')
      return
    }

    const filledByRole = allocatedIds.includes(selectedCciId) ? 'EM' : 'Visitor'

    setIsSaving(true)
    try {
      const agenda = agendaEditor.getHTML()
      const debrief = debriefEditor.getHTML()

      // Check if debrief has content to auto-complete status
      const debriefText = debriefEditor.getText().trim()
      const shouldAutoComplete = debriefText.length > 0

      // Create a new visit
      const newVisitData: CreateData<VisitDoc> = {
        agenda,
        debrief,
        date: selectedDate,
        cci_id: selectedCciId,
        cci_name: selectedCciId && ccis ? (() => {
          const cci = ccis?.find(c => c.id === selectedCciId)
          return cci?.name || cci?.cci_name || ''
        })() : '',
        filledByUid: user?.uid || '',
        filledBy: filledByRole,
        status: shouldAutoComplete ? 'Complete' : 'Scheduled',
        notes: notes.map(note => ({
          ...note,
          createdAt: note.createdAt
        }))
      }

      console.log('CreateVisitForm - Creating new visit with data:', newVisitData)

      // Create the new visit document
      const newId = await addDocument<VisitDoc>('visits', newVisitData)
      
      notify.success('New meeting notes created successfully')
      
      if (onSave) {
        onSave(newId)
      } else {
        // Navigate to the new visit
        navigate(`/meeting-notes/${newId}?mode=view`)
      }
    } catch (error) {
      console.error('Error saving meeting notes:', error)
      notify.error('Failed to save meeting notes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      navigate('/notes')
    }
  }

  // Note management functions
  const handleAddNote = () => {
    if (!noteDraft.trim()) return

    const newNote = {
      id: String(Date.now()),
      text: noteDraft.trim(),
      createdAt: new Date()
    }
    
    setNotes(prev => [...prev, newNote])
    setNoteDraft('')
    setAddingNote(false)
    notify.success('Note added successfully')
  }

  const handleEditNote = (noteId: string, currentText: string) => {
    setEditingNoteId(noteId)
    setEditingNoteText(stripHtmlForPreview(currentText))
  }

  const handleSaveNote = (noteId: string) => {
    if (!editingNoteText.trim()) return

    setNotes(prev => prev.map(note =>
      note.id === noteId ? { ...note, text: editingNoteText.trim() } : note
    ))
    
    setEditingNoteId(null)
    setEditingNoteText('')
    notify.success('Note updated successfully')
  }

  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId))
    notify.success('Note deleted successfully')
  }


  const currentRole = React.useMemo(() => {
    if (!selectedCciId) return null
    return allocatedIds.includes(selectedCciId) ? 'EM' : 'Visitor'
  }, [allocatedIds, selectedCciId])

  return (
    <div className={`bg-background ${className}`}>
      <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header with date and institution selection */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">Visit Date</label>
            <SingleDatePicker
              value={selectedDate}
              onChange={(value) => {
                if (value && typeof value === 'object' && 'from' in value) {
                  // This is a DateRangeValue, but we only want the date
                  return
                }
                if (value && value instanceof Date) {
                  setSelectedDate(value)
                }
              }}
              placeholder="Select visit date"
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">Institution</label>
            <TextSelect
              value={selectedCciId}
              onChange={setSelectedCciId}
              options={institutionOptions}
              placeholder="Select Institution"
              size="md"
              className="w-full"
            />
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="showAllCcis"
                checked={showAllCcis}
                onChange={(e) => setShowAllCcis(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
              />
              <label htmlFor="showAllCcis" className="ml-2 text-sm text-muted-foreground">
                All CCIs
              </label>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mb-6">
          <Button onClick={handleCancel} variant="ghost" size="sm">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} size="sm" disabled={isSaving || !selectedCciId}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Visit'}
          </Button>
        </div>

        {/* Chips row for role and EM name */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-0.5 rounded-full border text-xs flex items-center gap-2">
            {user?.displayName || user?.email || 'EM'}
            {currentRole && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.08em]',
                currentRole === 'EM'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-secondary/20 text-secondary-foreground border border-secondary/40'
              )}>
                {currentRole}
              </span>
            )}
          </span>
        </div>

        {/* Rich Text Editor Toolbar */}
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

        {/* Agenda Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Agenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none min-h-[200px] border rounded-md p-4">
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
            <div className="prose prose-sm max-w-none min-h-[200px] border rounded-md p-4">
              <EditorContent editor={debriefEditor} />
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notes</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingNote(true)}
                className="rounded-full px-4 py-1 border-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notes.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No notes yet. Click "Add Note" to create your first note.
                </div>
              )}
              
              {notes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full h-24 rounded-md border p-3 text-sm resize-none bg-card text-foreground border-border"
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
                      <div className="text-sm text-foreground whitespace-pre-wrap">
                        {stripHtmlForPreview(note.text)}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {format(note.createdAt, 'MMM dd, yyyy HH:mm')}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditNote(note.id, note.text)}
                            className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                            title="Edit note"
                          >
                            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                            title="Delete note"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {addingNote && (
                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                  <div className="space-y-3">
                    <textarea
                      className="w-full h-24 rounded-md border p-3 text-sm resize-none bg-card text-foreground border-border"
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
    </div>
  )
}

export default CreateVisitForm
