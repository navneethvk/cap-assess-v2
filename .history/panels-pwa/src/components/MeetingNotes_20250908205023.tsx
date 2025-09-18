import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Edit, Eye, X, Bold, Italic, List, Link as LinkIcon, Image as ImageIcon, Hash, Quote } from 'lucide-react'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { visitsCollection } from '@/firebase/paths'
import { updateDocument } from '@/firebase/firestoreService'
import { notify } from '@/utils/notify'
import { format } from 'date-fns'
import { isHtmlContent, convertTextToHtml } from '@/utils/htmlUtils'

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

const MeetingNotes: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') as 'view' | 'edit' || 'view'
  
  const [isEditing, setIsEditing] = useState(mode === 'edit')
  const [isSaving, setIsSaving] = useState(false)
  const [visit, setVisit] = useState<VisitDoc | null>(null)
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  // Fetch visit data
  const { data: visits, isLoading, error } = useFirestoreCollection<VisitDoc>(visitsCollection())
  
  useEffect(() => {
    if (visits && visitId) {
      const foundVisit = visits.find(v => v.id === visitId)
      setVisit(foundVisit || null)
    }
  }, [visits, visitId])

  // Initialize editors
  const agendaEditor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
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
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
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

    setIsSaving(true)
    try {
      const agenda = agendaEditor.getHTML()
      const debrief = debriefEditor.getHTML()

      await updateDocument(visitsCollection(), visit.id, {
        agenda,
        debrief
      })

      notify.success('Meeting notes saved successfully')
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving meeting notes:', error)
      notify.error('Failed to save meeting notes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (agendaEditor && debriefEditor && visit) {
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

  const handleView = () => {
    setIsEditing(false)
  }

  const visitDate: Date = visit ? (() => {
    const ts: any = visit.date
    return ts?.toDate ? ts.toDate() : new Date(ts)
  })() : new Date()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <div className="text-center text-muted-foreground">Loading meeting notes...</div>
        </div>
      </div>
    )
  }

  if (error || !visit) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                {error ? `Error loading meeting notes: ${error.message}` : 'Meeting notes not found'}
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
    <div className="min-h-screen bg-background pb-20">
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate(-1)} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{visit.cci_name}</h1>
              <p className="text-muted-foreground">
                {format(visitDate, 'MMMM dd, yyyy')} • {visit.filledBy}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} size="sm" disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button onClick={handleEdit} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Rich Text Editor Toolbar */}
        {isEditing && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">Formatting:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleBold().run()}
                    className={agendaEditor?.isActive('bold') ? 'bg-muted' : ''}
                    title="Bold (Ctrl+B or **text**)"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleItalic().run()}
                    className={agendaEditor?.isActive('italic') ? 'bg-muted' : ''}
                    title="Italic (Ctrl+I or *text*)"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleBulletList().run()}
                    className={agendaEditor?.isActive('bulletList') ? 'bg-muted' : ''}
                    title="Bullet List (use - for bullets)"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={agendaEditor?.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
                    title="Heading (use ## for heading)"
                  >
                    <Hash className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => agendaEditor?.chain().focus().toggleBlockquote().run()}
                    className={agendaEditor?.isActive('blockquote') ? 'bg-muted' : ''}
                    title="Quote (use > for blockquote)"
                  >
                    <Quote className="h-4 w-4" />
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
                    className={agendaEditor?.isActive('link') ? 'bg-muted' : ''}
                    title="Link ([text](url))"
                  >
                    <LinkIcon className="h-4 w-4" />
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
                    title="Image (![alt](url))"
                  >
                    <ImageIcon className="h-4 w-4" />
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
            <CardTitle className="text-lg">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`prose prose-sm max-w-none ${isEditing ? 'min-h-[200px] border rounded-md p-4' : ''}`}>
              <EditorContent editor={notesEditor} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MeetingNotes
