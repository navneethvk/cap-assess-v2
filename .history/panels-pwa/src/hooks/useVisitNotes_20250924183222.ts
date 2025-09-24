import { useState, useCallback } from 'react'
import { updateDocument } from '@/firebase/firestoreService'
import { visitsCollection } from '@/firebase/paths'
import { notify } from '@/utils/notify'
import type { VisitDoc } from '@/types/firestore'

export interface VisitNote {
  id: string
  text: string
  createdAt: Date
}

export const useVisitNotes = (visit: VisitDoc | null) => {
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  // Add a new note
  const addNote = useCallback(async (text: string) => {
    if (!visit || !text.trim()) return

    try {
      const newNote = {
        id: Date.now().toString(),
        text: text.trim(),
        createdAt: new Date()
      }

      const updatedNotes = [...(visit.notes || []), newNote]
      await updateDocument(visitsCollection(), visit.id, { notes: updatedNotes })
      
      setNoteDraft('')
      setIsAddingNote(false)
      notify.success('Note added successfully')
    } catch (error) {
      console.error('Failed to add note:', error)
      notify.error('Failed to add note')
    }
  }, [visit])

  // Update an existing note
  const updateNote = useCallback(async (noteId: string, text: string) => {
    if (!visit || !text.trim()) return

    try {
      const updatedNotes = (visit.notes || []).map(note =>
        note.id === noteId ? { ...note, text: text.trim() } : note
      )
      
      await updateDocument(visitsCollection(), visit.id, { notes: updatedNotes })
      
      setEditingNoteId(null)
      setEditingNoteText('')
      notify.success('Note updated successfully')
    } catch (error) {
      console.error('Failed to update note:', error)
      notify.error('Failed to update note')
    }
  }, [visit])

  // Delete a note
  const deleteNote = useCallback(async (noteId: string) => {
    if (!visit) return

    try {
      const updatedNotes = (visit.notes || []).filter(note => note.id !== noteId)
      await updateDocument(visitsCollection(), visit.id, { notes: updatedNotes })
      
      notify.success('Note deleted successfully')
    } catch (error) {
      console.error('Failed to delete note:', error)
      notify.error('Failed to delete note')
    }
  }, [visit])

  // Start editing a note
  const startEditingNote = useCallback((noteId: string, currentText: string) => {
    setEditingNoteId(noteId)
    setEditingNoteText(currentText)
  }, [])

  // Cancel editing a note
  const cancelEditingNote = useCallback(() => {
    setEditingNoteId(null)
    setEditingNoteText('')
  }, [])

  // Start adding a new note
  const startAddingNote = useCallback(() => {
    setIsAddingNote(true)
    setNoteDraft('')
  }, [])

  // Cancel adding a new note
  const cancelAddingNote = useCallback(() => {
    setIsAddingNote(false)
    setNoteDraft('')
  }, [])

  return {
    // State
    isAddingNote,
    noteDraft,
    editingNoteId,
    editingNoteText,
    
    // Actions
    addNote,
    updateNote,
    deleteNote,
    startEditingNote,
    cancelEditingNote,
    startAddingNote,
    cancelAddingNote,
    
    // Setters for controlled inputs
    setNoteDraft,
    setEditingNoteText,
    
    // Computed
    notes: visit?.notes || []
  }
}
